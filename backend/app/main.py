import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1 import datasets as datasets_router
from app.api.v1 import chat as chat_router
from app.core.config import get_settings


logging.basicConfig(level=logging.INFO, format="%(levelname)s:%(name)s:%(message)s")

app = FastAPI(title="mnemos API")
settings = get_settings()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(datasets_router.router, prefix="/api/v1")
app.include_router(chat_router.router, prefix="/api/v1")
app.mount("/storage", StaticFiles(directory=str(settings.storage_dir)), name="storage")


@app.get("/")
def read_root():
    return {"service": "mnemos", "status": "ok"}


if __name__ == "__main__":
    import uvicorn

    # Create database tables
    from app.core.dependencies import get_chat_service
    chat_svc = get_chat_service()
    chat_svc.create_tables()

    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
