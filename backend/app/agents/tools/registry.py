"""Tool registry for LaunchPad Agent -- declarative tool definitions for Gemini function calling."""

from dataclasses import dataclass, field
from typing import Any, Callable, Coroutine


@dataclass
class ToolDef:
    name: str
    description: str
    parameters: dict[str, Any]
    handler: Callable[..., Coroutine[Any, Any, dict]]
    domain: str


_REGISTRY: dict[str, ToolDef] = {}


def register_tool(
    name: str,
    description: str,
    parameters: dict[str, Any],
    handler: Callable,
    domain: str,
):
    """Register a tool for agent use."""
    _REGISTRY[name] = ToolDef(
        name=name,
        description=description,
        parameters=parameters,
        handler=handler,
        domain=domain,
    )


def get_tools_for_domains(domains: list[str]) -> tuple[list[dict], dict[str, ToolDef]]:
    """Return Gemini function declarations + handler map for given domains."""
    declarations = []
    handlers = {}
    for tool in _REGISTRY.values():
        if tool.domain in domains:
            declarations.append({
                "name": tool.name,
                "description": tool.description,
                "parameters": {
                    "type": "object",
                    "properties": tool.parameters,
                },
            })
            handlers[tool.name] = tool
    return declarations, handlers


def get_all_tools() -> tuple[list[dict], dict[str, ToolDef]]:
    """Return all registered tools."""
    return get_tools_for_domains(list({t.domain for t in _REGISTRY.values()}))
