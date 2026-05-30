"""Video pipeline orchestrator -- script -> scenes -> audio -> caption -> compose.

기획서 §7 영상 파이프라인.

흐름:
  plan_scenes()    LLM(video_script tier) 으로 스크립트를 5-6 scene 으로 분할
  generate_video() video_projects row 읽고 scene 별 fal 영상 생성 + narration +
                   caption + ffmpeg compose -> R2 업로드 -> DB + cost_ledger 갱신
  compose_video()  ffmpeg subprocess (xfade + amix + subtitles burn-in, 1080x1920)

설계 메모:
- fal 은 비동기(webhook) 패턴이지만 Celery 워커 안에서는 polling 으로 await 한다
  (webhook 라우트는 별도로 존재하며 외부 트리거 시 scene 을 갱신).
- cv2/open_clip/ffmpeg 는 선택 의존성. QC 게이트는 미설치 시 graceful pass.
- 모든 외부 호출 비용은 cost_ledger 에 적재한다.
- R2 미설정 환경에서는 storage 단계를 graceful skip (로컬 경로만 기록).
"""

import asyncio
import json
import os
import shutil
import subprocess
import tempfile
from datetime import datetime, timezone

import httpx

from app.agents import llm_router
from app.core.config import settings
from app.core.supabase import supabase, safe_maybe_single
from app.integrations import elevenlabs, fal_ai
from app.integrations.fal_ai import MODEL_REGISTRY
from app.services import captioning, video_qc

# fal 폴링 설정
_FAL_POLL_INTERVAL = 5      # 초
_FAL_POLL_TIMEOUT = 600     # scene 당 최대 대기 (10분)
_MAX_SCENE_RETRY = 1        # QC 실패 시 자동 재생성 횟수
_DEFAULT_VOICE_LANG = "ko"


# ============================================================
# Cost ledger
# ============================================================

def _record_cost(
    *,
    project_id: str,
    user_id: str,
    service: str,
    operation: str,
    cost_usd: float,
    units_used: float | None = None,
    related_video_id: str | None = None,
    related_asset_id: str | None = None,
) -> None:
    """cost_ledger 에 1 row 적재. 실패해도 파이프라인을 막지 않는다."""
    try:
        supabase.table("cost_ledger").insert({
            "project_id": project_id,
            "user_id": user_id,
            "service": service,
            "operation": operation,
            "cost_usd": round(cost_usd, 6),
            "units_used": units_used,
            "related_video_id": related_video_id,
            "related_asset_id": related_asset_id,
        }).execute()
    except Exception:
        pass


# ============================================================
# Scene planning (LLM)
# ============================================================

_SCENE_SYSTEM = (
    "You are a short-form video director. Break a script into 5-6 scenes of about "
    "5 seconds each for a 9:16 vertical Shorts/Reels video. For each scene output a "
    "vivid visual `description` (for a text-to-video model), the spoken `dialogue` "
    "(narration for that scene, in the script's language), and `duration` in seconds "
    "(integer, 4-6). Return STRICT JSON: a list of objects with keys "
    "description, dialogue, duration. No prose, no markdown."
)


async def plan_scenes(
    script_prompt: str,
    total_duration: int,
    project_context: dict | None = None,
) -> list[dict]:
    """스크립트를 scene 리스트로 분할. 각 scene = {description, dialogue, duration}."""
    ctx_str = ""
    if project_context:
        ctx_str = (
            f"\nProduct: {project_context.get('name', '')}"
            f"\nAudience: {project_context.get('target_audience', '')}"
            f"\nBrand voice: {project_context.get('brand_voice_traits', '')}"
        )

    user_msg = (
        f"Script idea:\n{script_prompt}\n"
        f"Target total duration: ~{total_duration}s.{ctx_str}\n"
        f"Produce 5-6 scenes summing to roughly {total_duration}s."
    )

    result = await llm_router.call_for_task(
        task_type="video_script",
        system=_SCENE_SYSTEM,
        messages=[{"role": "user", "content": user_msg}],
        response_format="json",
    )

    scenes = _parse_scenes(result, total_duration)
    return scenes


def _parse_scenes(llm_result: dict, total_duration: int) -> list[dict]:
    """LLM 결과(JSON)를 안전하게 scene 리스트로 정규화."""
    raw = llm_result.get("parsed_json")
    if raw is None:
        content = llm_result.get("content", "")
        try:
            raw = json.loads(content)
        except (json.JSONDecodeError, TypeError):
            raw = None

    # {"scenes": [...]} 또는 [...] 둘 다 허용
    if isinstance(raw, dict):
        raw = raw.get("scenes") or raw.get("data") or []
    if not isinstance(raw, list) or not raw:
        # fallback: 단일 scene
        return [{"description": "product showcase", "dialogue": "", "duration": min(total_duration, 5)}]

    scenes: list[dict] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        dur = item.get("duration", 5)
        try:
            dur = max(3, min(10, int(round(float(dur)))))
        except (TypeError, ValueError):
            dur = 5
        scenes.append({
            "description": str(item.get("description", "")).strip(),
            "dialogue": str(item.get("dialogue", "")).strip(),
            "duration": dur,
        })
    return scenes or [{"description": "product showcase", "dialogue": "", "duration": 5}]


# ============================================================
# fal scene generation (submit + poll)
# ============================================================

def _webhook_url() -> str:
    base = settings.backend_url.rstrip("/")
    return f"{base}/api/webhooks/fal"


async def _generate_scene_clip(
    model: str,
    prompt: str,
    duration: int,
    *,
    project_id: str,
    user_id: str,
    video_project_id: str,
    scene_row_id: str,
) -> str | None:
    """단일 scene 영상 생성: submit -> poll -> 로컬 mp4 다운로드 경로 반환.

    fal_request_id 를 scene row 에 기록(webhook correlation 용).
    실패 시 None.
    """
    cfg = MODEL_REGISTRY.get(model, MODEL_REGISTRY["kling-3.0"])
    endpoint = cfg["endpoint"]

    request_id = await fal_ai.submit_video(
        model=model,
        prompt=prompt,
        duration_seconds=duration,
        aspect_ratio="9:16",
        webhook_url=_webhook_url(),
    )

    supabase.table("video_scenes").update({
        "fal_request_id": request_id,
        "status": "generating",
        "generation_started_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", scene_row_id).execute()

    # 비용: 초당 단가 * duration
    _record_cost(
        project_id=project_id,
        user_id=user_id,
        service="fal",
        operation=f"video:{model}",
        cost_usd=cfg.get("cost_per_sec", 0.10) * duration,
        units_used=duration,
        related_video_id=video_project_id,
    )

    # poll until COMPLETED
    waited = 0
    while waited < _FAL_POLL_TIMEOUT:
        status = await fal_ai.get_status(request_id, endpoint)
        state = (status.get("status") or "").upper()
        if state in ("COMPLETED", "OK", "SUCCESS"):
            break
        if state in ("FAILED", "ERROR", "CANCELLED"):
            return None
        await asyncio.sleep(_FAL_POLL_INTERVAL)
        waited += _FAL_POLL_INTERVAL
    else:
        return None  # timeout

    result = await fal_ai.get_result(request_id, endpoint)
    video_url = _extract_video_url(result)
    if not video_url:
        return None
    return await _download_to_temp(video_url, suffix=".mp4")


def _extract_video_url(result: dict) -> str | None:
    """fal result payload 에서 video URL 추출 (모델별 스키마 차이 흡수)."""
    if not isinstance(result, dict):
        return None
    video = result.get("video")
    if isinstance(video, dict) and video.get("url"):
        return video["url"]
    if isinstance(video, str):
        return video
    videos = result.get("videos")
    if isinstance(videos, list) and videos:
        first = videos[0]
        if isinstance(first, dict):
            return first.get("url")
        if isinstance(first, str):
            return first
    return None


async def _download_to_temp(url: str, suffix: str = ".mp4") -> str:
    fd = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
    fd.close()
    async with httpx.AsyncClient(timeout=300) as client:
        async with client.stream("GET", url) as resp:
            resp.raise_for_status()
            with open(fd.name, "wb") as out:
                async for chunk in resp.aiter_bytes():
                    out.write(chunk)
    return fd.name


async def _generate_scene_with_qc(
    model: str,
    scene: dict,
    *,
    project_id: str,
    user_id: str,
    video_project_id: str,
    scene_row_id: str,
) -> tuple[str | None, bool]:
    """scene 생성 + QC. (clip_path, passed) 반환.

    QC 실패 시 최대 _MAX_SCENE_RETRY 회 재생성. 끝까지 실패하면 (path, False).
    """
    prompt = scene["description"]
    duration = scene["duration"]
    attempts = _MAX_SCENE_RETRY + 1
    last_path: str | None = None

    for attempt in range(attempts):
        path = await _generate_scene_clip(
            model, prompt, duration,
            project_id=project_id, user_id=user_id,
            video_project_id=video_project_id, scene_row_id=scene_row_id,
        )
        if not path:
            continue
        last_path = path
        decision = video_qc.quality_decision(prompt, path)
        if decision["passed"]:
            return path, True
        if attempt < attempts - 1:
            supabase.table("video_scenes").update({
                "status": "quality_check",
                "retry_count": attempt + 1,
            }).eq("id", scene_row_id).execute()

    return last_path, False


# ============================================================
# ffmpeg compose
# ============================================================

def _ffmpeg_available() -> bool:
    return shutil.which("ffmpeg") is not None


def compose_video(
    scene_paths: list[str],
    audio_path: str | None,
    srt_path: str | None,
    output_path: str,
    *,
    scene_durations: list[float] | None = None,
    bgm_path: str | None = None,
) -> str:
    """ffmpeg 합성: xfade concat + narration mix + subtitle burn-in.

    1080x1920 H.264 + AAC + faststart. 기획서 §7.5.
    ffmpeg 미설치 시 RuntimeError.
    """
    if not _ffmpeg_available():
        raise RuntimeError("ffmpeg not found on PATH")
    if not scene_paths:
        raise RuntimeError("no scene clips to compose")

    inputs: list[str] = []
    for p in scene_paths:
        inputs += ["-i", p]

    audio_idx = None
    bgm_idx = None
    next_idx = len(scene_paths)
    if audio_path:
        inputs += ["-i", audio_path]
        audio_idx = next_idx
        next_idx += 1
    if bgm_path:
        inputs += ["-i", bgm_path]
        bgm_idx = next_idx
        next_idx += 1

    durations = scene_durations or [5.0] * len(scene_paths)
    xfade_dur = 0.3

    filters: list[str] = []
    # 비디오 xfade 체인
    if len(scene_paths) == 1:
        video_label = "0:v"
    else:
        offset = durations[0] - xfade_dur
        prev = "0:v"
        for i in range(1, len(scene_paths)):
            out = f"v{i:02d}" if i < len(scene_paths) - 1 else "vx"
            filters.append(
                f"[{prev}][{i}:v]xfade=transition=fade:duration={xfade_dur}:offset={offset:.2f}[{out}]"
            )
            prev = out
            offset += durations[i] - xfade_dur
        video_label = prev

    # 오디오 mix
    audio_label = None
    if audio_idx is not None and bgm_idx is not None:
        filters.append(f"[{audio_idx}:a]volume=1.0[a1];[{bgm_idx}:a]volume=0.15[a2];[a1][a2]amix=inputs=2[a]")
        audio_label = "a"
    elif audio_idx is not None:
        filters.append(f"[{audio_idx}:a]volume=1.0[a]")
        audio_label = "a"

    # subtitle burn-in
    final_video = video_label
    if srt_path:
        style = "Fontsize=18,Outline=2,PrimaryColour=&HFFFFFF&,OutlineColour=&H000000&"
        esc = srt_path.replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'")
        filters.append(f"[{video_label}]subtitles={esc}:force_style='{style}'[vo]")
        final_video = "vo"

    cmd = ["ffmpeg", "-y", *inputs]
    if filters:
        cmd += ["-filter_complex", ";".join(filters), "-map", f"[{final_video}]"]
    else:
        cmd += ["-map", f"{final_video}"]
    if audio_label:
        cmd += ["-map", f"[{audio_label}]"]

    cmd += [
        "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
        "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
    ]
    if audio_label:
        cmd += ["-c:a", "aac", "-b:a", "192k"]
    cmd += ["-movflags", "+faststart", output_path]

    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg compose failed: {proc.stderr[-800:]}")
    return output_path


# ============================================================
# Main entry
# ============================================================

def _update_video(video_project_id: str, **fields) -> None:
    supabase.table("video_projects").update(fields).eq("id", video_project_id).execute()


async def generate_video(video_project_id: str) -> dict:
    """video_projects row 1개를 끝까지 생성.

    상태 전이: queued -> generating_scenes -> generating_audio ->
              compositing -> quality_check -> ready / failed / human_review
    반환: {status, asset_url|None, total_cost_usd, scenes_failed}
    """
    row = safe_maybe_single(
        supabase.table("video_projects").select("*").eq("id", video_project_id)
    )
    if not row:
        return {"status": "failed", "error": "video_project not found"}

    project_id = row["project_id"]
    user_id = row["user_id"]
    model = row.get("model") or "kling-3.0"
    script = row.get("script") or {}
    narration_text = row.get("narration_text") or ""

    project = safe_maybe_single(
        supabase.table("projects").select("name, target_audience, brand_voice_traits, primary_languages")
        .eq("id", project_id)
    ) or {}

    # 1) scene plan (script 가 이미 scenes 면 그대로, 아니면 plan_scenes)
    scenes = _resolve_scenes(script, project)
    if not scenes:
        prompt_text = script.get("prompt") if isinstance(script, dict) else str(script)
        total = int(row.get("total_duration_seconds") or 30)
        scenes = await plan_scenes(prompt_text or "product launch teaser", total, project)

    _update_video(video_project_id, status="generating_scenes", progress_percent=10)

    # scene rows 생성 (idempotent: 기존 있으면 재사용)
    scene_rows = _ensure_scene_rows(video_project_id, scenes)

    # 2) scene 별 생성 (순차 -- fal 동시성/비용 통제). webhook 병렬은 별도 경로.
    scene_paths: list[str] = []
    scene_durations: list[float] = []
    failed = 0
    lang = (project.get("primary_languages") or [_DEFAULT_VOICE_LANG])[0]

    for i, (scene, scene_row) in enumerate(zip(scenes, scene_rows)):
        path, passed = await _generate_scene_with_qc(
            model, scene,
            project_id=project_id, user_id=user_id,
            video_project_id=video_project_id, scene_row_id=scene_row["id"],
        )
        if path and passed:
            asset_id = _record_scene_asset(
                project_id, user_id, model, scene, path, video_project_id,
            )
            supabase.table("video_scenes").update({
                "status": "ready", "asset_id": asset_id,
                "generation_completed_at": datetime.now(timezone.utc).isoformat(),
            }).eq("id", scene_row["id"]).execute()
            scene_paths.append(path)
            scene_durations.append(float(scene["duration"]))
        else:
            failed += 1
            supabase.table("video_scenes").update({"status": "failed"}).eq("id", scene_row["id"]).execute()
            if path:  # QC 2회 실패한 클립이라도 합성엔 사용 (전체 실패 방지)
                scene_paths.append(path)
                scene_durations.append(float(scene["duration"]))

        _update_video(video_project_id, progress_percent=10 + int(50 * (i + 1) / len(scenes)))

    if not scene_paths:
        _update_video(video_project_id, status="failed", error_message="all scenes failed")
        return {"status": "failed", "scenes_failed": failed}

    # QC 가 2회 이상 실패한 scene 이 있으면 human review 로 보냄 (합성은 진행)
    needs_review = failed > 0

    # 3) narration (ElevenLabs)
    _update_video(video_project_id, status="generating_audio", progress_percent=65)
    audio_path = None
    narration = narration_text or " ".join(s.get("dialogue", "") for s in scenes).strip()
    if narration:
        audio_path = await _generate_narration(
            narration, lang, project_id=project_id, user_id=user_id,
            video_project_id=video_project_id,
        )

    # 4) captions (Whisper -> SRT)
    srt_path = None
    if audio_path:
        try:
            srt = await captioning.generate_captions(audio_path, language=lang)
            if srt.strip():
                srt_path = _write_temp_text(srt, ".srt")
                _record_cost(
                    project_id=project_id, user_id=user_id, service="openai",
                    operation="whisper:caption", cost_usd=0.003,
                    related_video_id=video_project_id,
                )
        except Exception:
            srt_path = None

    # 5) compose (ffmpeg)
    _update_video(video_project_id, status="compositing", progress_percent=80)
    out_path = tempfile.NamedTemporaryFile(suffix=".mp4", delete=False).name
    try:
        compose_video(
            scene_paths, audio_path, srt_path, out_path,
            scene_durations=scene_durations,
        )
    except Exception as e:
        _update_video(video_project_id, status="failed", error_message=f"compose: {e}")
        return {"status": "failed", "error": str(e)}

    # 6) upload to R2 (graceful skip if unconfigured)
    _update_video(video_project_id, status="quality_check", progress_percent=92)
    storage_url, file_size = _upload_final(project_id, video_project_id, out_path)

    final_asset_id = _record_final_asset(
        project_id, user_id, model, storage_url, out_path, file_size,
        sum(scene_durations), video_project_id,
    )

    total_cost = _sum_video_cost(video_project_id)
    final_status = "human_review" if needs_review else "ready"
    _update_video(
        video_project_id,
        status=final_status,
        progress_percent=100,
        final_asset_id=final_asset_id,
        total_cost_usd=total_cost,
        completed_at=datetime.now(timezone.utc).isoformat(),
    )

    return {
        "status": final_status,
        "asset_url": storage_url,
        "asset_id": final_asset_id,
        "total_cost_usd": total_cost,
        "scenes_failed": failed,
    }


# ============================================================
# Helpers (DB rows, narration, storage)
# ============================================================

def _resolve_scenes(script, project: dict) -> list[dict]:
    """script jsonb 가 이미 scene 리스트를 담고 있으면 정규화해서 반환, 아니면 []."""
    raw = None
    if isinstance(script, dict):
        raw = script.get("scenes")
    elif isinstance(script, list):
        raw = script
    if not isinstance(raw, list) or not raw:
        return []
    scenes = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        try:
            dur = max(3, min(10, int(round(float(item.get("duration", 5))))))
        except (TypeError, ValueError):
            dur = 5
        scenes.append({
            "description": str(item.get("description", "")).strip(),
            "dialogue": str(item.get("dialogue", "")).strip(),
            "duration": dur,
        })
    return scenes


def _ensure_scene_rows(video_project_id: str, scenes: list[dict]) -> list[dict]:
    """video_scenes row 보장. 기존 있으면 재사용, 없으면 insert."""
    existing = (
        supabase.table("video_scenes").select("*")
        .eq("video_project_id", video_project_id)
        .order("scene_index")
        .execute()
    ).data or []
    if len(existing) >= len(scenes):
        return existing[: len(scenes)]

    rows = []
    for idx, scene in enumerate(scenes):
        inserted = supabase.table("video_scenes").insert({
            "video_project_id": video_project_id,
            "scene_index": idx,
            "description": scene["description"] or f"scene {idx}",
            "duration_seconds": scene["duration"],
            "prompt": scene["description"],
            "status": "pending",
        }).execute()
        rows.append(inserted.data[0])
    return rows


async def _generate_narration(
    text: str, lang: str, *, project_id: str, user_id: str, video_project_id: str,
) -> str | None:
    try:
        audio_bytes = await elevenlabs.text_to_speech(text, lang=lang)
    except Exception:
        return None
    path = tempfile.NamedTemporaryFile(suffix=".mp3", delete=False).name
    with open(path, "wb") as f:
        f.write(audio_bytes)
    # 비용: multilingual $0.30/1k, turbo(en) $0.15/1k chars
    rate = 0.15 if lang == "en" else 0.30
    _record_cost(
        project_id=project_id, user_id=user_id, service="elevenlabs",
        operation="tts:narration", cost_usd=len(text) / 1000 * rate,
        units_used=len(text), related_video_id=video_project_id,
    )
    return path


def _write_temp_text(content: str, suffix: str) -> str:
    fd = tempfile.NamedTemporaryFile(suffix=suffix, delete=False, mode="w", encoding="utf-8")
    fd.write(content)
    fd.close()
    return fd.name


def _record_scene_asset(
    project_id: str, user_id: str, model: str, scene: dict, path: str, video_project_id: str,
) -> str | None:
    size = os.path.getsize(path) if os.path.exists(path) else None
    cfg = MODEL_REGISTRY.get(model, {})
    cost = cfg.get("cost_per_sec", 0.10) * scene["duration"]
    try:
        res = supabase.table("media_assets").insert({
            "project_id": project_id,
            "user_id": user_id,
            "asset_type": "video",
            "source": "ai_generated",
            "ai_model": model,
            "prompt": scene["description"],
            "storage_url": path,
            "duration_seconds": scene["duration"],
            "file_size_bytes": size,
            "cost_usd": round(cost, 4),
            "generation_metadata": {"scene": True},
        }).execute()
        return res.data[0]["id"]
    except Exception:
        return None


def _upload_final(project_id: str, video_project_id: str, local_path: str) -> tuple[str, int | None]:
    """R2 업로드. 미설정 시 로컬 경로 그대로 반환."""
    size = os.path.getsize(local_path) if os.path.exists(local_path) else None
    if not (settings.r2_account_id and settings.r2_access_key_id and settings.r2_secret_access_key):
        return local_path, size
    try:
        from app.integrations import cloudflare_r2
        key = f"videos/{project_id}/{video_project_id}.mp4"
        url = cloudflare_r2.upload_file(key, local_path, content_type="video/mp4")
        return url, size
    except Exception:
        return local_path, size


def _record_final_asset(
    project_id: str, user_id: str, model: str, storage_url: str, local_path: str,
    file_size: int | None, duration: float, video_project_id: str,
) -> str | None:
    try:
        res = supabase.table("media_assets").insert({
            "project_id": project_id,
            "user_id": user_id,
            "asset_type": "video",
            "source": "ai_generated",
            "ai_model": model,
            "storage_url": storage_url,
            "duration_seconds": duration,
            "width": 1080,
            "height": 1920,
            "file_size_bytes": file_size,
            "generation_metadata": {"composed": True, "video_project_id": video_project_id},
        }).execute()
        return res.data[0]["id"]
    except Exception:
        return None


def _sum_video_cost(video_project_id: str) -> float:
    try:
        rows = (
            supabase.table("cost_ledger").select("cost_usd")
            .eq("related_video_id", video_project_id)
            .execute()
        ).data or []
        return round(sum(float(r.get("cost_usd", 0)) for r in rows), 4)
    except Exception:
        return 0.0
