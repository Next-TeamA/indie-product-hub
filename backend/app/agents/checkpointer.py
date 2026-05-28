"""LangGraph Postgres Checkpointer factory.

기획서 §6.4 + §부록 I.4.

Supabase pooler 호환:
- AsyncConnectionPool 사용 (단일 connection은 장기 실행 부적합)
- prepare_threshold=None (pgbouncer/pooler가 prepared statement 충돌 방지)
- autocommit=True (checkpointer 요구)

setup()은 첫 호출 시 lock 보호. checkpoint 테이블(checkpoints,
checkpoint_blobs, checkpoint_writes, checkpoint_migrations)을 생성.
"""

import asyncio

from app.core.config import settings
from app.core.exceptions import ExternalAPIError

_pool = None
_checkpointer = None
_setup_lock = asyncio.Lock()


async def get_checkpointer():
    """Lazy-init AsyncPostgresSaver backed by a connection pool.

    Returns None if SUPABASE_DB_URL not configured (caller falls back to
    legacy agent).
    """
    global _pool, _checkpointer

    if not settings.supabase_db_url:
        return None

    if _checkpointer is not None:
        return _checkpointer

    async with _setup_lock:
        if _checkpointer is not None:
            return _checkpointer

        try:
            from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
            from psycopg_pool import AsyncConnectionPool
        except ImportError as e:
            raise ExternalAPIError(
                "LangGraph",
                f"checkpointer deps missing ({e}). "
                "pip install langgraph-checkpoint-postgres psycopg-pool",
            )

        # pooler 호환: prepare_threshold=None, autocommit=True
        _pool = AsyncConnectionPool(
            conninfo=settings.supabase_db_url,
            max_size=10,
            open=False,
            kwargs={"autocommit": True, "prepare_threshold": None},
        )
        await _pool.open()

        _checkpointer = AsyncPostgresSaver(_pool)
        await _checkpointer.setup()
        return _checkpointer


async def close_checkpointer() -> None:
    """Call on app shutdown."""
    global _pool, _checkpointer
    if _pool is not None:
        try:
            await _pool.close()
        except Exception:
            pass
    _pool = None
    _checkpointer = None
