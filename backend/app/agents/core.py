"""LaunchPad Agent Core -- autonomous agent loop with Gemini function calling.

Architecture:
  build_agent_context() -> loads project + knowledge + tokens
  run_agent() -> plan -> tool call -> observe -> iterate or done
"""

from __future__ import annotations

import json
from typing import Any

from google import genai
from google.genai import types

from app.core.config import settings
from app.core.encryption import decrypt_token
from app.core.supabase import supabase
from app.agents.context import AgentContext, AgentResult


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
    project_row = (
        supabase.table("projects")
        .select("*")
        .eq("id", project_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    project = project_row.data or {}

    # Knowledge base
    kb_rows = (
        supabase.table("project_knowledge")
        .select("category, content")
        .eq("project_id", project_id)
        .execute()
    )
    knowledge = {r["category"]: r["content"] for r in (kb_rows.data or [])}

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
        max_iterations=max_iterations,
    )


# ---------------------------------------------------------------------------
# Agent loop
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
    tool_declarations: list[dict],
    tool_handlers: dict[str, ToolDef],
    system_prompt: str,
) -> AgentResult:
    """Execute the agent loop: plan -> tool call -> observe -> iterate."""
    client = _get_client()
    audit_log: list[dict] = []
    iteration = 0

    # Build initial contents
    contents: list[types.Content] = [
        types.Content(role="user", parts=[types.Part.from_text(text=task)]),
    ]

    # Config with tools
    config = types.GenerateContentConfig(
        system_instruction=system_prompt,
        tools=[types.Tool(function_declarations=tool_declarations)] if tool_declarations else None,
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
                answer="",
                tool_calls=audit_log,
                iterations=iteration,
                error=f"Gemini API error: {str(e)}",
            )

        if not response.candidates:
            return AgentResult(
                answer="No response from model.",
                tool_calls=audit_log,
                iterations=iteration,
            )

        candidate = response.candidates[0]
        model_content = candidate.content

        # Check for function calls
        function_calls = [
            p for p in (model_content.parts or [])
            if p.function_call is not None
        ]

        if not function_calls:
            # No tool calls -> agent is done, extract text
            text_parts = [p.text for p in (model_content.parts or []) if p.text]
            answer = "\n".join(text_parts) if text_parts else "No answer generated."
            return AgentResult(
                answer=answer,
                tool_calls=audit_log,
                iterations=iteration,
            )

        # Execute tool calls
        contents.append(model_content)
        function_responses = []

        for fc in function_calls:
            tool_name = fc.function_call.name
            tool_args = dict(fc.function_call.args) if fc.function_call.args else {}

            # Log
            audit_log.append({
                "iteration": iteration,
                "tool": tool_name,
                "args": tool_args,
            })

            # Execute
            tool_def = tool_handlers.get(tool_name)
            if not tool_def:
                result = {"error": f"Unknown tool: {tool_name}"}
            else:
                try:
                    result = await tool_def.handler(context, **tool_args)
                except Exception as e:
                    result = {"error": f"{tool_name} failed: {str(e)}"}

            # Truncate large results to save tokens
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

    # Max iterations reached
    return AgentResult(
        answer="Maximum iterations reached. Partial analysis may be incomplete.",
        tool_calls=audit_log,
        iterations=iteration,
    )
