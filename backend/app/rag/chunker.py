"""Text chunking -- recursive char-based splitter.

기획서 §부록 F.2:
- 일반 문서: recursive semantic 512 tok / 50 overlap (≈ 4 chars/token)
- SNS 포스트: 1 post = 1 chunk (절대 분할 X — 트윗을 쪼개면 voice가 깨짐)
"""

# 토큰 추정: 영어/한국어 혼합 평균 ~4 chars/token
_CHARS_PER_TOKEN = 4

# 큰 단위부터 작은 단위로 시도하는 분리자 (recursive)
_SEPARATORS = ["\n\n", "\n", ". ", ".", " ", ""]


def chunk_text(text: str, max_tokens: int = 512, overlap: int = 50) -> list[str]:
    """Split text into overlapping chunks.

    Recursive: 문단 → 줄 → 문장 → 단어 → 글자 순으로 가장 큰 경계에서 자른다.
    max_tokens / overlap은 토큰 단위, 내부적으로 4 chars/token으로 환산.
    """
    text = (text or "").strip()
    if not text:
        return []

    max_chars = max(1, max_tokens * _CHARS_PER_TOKEN)
    overlap_chars = max(0, overlap * _CHARS_PER_TOKEN)

    if len(text) <= max_chars:
        return [text]

    pieces = _recursive_split(text, max_chars, _SEPARATORS)
    return _merge_with_overlap(pieces, max_chars, overlap_chars)


def chunk_post(post: str) -> str:
    """SNS 포스트는 통째로 1 chunk. 절대 분할하지 않는다."""
    return (post or "").strip()


def _recursive_split(text: str, max_chars: int, separators: list[str]) -> list[str]:
    """Split text by the largest separator that keeps pieces under max_chars."""
    if len(text) <= max_chars:
        return [text] if text else []

    if not separators:
        # 분리자 소진 → 하드 char 분할
        return [text[i : i + max_chars] for i in range(0, len(text), max_chars)]

    sep, *rest = separators
    if sep == "":
        return [text[i : i + max_chars] for i in range(0, len(text), max_chars)]

    parts = text.split(sep)
    result: list[str] = []
    for part in parts:
        segment = part + sep
        if len(segment) <= max_chars:
            result.append(segment)
        else:
            result.extend(_recursive_split(segment, max_chars, rest))
    return [p for p in result if p.strip()]


def _merge_with_overlap(pieces: list[str], max_chars: int, overlap_chars: int) -> list[str]:
    """Greedily merge small pieces up to max_chars, carrying overlap forward."""
    chunks: list[str] = []
    current = ""
    for piece in pieces:
        if not current:
            current = piece
        elif len(current) + len(piece) <= max_chars:
            current += piece
        else:
            chunks.append(current.strip())
            tail = current[-overlap_chars:] if overlap_chars else ""
            current = tail + piece
    if current.strip():
        chunks.append(current.strip())
    return chunks
