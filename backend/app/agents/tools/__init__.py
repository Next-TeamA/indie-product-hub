"""Initialize all agent tools."""

from app.agents.tools.github_tools import register_github_tools
from app.agents.tools.deploy_tools import register_deploy_tools
from app.agents.tools.sns_tools import register_sns_tools
from app.agents.tools.market_tools import register_market_tools
from app.agents.tools.knowledge_tools import register_knowledge_tools
from app.agents.tools.internal_tools import register_internal_tools


def register_all_tools():
    register_github_tools()
    register_deploy_tools()
    register_sns_tools()
    register_market_tools()
    register_knowledge_tools()
    register_internal_tools()
