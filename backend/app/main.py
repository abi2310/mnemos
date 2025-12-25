from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import datasets as datasets_router


app = FastAPI(title="mnemos API")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(datasets_router.router, prefix="/api/v1")


@app.get("/")
def read_root():
    return {"service": "mnemos", "status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)