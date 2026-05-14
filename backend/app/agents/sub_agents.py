"""Sub-agent configurations for LaunchPad Agent.

Each sub-agent is a domain-specialized tool group + system prompt.
The master agent delegates to sub-agents via the delegate_to_sub_agent tool.
"""

from dataclasses import dataclass

from app.agents.prompts import (
    DEPLOY_MONITOR_PROMPT,
    GITHUB_ANALYZER_PROMPT,
    SNS_MANAGER_PROMPT,
    MARKET_RESEARCHER_PROMPT,
)


@dataclass
class SubAgentConfig:
    domains: list[str]
    prompt_template: str
    max_iterations: int = 8


SUB_AGENT_CONFIGS: dict[str, SubAgentConfig] = {
    "deploy_monitor": SubAgentConfig(
        domains=["deploy", "github", "knowledge", "internal"],
        prompt_template=DEPLOY_MONITOR_PROMPT,
        max_iterations=6,
    ),
    "github_analyzer": SubAgentConfig(
        domains=["github", "knowledge", "internal"],
        prompt_template=GITHUB_ANALYZER_PROMPT,
        max_iterations=8,
    ),
    "sns_manager": SubAgentConfig(
        domains=["sns", "market", "knowledge"],
        prompt_template=SNS_MANAGER_PROMPT,
        max_iterations=8,
    ),
    "market_researcher": SubAgentConfig(
        domains=["market", "knowledge"],
        prompt_template=MARKET_RESEARCHER_PROMPT,
        max_iterations=6,
    ),
}
