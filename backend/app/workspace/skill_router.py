"""Skill router -- selects relevant skills for a given task.

Two-phase selection:
1. Keyword/trigger matching (free, instant)
2. If ambiguous, falls back to picking the best match by description similarity
"""

from __future__ import annotations

from app.workspace.skill_loader import SkillFile, parse_skill, load_default_skills
from app.workspace.storage import workspace_storage


# In-memory skill index: project_id -> list of SkillFile (metadata only, no body)
_skill_cache: dict[str, list[SkillFile]] = {}
_default_skills: list[SkillFile] | None = None


def _get_default_skills() -> list[SkillFile]:
    global _default_skills
    if _default_skills is None:
        _default_skills = load_default_skills()
    return _default_skills


async def get_available_skills(project_id: str) -> list[SkillFile]:
    """Get all skill files for a project. Uses workspace if available, falls back to defaults."""
    if project_id in _skill_cache:
        return _skill_cache[project_id]

    # Try loading from workspace storage
    try:
        skill_files = await workspace_storage.list_files(project_id, "skills")
        if skill_files:
            skills = []
            for fname in skill_files:
                if not fname.endswith(".md"):
                    continue
                raw = await workspace_storage.read_file(project_id, f"skills/{fname}")
                if raw:
                    skill = parse_skill(raw, file_path=f"skills/{fname}")
                    if skill:
                        skills.append(skill)
            if skills:
                _skill_cache[project_id] = skills
                return skills
    except Exception:
        pass

    # Fallback: use default skills
    defaults = _get_default_skills()
    _skill_cache[project_id] = defaults
    return defaults


async def select_skills(
    project_id: str,
    task: str,
    max_skills: int = 2,
) -> list[SkillFile]:
    """Select the most relevant skills for a task.

    Phase 1: Keyword matching on triggers.
    Phase 2: If no clear match, pick by description keyword overlap.
    """
    available = await get_available_skills(project_id)
    task_lower = task.lower()

    # Phase 1: Score by trigger keyword matches
    scored: list[tuple[SkillFile, int]] = []
    for skill in available:
        score = 0
        for trigger in skill.triggers:
            if trigger.lower() in task_lower:
                score += 10
        # Bonus: description word overlap
        desc_words = skill.description.lower().split()
        for word in desc_words:
            if len(word) > 3 and word in task_lower:
                score += 1
        scored.append((skill, score))

    # Sort by score descending
    scored.sort(key=lambda x: x[1], reverse=True)

    # Take top skills with score > 0
    selected = [s for s, score in scored if score > 0][:max_skills]

    # If nothing matched, pick the first default (general purpose)
    if not selected and available:
        selected = [available[0]]

    return selected


def clear_cache(project_id: str | None = None):
    """Clear skill cache. Called after workspace updates."""
    if project_id:
        _skill_cache.pop(project_id, None)
    else:
        _skill_cache.clear()
