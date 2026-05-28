"""LangGraph State definition for AMP (Autonomous Marketing Platform).

기획서 §3.1 + §부록 D (Context Engineering).

State 설계 원칙:
- 모든 노드가 변형하는 field는 reducer 강제 (`Annotated[..., add]`)
- 각 노드는 필요한 field만 반환 (LangGraph가 merge)
- thread_id 패턴: `{project_id}:{graph_name}:{event_id}`
"""

from operator import add
from typing import Annotated, Literal, TypedDict

from langgraph.graph.message import add_messages


class AMPState(TypedDict, total=False):
    """공유 state. total=False = 모든 필드 optional (노드별 부분 업데이트)."""

    # ===== Identity =====
    project_id: str
    user_id: str
    trigger: dict           # {type, source_id, payload}

    # ===== Context (immutable, 노드 시작 시 build_agent_context로 채움) =====
    context: dict           # {project, knowledge, tokens, persona, voice_samples, brand}

    # ===== Strategy node output =====
    strategy: dict | None   # {should_publish, channels, format, urgency, ...}

    # ===== Content node output (multi-variant) =====
    drafts: list[dict]      # [{channel, hook, content, hashtags, voice_match_score, lang}]

    # ===== AssetGen node output =====
    assets: list[dict]      # [{type, url, asset_id, cost_usd}]

    # ===== RiskGuard node output =====
    risk: dict | None       # {approved, blocking_reasons, warnings, score}

    # ===== HITL =====
    approval_status: Literal["pending", "approved", "rejected"] | None
    requires_approval: bool
    approval_id: str | None

    # ===== Publish node output =====
    publish_results: Annotated[list[dict], add]   # [{channel, external_id, status, ...}]

    # ===== Performance =====
    performance_schedule: list[str]   # ['+1h', '+6h', ...]

    # ===== Cross-cutting (reducers required) =====
    messages: Annotated[list, add_messages]
    tool_audit: Annotated[list[dict], add]
    cost_usd: Annotated[float, add]
    tier_used: dict[str, str]    # node_name -> model_id

    # ===== Control flow =====
    current_node: str
    iteration: int
    error: str | None
    no_progress_count: int   # 3 이상 → abort


def build_thread_id(project_id: str, graph_name: str, event_id: str) -> str:
    """Standard thread_id format. Prevents concurrent collision."""
    return f"{project_id}:{graph_name}:{event_id}"
