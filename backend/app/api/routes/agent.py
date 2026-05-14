"""Agent API -- autonomous project analysis and task execution."""

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel

from app.api.dependencies.auth import get_current_user
from app.api.dependencies.project_access import verify_project_access
from app.core.rate_limit import limiter
from app.agents.core import build_agent_context, run_agent
from app.agents.prompts import MASTER_PROMPT
from app.agents.sub_agents import SUB_AGENT_CONFIGS
from app.agents.tools.registry import get_tools_for_domains, get_all_tools

router = APIRouter(prefix="/projects/{project_id}/agent", tags=["agent"])


class AgentRequest(BaseModel):
    task: str
    sub_agent: str | None = None


class AgentResponse(BaseModel):
    answer: str
    tool_calls: list[dict]
    iterations: int
    sub_agent_used: str | None = None
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

    The agent autonomously decides which tools to call, iterates until
    it has enough information, and returns a comprehensive answer.

    Optionally specify a sub_agent for domain-specific analysis:
    - deploy_monitor: deployment health, failure analysis
    - github_analyzer: commit/PR/CI analysis
    - sns_manager: SNS performance, content drafting
    - market_researcher: competitive intelligence, trends
    """
    # Build context with project data + knowledge base + tokens
    context = await build_agent_context(project_id, user["id"])

    # Inject project knowledge into system prompt
    project_readme = context.knowledge.get("project_readme", "Knowledge base not yet available.")

    if body.sub_agent and body.sub_agent in SUB_AGENT_CONFIGS:
        config = SUB_AGENT_CONFIGS[body.sub_agent]
        context.max_iterations = config.max_iterations
        system_prompt = config.prompt_template.replace("{project_readme}", project_readme)
        declarations, handlers = get_tools_for_domains(config.domains)
    else:
        system_prompt = MASTER_PROMPT.replace("{project_readme}", project_readme)
        declarations, handlers = get_all_tools()

    result = await run_agent(
        context=context,
        task=body.task,
        tool_declarations=declarations,
        tool_handlers=handlers,
        system_prompt=system_prompt,
    )

    return AgentResponse(
        answer=result.answer,
        tool_calls=result.tool_calls,
        iterations=result.iterations,
        sub_agent_used=body.sub_agent,
        error=result.error,
    )
