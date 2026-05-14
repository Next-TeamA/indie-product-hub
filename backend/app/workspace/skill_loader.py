"""Skill file parser -- reads markdown with YAML frontmatter."""

from __future__ import annotations

import re
import json
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class SkillFile:
    name: str
    description: str
    triggers: list[str]
    tools_needed: list[str]
    max_iterations: int
    output_format: str
    content: str           # full markdown body (rules + examples)
    file_path: str = ""    # storage path for reference


def parse_skill(raw: str, file_path: str = "") -> SkillFile | None:
    """Parse a skill markdown file with YAML-like frontmatter.

    Format:
    ---
    name: ...
    description: ...
    triggers: ["a", "b"]
    tools_needed: ["tool1"]
    max_iterations: 5
    output_format: json
    ---

    ## Body content here
    """
    # Split frontmatter and body
    match = re.match(r"^---\s*\n(.*?)\n---\s*\n(.*)", raw, re.DOTALL)
    if not match:
        return None

    frontmatter_text = match.group(1)
    body = match.group(2).strip()

    # Parse frontmatter (simple YAML-like parsing, no dependency)
    meta: dict = {}
    current_key: str | None = None
    current_list: list[str] = []

    for line in frontmatter_text.strip().split("\n"):
        stripped = line.strip()
        if not stripped:
            continue

        # Check if this is a list item (  - value)
        if stripped.startswith("- ") and current_key:
            current_list.append(stripped[2:].strip())
            continue

        # If we were collecting a list, save it
        if current_key and current_list:
            meta[current_key] = current_list
            current_list = []
            current_key = None

        if ":" not in stripped:
            continue

        key, _, value = stripped.partition(":")
        key = key.strip()
        value = value.strip()

        if not value:
            # Start of a list block
            current_key = key
            current_list = []
        elif value.startswith("["):
            # Inline list like ["a", "b"]
            try:
                meta[key] = json.loads(value.replace("'", '"'))
            except json.JSONDecodeError:
                meta[key] = []
        else:
            try:
                meta[key] = int(value)
            except ValueError:
                meta[key] = value

    # Don't forget the last list
    if current_key and current_list:
        meta[current_key] = current_list

    return SkillFile(
        name=meta.get("name", "Unknown"),
        description=meta.get("description", ""),
        triggers=meta.get("triggers", []),
        tools_needed=meta.get("tools_needed", []),
        max_iterations=meta.get("max_iterations", 10),
        output_format=meta.get("output_format", "text"),
        content=body,
        file_path=file_path,
    )


def load_default_skills() -> list[SkillFile]:
    """Load all default skill files from the default_skills directory."""
    skills_dir = Path(__file__).parent / "default_skills"
    skills = []
    for md_file in sorted(skills_dir.glob("*.md")):
        raw = md_file.read_text(encoding="utf-8")
        skill = parse_skill(raw, file_path=f"skills/{md_file.name}")
        if skill:
            skills.append(skill)
    return skills


# Cache for get_skill_prompt
_skill_prompt_cache: dict[str, str] = {}


def get_skill_prompt(skill_name: str) -> str:
    """Load a specific skill's content (body) by filename for use as system prompt.

    Usage:
        prompt = get_skill_prompt("promotion")  # loads promotion.md
        prompt = get_skill_prompt("deploy_analysis")  # loads deploy_analysis.md
    """
    if skill_name in _skill_prompt_cache:
        return _skill_prompt_cache[skill_name]

    skills_dir = Path(__file__).parent / "default_skills"
    md_file = skills_dir / f"{skill_name}.md"
    if not md_file.exists():
        return ""

    raw = md_file.read_text(encoding="utf-8")
    skill = parse_skill(raw)
    if not skill:
        return ""

    _skill_prompt_cache[skill_name] = skill.content
    return skill.content
