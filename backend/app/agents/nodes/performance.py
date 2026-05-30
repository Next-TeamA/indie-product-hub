"""Performance node — schedule metric collection at +1h/+6h/+24h/+7d.

기획서 §4.7 + §11.

PR1: 단순 schedule field 세팅. Wave 7에서 실제 Celery task enqueue.
"""

from app.agents.graph_state import AMPState


async def performance_node(state: AMPState) -> dict:
    return {
        "performance_schedule": ["+1h", "+6h", "+24h", "+7d"],
        "current_node": "performance",
        "cost_usd": 0.0,
    }
