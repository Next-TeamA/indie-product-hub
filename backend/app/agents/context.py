"""Agent context -- shared data structures used by core and tools."""

from dataclasses import dataclass, field


@dataclass
class AgentContext:
    project_id: str
    user_id: str
    project: dict
    knowledge: dict[str, str]          # category -> content
    tokens: dict[str, str]             # provider -> decrypted token
    max_iterations: int = 10


@dataclass
class AgentResult:
    answer: str
    tool_calls: list[dict] = field(default_factory=list)
    iterations: int = 0
    error: str | None = None
