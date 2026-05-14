"""LaunchPad Agent Core -- skill-based autonomous agent loop.

Architecture:
  1. build_agent_context() -> loads project + knowledge + tokens
  2. select skills based on task
  3. compose system prompt from workspace README + selected skills
  4. run Gemini function calling loop with skill-specific tools
  5. agent can load additional skills mid-loop via tool
"""

from __future__ import annotations

import json
from typing import Any

from google import genai
from google.genai import types

from app.core.config import settings
from app.core.encryption import decrypt_token
from app.core.supabase import supabase, safe_maybe_single
from app.agents.context import AgentContext, AgentResult
from app.workspace.storage import workspace_storage
from app.workspace.skill_router import select_skills, get_available_skills
from app.workspace.skill_loader import SkillFile
from app.agents.tools.registry import get_tools_for_domains, get_all_tools, ToolDef, register_tool


# ---------------------------------------------------------------------------
# Base system prompt (minimal -- skills provide the rest)
# ---------------------------------------------------------------------------

BASE_PROMPT = """You are LaunchPad Agent, an autonomous AI assistant for indie product builders.
You have been loaded with specific skills for this task. Follow the rules and patterns defined in the loaded skills.

## General Rules
- Be specific. Quote numbers, dates, commit SHAs, post IDs, metric values.
- If a tool returns an error, say so clearly and suggest what the user should do.
- Never fabricate data. If you don't have enough info, say what's missing.
- Never use emojis in your responses.
- Write in the same language as the user's question (Korean if Korean, English if English).
- Prefer stored data (knowledge tools) over live API calls when possible.
- If you need a skill that isn't loaded, call the load_additional_skill tool.

## How You Work
1. Read the project context and loaded skills below
2. Plan which tools you need
3. Call tools to gather data
4. Evaluate: is the data sufficient?
5. If not, call more tools or load more skills
6. Give your final answer following the skill's output format
"""


# ---------------------------------------------------------------------------
# Context builder
# ---------------------------------------------------------------------------

async def build_agent_context(
    project_id: str,
    user_id: str,
    max_iterations: int = 10,
) -> AgentContext:
    """Load everything the agent needs to reason about a project."""
    # Project data
    project = safe_maybe_single(
        supabase.table("projects")
        .select("*")
        .eq("id", project_id)
        .eq("user_id", user_id)
    ) or {}

    # Knowledge base from DB cache
    kb_rows = (
        supabase.table("project_knowledge")
        .select("category, content")
        .eq("project_id", project_id)
        .execute()
    )
    knowledge = {r["category"]: r["content"] for r in (kb_rows.data or [])}

    # Try loading README from workspace storage
    workspace_readme = await workspace_storage.read_file(project_id, "README.md")
    if not workspace_readme:
        workspace_readme = knowledge.get("project_readme", "")

    # Decrypt all connected tokens
    accounts = (
        supabase.table("connected_accounts")
        .select("provider, access_token")
        .eq("user_id", user_id)
        .eq("is_active", True)
        .execute()
    )
    tokens: dict[str, str] = {}
    for acc in accounts.data or []:
        try:
            tokens[acc["provider"]] = decrypt_token(acc["access_token"])
        except Exception:
            continue

    return AgentContext(
        project_id=project_id,
        user_id=user_id,
        project=project,
        knowledge=knowledge,
        tokens=tokens,
        workspace_readme=workspace_readme,
        max_iterations=max_iterations,
    )


# ---------------------------------------------------------------------------
# Skill-aware agent loop
# ---------------------------------------------------------------------------

_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


async def run_agent(
    context: AgentContext,
    task: str,
    skills: list[SkillFile] | None = None,
    extra_tool_declarations: list[dict] | None = None,
    extra_tool_handlers: dict[str, ToolDef] | None = None,
) -> AgentResult:
    """Execute the skill-based agent loop.

    If skills are not provided, auto-selects based on task.
    """
    client = _get_client()
    audit_log: list[dict] = []
    iteration = 0

    # Auto-select skills if not provided
    if skills is None:
        skills = await select_skills(context.project_id, task, max_skills=2)
    context.loaded_skills = skills

    # Determine max iterations from skill (use most specific)
    if skills:
        context.max_iterations = min(context.max_iterations, max(s.max_iterations for s in skills))

    # Compose system prompt: base + README + skills
    skill_sections = []
    for skill in skills:
        skill_sections.append(f"\n## Loaded Skill: {skill.name}\n{skill.content}")

    system_prompt = f"""{BASE_PROMPT}

## Project Context
{context.workspace_readme or 'No workspace README available.'}

{''.join(skill_sections)}
"""

    # Collect tools from skills + always include knowledge + internal tools
    needed_domains = {"knowledge", "internal"}
    for skill in skills:
        for tool_name in skill.tools_needed:
            # Infer domain from tool name prefix
            if tool_name.startswith("github"):
                needed_domains.add("github")
            elif tool_name.startswith("deploy"):
                needed_domains.add("deploy")
            elif tool_name.startswith("sns"):
                needed_domains.add("sns")
            elif tool_name.startswith("market"):
                needed_domains.add("market")

    declarations, handlers = get_tools_for_domains(list(needed_domains))

    # Add load_additional_skill tool
    _register_load_skill_tool(context)
    extra_decl, extra_handlers = get_tools_for_domains(["meta"])
    declarations.extend(extra_decl)
    handlers.update(extra_handlers)

    # Add any extra tools passed by caller
    if extra_tool_declarations:
        declarations.extend(extra_tool_declarations)
    if extra_tool_handlers:
        handlers.update(extra_tool_handlers)

    # Build initial contents
    contents: list[types.Content] = [
        types.Content(role="user", parts=[types.Part.from_text(text=task)]),
    ]

    config = types.GenerateContentConfig(
        system_instruction=system_prompt,
        tools=[types.Tool(function_declarations=declarations)] if declarations else None,
    )

    while iteration < context.max_iterations:
        iteration += 1

        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=contents,
                config=config,
            )
        except Exception as e:
            return AgentResult(
                answer="", tool_calls=audit_log, iterations=iteration,
                error=f"Gemini API error: {str(e)}",
            )

        if not response.candidates:
            return AgentResult(
                answer="No response from model.",
                tool_calls=audit_log, iterations=iteration,
            )

        candidate = response.candidates[0]
        model_content = candidate.content

        function_calls = [
            p for p in (model_content.parts or [])
            if p.function_call is not None
        ]

        if not function_calls:
            text_parts = [p.text for p in (model_content.parts or []) if p.text]
            answer = "\n".join(text_parts) if text_parts else "No answer generated."
            return AgentResult(
                answer=answer, tool_calls=audit_log, iterations=iteration,
            )

        contents.append(model_content)
        function_responses = []

        for fc in function_calls:
            tool_name = fc.function_call.name
            tool_args = dict(fc.function_call.args) if fc.function_call.args else {}

            audit_log.append({"iteration": iteration, "tool": tool_name, "args": tool_args})

            tool_def = handlers.get(tool_name)
            if not tool_def:
                result = {"error": f"Unknown tool: {tool_name}"}
            else:
                try:
                    result = await tool_def.handler(context, **tool_args)
                except Exception as e:
                    result = {"error": f"{tool_name} failed: {str(e)}"}

            result_str = json.dumps(result, ensure_ascii=False, default=str)
            if len(result_str) > 4000:
                result_str = result_str[:4000] + "... (truncated)"
                result = {"truncated_result": result_str}

            function_responses.append(
                types.Part.from_function_response(
                    name=tool_name,
                    response={"result": result},
                )
            )

        contents.append(types.Content(role="user", parts=function_responses))

    return AgentResult(
        answer="Maximum iterations reached. Partial analysis may be incomplete.",
        tool_calls=audit_log, iterations=iteration,
    )


# ---------------------------------------------------------------------------
# Meta tool: load additional skill mid-loop
# ---------------------------------------------------------------------------

def _register_load_skill_tool(context: AgentContext):
    """Register the load_additional_skill tool that lets the agent load more skills."""

    async def _load_additional_skill(ctx: AgentContext, skill_name: str = "") -> dict:
        """Load an additional skill file into the agent's context."""
        available = await get_available_skills(ctx.project_id)
        if not skill_name:
            return {"available_skills": [{"name": s.name, "description": s.description} for s in available]}

        for skill in available:
            if skill.name.lower() == skill_name.lower() or skill.file_path.replace("skills/", "").replace(".md", "") == skill_name.lower():
                ctx.loaded_skills.append(skill)
                return {"loaded": skill.name, "content_preview": skill.content[:500]}

        return {"error": f"Skill '{skill_name}' not found", "available": [s.name for s in available]}

    register_tool(
        "load_additional_skill",
        "Load an additional skill file for more specialized knowledge. Call with no args to see available skills.",
        {"skill_name": {"type": "string", "description": "Name of the skill to load (e.g. 'promotion', 'deploy_analysis')"}},
        _load_additional_skill,
        "meta",
    )
