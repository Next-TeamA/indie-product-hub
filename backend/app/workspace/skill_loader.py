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

    # Parse frontmatter (simple key: value parsing, no YAML dependency)
    meta: dict = {}
    for line in frontmatter_text.strip().split("\n"):
        line = line.strip()
        if not line or ":" not in line:
            continue
        key, _, value = line.partition(":")
        key = key.strip()
        value = value.strip()

        # Handle list values like ["a", "b"]
        if value.startswith("["):
            try:
                # Replace single quotes with double for JSON parsing
                meta[key] = json.loads(value.replace("'", '"'))
            except json.JSONDecodeError:
                meta[key] = []
        else:
            # Handle numeric values
            try:
                meta[key] = int(value)
            except ValueError:
                meta[key] = value

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
