"""Whisper 자막 생성 -- word-level timestamps -> SRT.

기획서 §7.4.

흐름:
- openai_api.transcribe_audio(verbose_json, word granularity) -> words[]
- words_to_srt(): 2-3 단어씩 묶어 Shorts용 짧은 자막 chunk
- 한국어 보정: Whisper가 띄어쓰기 없이 길게 출력할 때 14-16자 강제 wrap
  (조사 단위 분할 시도 -- 은/는/이/가/을/를/에/도 뒤에서 끊기).

자막은 burn-in 전제(§7.5) -- 여기서는 SRT 문자열만 생성한다.
"""

import re

from app.integrations import openai_api

# 한국어 조사 -- 이 글자들 뒤에서 끊으면 자연스러운 wrap 지점이 된다.
_KO_PARTICLES = ("은", "는", "이", "가", "을", "를", "에", "도", "와", "과", "의", "로", "고")
_HANGUL_RE = re.compile(r"[가-힣]")


def _fmt(s: float) -> str:
    """seconds(float) -> SRT timestamp 'HH:MM:SS,mmm'."""
    if s < 0:
        s = 0.0
    h, rem = divmod(int(s), 3600)
    m, sec = divmod(rem, 60)
    ms = int(round((s - int(s)) * 1000))
    if ms >= 1000:  # 반올림 경계 보정
        sec += 1
        ms = 0
    return f"{h:02d}:{m:02d}:{sec:02d},{ms:03d}"


def _is_korean(text: str) -> bool:
    return bool(_HANGUL_RE.search(text))


def _char_wrap_korean(text: str, max_chars: int = 16) -> list[str]:
    """한국어: 공백에 의존하지 않고 글자 수 기준으로 강제 wrap.

    가능하면 조사 뒤에서 끊고, 아니면 max_chars 에서 자른다.
    """
    text = text.strip()
    lines: list[str] = []
    while len(text) > max_chars:
        # max_chars 안에서 마지막 조사 위치 탐색 (자연스러운 끊김 지점)
        cut = -1
        for i in range(min(max_chars, len(text) - 1), 0, -1):
            if text[i] in _KO_PARTICLES:
                cut = i + 1
                break
        if cut <= 0:
            cut = max_chars
        lines.append(text[:cut].strip())
        text = text[cut:].strip()
    if text:
        lines.append(text)
    return [ln for ln in lines if ln]


def words_to_srt(words: list[dict], max_chars: int = 14) -> str:
    """word timestamp 리스트 -> SRT 문자열.

    각 word 는 {word|text, start, end} 형태(Whisper verbose_json).
    영어/공백 언어: 2-3 단어씩 묶어 max_chars 넘으면 끊는다.
    한국어: chunk 묶은 뒤 글자 수 기준으로 한 번 더 wrap.
    """
    if not words:
        return ""

    def _w(item: dict) -> str:
        return (item.get("word") or item.get("text") or "").strip()

    chunks: list[tuple[float, float, str]] = []
    current: list[str] = []
    current_start: float | None = None
    last_end: float = 0.0

    for item in words:
        token = _w(item)
        if not token:
            continue
        start = float(item.get("start", last_end))
        end = float(item.get("end", start))
        last_end = end

        if current_start is None:
            current_start = start

        candidate = " ".join(current + [token]).strip()
        # 한국어는 공백 없이 붙는 경우가 많아 join 결과가 길어질 수 있음 -> 글자 수로 판단
        if len(candidate) > max_chars and current:
            chunks.append((current_start, start, " ".join(current).strip()))
            current = [token]
            current_start = start
        else:
            current.append(token)

    if current and current_start is not None:
        chunks.append((current_start, last_end, " ".join(current).strip()))

    # 한국어 chunk 는 글자 수 기준으로 한 번 더 분할 (시간 균등 배분)
    expanded: list[tuple[float, float, str]] = []
    for start, end, text in chunks:
        if _is_korean(text) and len(text) > 16:
            sub_lines = _char_wrap_korean(text, max_chars=16)
            span = max(end - start, 0.0)
            n = len(sub_lines)
            for i, line in enumerate(sub_lines):
                s = start + span * (i / n)
                e = start + span * ((i + 1) / n)
                expanded.append((s, e, line))
        else:
            expanded.append((start, end, text))

    srt_blocks: list[str] = []
    for i, (start, end, text) in enumerate(expanded, 1):
        if end <= start:
            end = start + 0.5  # 0-length 자막 방지
        srt_blocks.append(f"{i}\n{_fmt(start)} --> {_fmt(end)}\n{text}\n")
    return "\n".join(srt_blocks)


async def generate_captions(audio_path: str, language: str | None = None) -> str:
    """오디오 파일 -> SRT 문자열.

    `language`: 'ko' / 'en' 등 ISO-639-1. None = auto-detect.
    한국어가 명확하면 language='ko' 를 넘기면 인식 정확도가 올라간다.
    """
    result = await openai_api.transcribe_audio(
        audio_path,
        response_format="verbose_json",
        language=language,
    )
    words = result.get("words") or []
    # verbose_json 이지만 word 가 비면 segments fallback
    if not words and result.get("segments"):
        words = [
            {"word": seg.get("text", ""), "start": seg.get("start", 0), "end": seg.get("end", 0)}
            for seg in result["segments"]
        ]
    return words_to_srt(words, max_chars=14)
