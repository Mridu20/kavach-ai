"""
Task Classification and Dynamic Planner Engine for General-Purpose AI Agent.
"""

from typing import List, Tuple
from backend.agent.state import AgentState, PlanStep, StepStatus, TaskCategory


class TaskClassifier:
    """Classifies user queries and attached files into clean assistant workflow categories."""

    @staticmethod
    def classify(query: str, input_files: List[str]) -> TaskCategory:
        query_lower = query.lower()

        # Document analysis only when the user explicitly provides files
        if input_files and len(input_files) > 0:
            return TaskCategory.DOCUMENT_ANALYSIS

        # Code execution in sandbox if explicitly asked
        if any(kw in query_lower for kw in ["run python", "run script", "execute python", "execute script", "execute code", "run in sandbox"]):
            return TaskCategory.SANDBOX_CODE_EXECUTION

        # Explicit document/spreadsheet generation
        if any(kw in query_lower for kw in ["generate docx", "generate excel", "export xlsx", "create spreadsheet", "generate spreadsheet", "create docx file"]):
            return TaskCategory.DELIVERABLE_GENERATION

        return TaskCategory.GENERAL_REASONING


class AgentPlanner:
    """Generates execution plans tailored to the user's specific request."""

    @staticmethod
    def create_plan(state: AgentState) -> Tuple[TaskCategory, List[PlanStep]]:
        category = TaskClassifier.classify(state.user_query, state.input_files)

        steps: List[PlanStep] = []

        if category in (TaskCategory.DOCUMENT_ANALYSIS, TaskCategory.DOCUMENT_INSPECTION):
            steps = [
                PlanStep(
                    step_id=1,
                    title="Document Content Extraction",
                    description="Extract text and structure from user-provided file.",
                    assigned_tool="ocr_pdf_tool",
                ),
                PlanStep(
                    step_id=2,
                    title="Document Analysis & Reasoning",
                    description="Analyze extracted document content using language model.",
                    assigned_tool="model_router_tool",
                ),
            ]

        elif category == TaskCategory.SANDBOX_CODE_EXECUTION:
            steps = [
                PlanStep(
                    step_id=1,
                    title="Sandboxed Code Execution",
                    description="Execute script safely in isolated environment.",
                    assigned_tool="sandbox_code_tool",
                ),
                PlanStep(
                    step_id=2,
                    title="Analyze Execution Results",
                    description="Interpret script output and format response.",
                    assigned_tool="model_router_tool",
                ),
            ]

        elif category == TaskCategory.DELIVERABLE_GENERATION:
            query_lower = state.user_query.lower()
            tool = "generate_xlsx_tool" if any(w in query_lower for w in ["xlsx", "excel", "spreadsheet"]) else "generate_docx_tool"
            steps = [
                PlanStep(
                    step_id=1,
                    title="Synthesize Content",
                    description="Synthesize document content using language model.",
                    assigned_tool="model_router_tool",
                ),
                PlanStep(
                    step_id=2,
                    title="Generate Document File",
                    description=f"Export synthesized content using {tool}.",
                    assigned_tool=tool,
                ),
            ]

        else:  # GENERAL_REASONING and all general queries
            steps = [
                PlanStep(
                    step_id=1,
                    title="Reasoning & Response Generation",
                    description="Process user query using language model.",
                    assigned_tool="model_router_tool",
                ),
            ]

        return category, steps
