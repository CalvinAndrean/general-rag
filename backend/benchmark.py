import asyncio
import time
from app.api.v1.endpoints.settings import list_openrouter_models
from app.models.auth import User

async def main():
    user = User(id="test", email="test@test.com", tenant_id="test", role="admin")

    # warmup
    try:
        await list_openrouter_models(user=user)
    except Exception as e:
        print("Warmup failed", e)

    start = time.time()
    for _ in range(5):
        try:
            await list_openrouter_models(user=user)
        except Exception as e:
            pass
    end = time.time()

    print(f"Total time for 5 calls: {end - start:.2f} seconds")

if __name__ == "__main__":
    asyncio.run(main())
