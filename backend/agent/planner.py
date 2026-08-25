"""
Task Classification and Dynamic Planner Engine for KAVACH AI Workbench.
"""

from typing import List, Tuple
from backend.agent.state import AgentState, PlanStep, StepStatus, TaskCategory


class TaskClassifier:
    """Classifies user queries and attached files into sovereign workflow categories."""

    @staticmethod
    def classify(query: str, input_files: List[str]) -> TaskCategory:
        query_lower = query.lower()
        file_exts = [f.split(".")[-1].lower() for f in input_files if "." in f]

        if any(ext in ["pdf", "png", "jpg", "jpeg", "tiff"] for ext in file_exts) or any(
            kw in query_lower for kw in ["inspection", "scanned", "report", "audit", "defect", "weld"]
        ):
            return TaskCategory.DOCUMENT_INSPECTION

        if any(kw in query_lower for kw in ["sop", "manual", "policy", "guideline", "standard", "regulation"]):
            return TaskCategory.SOP_RAG_QUERY

        if any(kw in query_lower for kw in ["code", "python", "script", "sandbox", "execute", "run"]):
            return TaskCategory.SANDBOX_CODE_EXECUTION

        if any(kw in query_lower for kw in ["docx", "xlsx", "pptx", "generate deliverable", "tracker", "approval note"]):
            return TaskCategory.DELIVERABLE_GENERATION

        return TaskCategory.GENERAL_REASONING


class AgentPlanner:
    """Generates dynamic multi-step execution plans tailored to the task category."""

    @staticmethod
    def create_plan(state: AgentState) -> Tuple[TaskCategory, List[PlanStep]]:
        category = TaskClassifier.classify(state.user_query, state.input_files)

        steps: List[PlanStep] = []

        if category == TaskCategory.DOCUMENT_INSPECTION:
            steps = [
                PlanStep(
                    step_id=1,
                    title="Document OCR & Text Extraction",
                    description="Extract text, tables, and handwriting from uploaded inspection document.",
                    assigned_tool="ocr_pdf_tool",
                ),
                PlanStep(
                    step_id=2,
                    title="Visual Inspection Analysis",
                    description="Analyze attached photographs and defect diagrams using local vision model.",
                    assigned_tool="vision_analysis_tool",
                ),
                PlanStep(
                    step_id=3,
                    title="SOP & Guidance Retrieval",
                    description="Retrieve relevant internal safety SOPs and maintenance manuals from local vector RAG.",
                    assigned_tool="rag_search_tool",
                ),
                PlanStep(
                    step_id=4,
                    title="Synthesize Findings & Risk Assessment",
                    description="Combine inspection OCR, visual findings, and SOP guidance using specialized local LLM.",
                    assigned_tool="model_router_tool",
                ),
                PlanStep(
                    step_id=5,
                    title="Generate Approval Note (DOCX)",
                    description="Format verified findings and recommendations into official Word approval note.",
                    assigned_tool="generate_docx_tool",
                ),
                PlanStep(
                    step_id=6,
                    title="Generate Action Tracker (XLSX)",
                    description="Create spreadsheet action tracker with itemized maintenance tasks and priorities.",
                    assigned_tool="generate_xlsx_tool",
                ),
            ]

        elif category == TaskCategory.SOP_RAG_QUERY:
            steps = [
                PlanStep(
                    step_id=1,
                    title="Local SOP Vector RAG Search",
                    description="Query local knowledge base for relevant SOPs, clauses, and manuals.",
                    assigned_tool="rag_search_tool",
                ),
                PlanStep(
                    step_id=2,
                    title="Synthesize Citation-Backed Answer",
                    description="Generate comprehensive answer with explicit page and section citations.",
                    assigned_tool="model_router_tool",
                ),
            ]

        elif category == TaskCategory.SANDBOX_CODE_EXECUTION:
            steps = [
                PlanStep(
                    step_id=1,
                    title="Sandboxed Script Execution",
                    description="Execute code in network-isolated Docker sandbox.",
                    assigned_tool="sandbox_code_tool",
                ),
                PlanStep(
                    step_id=2,
                    title="Analyze Execution Results",
                    description="Interpret stdout, stderr, and output artifacts safely.",
                    assigned_tool="model_router_tool",
                ),
            ]

        elif category == TaskCategory.DELIVERABLE_GENERATION:
            steps = [
                PlanStep(
                    step_id=1,
                    title="Retrieve Relevant Context",
                    description="Retrieve project context and guidelines from local RAG.",
                    assigned_tool="rag_search_tool",
                ),
                PlanStep(
                    step_id=2,
                    title="Generate Approval Note DOCX",
                    description="Produce formatted Word approval note.",
                    assigned_tool="generate_docx_tool",
                ),
                PlanStep(
                    step_id=3,
                    title="Generate Action Tracker XLSX",
                    description="Produce formatted Excel action tracker.",
                    assigned_tool="generate_xlsx_tool",
                ),
            ]

        else:  # GENERAL_REASONING
            steps = [
                PlanStep(
                    step_id=1,
                    title="Local Model Reasoning",
                    description="Process user query using sovereign local LLM without cloud access.",
                    assigned_tool="model_router_tool",
                ),
            ]

        return category, steps
