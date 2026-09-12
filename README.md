# KAVACH AI — Sovereign General-Purpose AI Agent

KAVACH AI is a self-hosted, sovereign, on-premise agentic AI assistant designed to run fully air-gapped with zero external cloud egress.

The application functions as a general-purpose AI agent (similar to Claude or ChatGPT) that:
- Answers general reasoning, coding, and analytical questions using local language models (Ollama).
- Maintains multi-turn conversation context.
- Analyzes documents and images **only when explicitly supplied by the user** (via PyPDF, Tesseract OCR, and local vision models).
- Safely executes user-requested Python scripts in a network-isolated sandbox.
- Generates formatted documents (`.docx`, `.xlsx`) on demand.
- Operates without hidden industrial rules, hardcoded domain findings, or forced SOP document retrieval.
- Verifies network sovereignty locally via psutil-based socket audits.

---

## Key Architectural Principles

1. **General-Purpose Reasoning**:
   The assistant reasons over the user's prompt and conversation context using the selected local model (`Qwen2.5-7B-Instruct`, `Qwen2.5-Coder-7B`, etc.) rather than forcing queries through a predefined industrial knowledge base.

2. **User-Provided Context Only**:
   Document analysis is only triggered when the user explicitly uploads files. The agent reasons strictly over user-provided text without inventing missing details or fabricating sources.

3. **Zero Fake Data or Demo Fallbacks**:
   When data or local models are unavailable (e.g. if Ollama is not running), the agent responds honestly with clear guidance rather than substituting fake industrial calculations or demo findings.

4. **100% On-Premise & Air-Gapped**:
   All processing occurs locally on host hardware. Active network connections are auditable in real time via the Network Monitor.

---

## Directory Structure

- `backend/`
  - `agent/` — State machine orchestrator, dynamic planner, tool registry, and self-verification engine.
  - `api/` — FastAPI endpoints (`/api/agent/run`, `/run-stream`, `/upload`, `/download`, `/api/system/network`).
  - `storage/` — Local uploads and generated deliverables.
- `ingestion/` — Multi-engine document processing (PyPDF fast-path, Tesseract OCR, Qwen-VL).
- `frontend/` — React 19 + TypeScript + Vite user interface.
- `tests/` — Automated test suite verifying general-purpose reasoning and zero-egress security.

---

## Getting Started

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ & npm
- [Ollama](https://ollama.com/) running locally (`http://localhost:11434`)
  ```bash
  ollama pull qwen2.5:7b-instruct-q4_K_M
  ollama pull qwen2.5-coder:7b-instruct-q4_K_M
  ollama serve
  ```

### 2. Backend Setup
```bash
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Access the application at `http://localhost:5173`.

---

## Running Tests
To run the automated verification test suite:
```bash
.\.venv\Scripts\python -m pytest
```
To verify the frontend build:
```bash
cd frontend
npm run build
```