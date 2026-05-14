"""Agent context -- shared data structures used by core, tools, and workspace."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.workspace.skill_loader import SkillFile


@dataclass
class AgentContext:
    project_id: str
    user_id: str
    project: dict
    knowledge: dict[str, str]          # category -> content (DB cache)
    tokens: dict[str, str]             # provider -> decrypted token
    workspace_readme: str = ""         # README.md from workspace
    loaded_skills: list = field(default_factory=list)  # SkillFile instances
    max_iterations: int = 10


@dataclass
class AgentResult:
    answer: str
    tool_calls: list[dict] = field(default_factory=list)
    iterations: int = 0
    error: str | None = None
