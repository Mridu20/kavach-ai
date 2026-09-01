"""
KAVACH AI Backend Entrypoint (FastAPI).
Sovereign Industrial AI Workbench.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.api.agent_router import router as agent_router
from backend.api.rag_router import router as rag_router

app = FastAPI(
    title="KAVACH AI - Sovereign Industrial AI Workbench API",
    description="On-premise, air-gapped agentic AI backend with 0 external cloud calls.",
    version="1.0.0",
)

# Enable CORS for React UI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(agent_router)
app.include_router(rag_router)


@app.get("/")
def root_status():
    return {
        "status": "ONLINE",
        "system": "KAVACH AI Sovereign Industrial Workbench",
        "sovereignty_proof": "0 cloud calls / Air-gapped ready",
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
