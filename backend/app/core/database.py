from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

# Configure connect_args to force search_path=general_rag, public for PostgreSQL asyncpg
connect_args = {}
engine_kwargs = {"echo": False, "future": True}

if "postgresql" in settings.database_url_final:
    connect_args = {"server_settings": {"search_path": "general_rag, public"}}
    engine_kwargs.update(
        {
            "pool_pre_ping": True,
            "pool_recycle": 300,
            "pool_size": 20,
            "max_overflow": 10,
        }
    )

# Engine configuration
engine = create_async_engine(
    settings.database_url_final,
    connect_args=connect_args,
    **engine_kwargs,
)

# Async session factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency that provides an async database session per request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
