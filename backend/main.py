"""
KAVACH AI Backend Entrypoint (FastAPI).
On-premise sovereign general-purpose AI agent.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.api.agent_router import router as agent_router
from backend.api.system_router import router as system_router

app = FastAPI(
    title="KAVACH AI - Sovereign AI Agent API",
    description="General-purpose on-premise agentic AI assistant with zero external cloud egress.",
    version="2.0.0",
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
app.include_router(system_router)


@app.get("/")
def root_status():
    return {
        "status": "ONLINE",
        "system": "KAVACH AI Agent",
        "sovereignty_proof": "0 cloud calls / Air-gapped ready",
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
