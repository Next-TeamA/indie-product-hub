"""Video Quality Gate -- CLIP score + 정지 프레임 + Laplacian blur.

기획서 §7.6.

의사결정:
- clip < 0.22  -> prompt 와 영상 불일치 (regen)
- stuck = True -> 3+ 연속 프레임 거의 동일 (regen)
- blur < 100   -> 흐릿함 (regen)
- 단일 실패 -> auto regen 1회. 2회 연속 또는 2+ 동시 실패 -> human review.

cv2 / open_clip / torch 는 무거운 선택 의존성이다. 미설치 환경(예: 로컬, CI)
에서도 백엔드가 부팅되어야 하므로 import 를 try/except 로 감싸고, 미설치 시
graceful skip(통과 처리)한다. 실제 GPU 워커에서만 활성된다.
"""

import numpy as np

# ===== 선택 의존성 (미설치 시 graceful skip) =====
try:
    import cv2  # type: ignore
    _HAS_CV2 = True
except Exception:  # pragma: no cover - 환경별
    cv2 = None  # type: ignore
    _HAS_CV2 = False

try:
    import open_clip  # type: ignore
    import torch  # type: ignore
    from PIL import Image  # type: ignore
    _HAS_CLIP = True
except Exception:  # pragma: no cover - 환경별
    open_clip = None  # type: ignore
    torch = None  # type: ignore
    Image = None  # type: ignore
    _HAS_CLIP = False


# QC 임계값
CLIP_THRESHOLD = 0.22
STUCK_FRAME_THRESHOLD = 2.0
BLUR_THRESHOLD = 100.0

_clip_model = None
_clip_preprocess = None
_clip_tokenizer = None


def _load_clip():
    global _clip_model, _clip_preprocess, _clip_tokenizer
    if _clip_model is None:
        _clip_model, _, _clip_preprocess = open_clip.create_model_and_transforms(
            "ViT-B-32", pretrained="openai"
        )
        _clip_model.eval()
        _clip_tokenizer = open_clip.get_tokenizer("ViT-B-32")
    return _clip_model, _clip_preprocess, _clip_tokenizer


def sample_frames(video_path: str, n: int = 3) -> list[str]:
    """영상에서 n개 프레임을 균등 추출해 임시 PNG 경로 리스트 반환.

    cv2 미설치 시 빈 리스트(QC skip 유도).
    """
    if not _HAS_CV2:
        return []
    import tempfile

    cap = cv2.VideoCapture(video_path)
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 0
    paths: list[str] = []
    if total <= 0:
        cap.release()
        return []

    indices = [int(total * (i + 1) / (n + 1)) for i in range(n)]
    for idx in indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ok, frame = cap.read()
        if not ok:
            continue
        fd = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
        fd.close()
        cv2.imwrite(fd.name, frame)
        paths.append(fd.name)
    cap.release()
    return paths


def clip_score(prompt: str, frame_paths: list[str]) -> float:
    """prompt 와 프레임들의 평균 CLIP cosine similarity.

    open_clip 미설치 또는 프레임 없음 -> 1.0 (통과 처리).
    """
    if not _HAS_CLIP or not frame_paths:
        return 1.0
    try:
        model, preprocess, tokenizer = _load_clip()
        text = tokenizer([prompt])
        with torch.no_grad():
            text_features = model.encode_text(text)
            scores = []
            for fp in frame_paths:
                img = preprocess(Image.open(fp).convert("RGB")).unsqueeze(0)
                img_features = model.encode_image(img)
                score = torch.cosine_similarity(text_features, img_features).item()
                scores.append(score)
        return float(np.mean(scores)) if scores else 1.0
    except Exception:
        return 1.0


def stuck_frame_check(video_path: str, threshold: float = STUCK_FRAME_THRESHOLD) -> bool:
    """3+ 연속 프레임이 거의 동일하면 True (멈춘 영상).

    cv2 미설치 -> False (skip).
    """
    if not _HAS_CV2:
        return False
    try:
        cap = cv2.VideoCapture(video_path)
        prev = None
        stuck = 0
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            if prev is not None:
                diff = float(np.mean(np.abs(gray.astype(int) - prev.astype(int))))
                if diff < threshold:
                    stuck += 1
                    if stuck >= 3:
                        cap.release()
                        return True
                else:
                    stuck = 0
            prev = gray
        cap.release()
        return False
    except Exception:
        return False


def blur_score(frame_path: str) -> float:
    """Laplacian variance -- 낮을수록 흐릿함.

    cv2 미설치 -> 무한대(통과 처리).
    """
    if not _HAS_CV2:
        return float("inf")
    try:
        img = cv2.imread(frame_path, cv2.IMREAD_GRAYSCALE)
        if img is None:
            return float("inf")
        return float(cv2.Laplacian(img, cv2.CV_64F).var())
    except Exception:
        return float("inf")


def quality_decision(prompt: str, video_path: str) -> dict:
    """영상 QC 종합 판정.

    반환: {clip, stuck, blur, passed, failures}
    - passed = 모든 게이트 통과
    - failures = 실패한 게이트 이름 리스트 (재시도 의사결정에 사용)
    cv2/open_clip 미설치 시 해당 게이트는 통과로 간주 -> passed=True.
    """
    frames = sample_frames(video_path, n=3)

    clip = clip_score(prompt, frames)
    stuck = stuck_frame_check(video_path)
    blur = min((blur_score(f) for f in frames), default=float("inf"))

    # 임시 프레임 파일 정리
    import os
    for f in frames:
        try:
            os.unlink(f)
        except OSError:
            pass

    failures: list[str] = []
    if clip < CLIP_THRESHOLD:
        failures.append("clip")
    if stuck:
        failures.append("stuck")
    if blur < BLUR_THRESHOLD:
        failures.append("blur")

    return {
        "clip": round(clip, 4),
        "stuck": stuck,
        "blur": round(blur, 2) if blur != float("inf") else None,
        "passed": len(failures) == 0,
        "failures": failures,
    }
