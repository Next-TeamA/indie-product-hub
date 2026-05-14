"""Agent API -- skill-based autonomous project analysis and task execution."""

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel

from app.api.dependencies.auth import get_current_user
from app.api.dependencies.project_access import verify_project_access
from app.core.rate_limit import limiter
from app.agents.core import build_agent_context, run_agent

router = APIRouter(prefix="/projects/{project_id}/agent", tags=["agent"])


class AgentRequest(BaseModel):
    task: str


class AgentResponse(BaseModel):
    answer: str
    tool_calls: list[dict]
    iterations: int
    skills_used: list[str]
    error: str | None = None


@router.post("/run")
@limiter.limit("20/hour")
async def run_agent_endpoint(
    request: Request,
    project_id: str,
    body: AgentRequest,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
) -> AgentResponse:
    """Run the LaunchPad agent for a project.

    The agent automatically selects relevant skills based on your task,
    loads project knowledge, and iterates until it has a complete answer.

    Skills are loaded from the project's workspace (Supabase Storage).
    Use load_additional_skill tool if the agent needs more context mid-run.
    """
    context = await build_agent_context(project_id, user["id"])
    result = await run_agent(context=context, task=body.task)

    return AgentResponse(
        answer=result.answer,
        tool_calls=result.tool_calls,
        iterations=result.iterations,
        skills_used=[s.name for s in context.loaded_skills],
        error=result.error,
    )
