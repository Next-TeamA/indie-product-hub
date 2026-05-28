"""LangGraph Postgres Checkpointer factory.

기획서 §6.4 + §부록 I.4.

setup() race condition 회피: 첫 호출 시 lock 보호된 setup().
이상적으로는 별도 마이그레이션 SQL로 분리하지만, langgraph-checkpoint-postgres
가 자체 setup() 로직을 관리하므로 lazy + lock 방식 채택.
"""

import asyncio

from app.core.config import settings
from app.core.exceptions import ExternalAPIError

_checkpointer = None
_setup_lock = asyncio.Lock()
_setup_done = False


async def get_checkpointer():
    """Lazy-init AsyncPostgresSaver. Returns shared instance.

    Returns None if SUPABASE_DB_URL not configured (LangGraph not yet ready
    in this environment — caller should fall back to legacy agent).
    """
    global _checkpointer, _setup_done

    if not settings.supabase_db_url:
        return None

    if _checkpointer is not None and _setup_done:
        return _checkpointer

    async with _setup_lock:
        if _checkpointer is not None and _setup_done:
            return _checkpointer

        try:
            from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
        except ImportError:
            raise ExternalAPIError(
                "LangGraph",
                "langgraph-checkpoint-postgres not installed. Run: pip install langgraph-checkpoint-postgres",
            )

        if _checkpointer is None:
            # AsyncPostgresSaver.from_conn_string is async context manager,
            # we keep it open for app lifetime.
            cm = AsyncPostgresSaver.from_conn_string(settings.supabase_db_url)
            _checkpointer = await cm.__aenter__()

        if not _setup_done:
            await _checkpointer.setup()
            _setup_done = True

        return _checkpointer


async def close_checkpointer() -> None:
    """Call on app shutdown."""
    global _checkpointer, _setup_done
    if _checkpointer is not None:
        try:
            # AsyncPostgresSaver.__aexit__ closes the connection pool
            pass  # AsyncPostgresSaver는 내부 connection을 관리. 명시적 close 불필요.
        except Exception:
            pass
        _checkpointer = None
        _setup_done = False
