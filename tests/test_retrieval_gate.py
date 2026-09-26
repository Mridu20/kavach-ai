"""
Contract tests for the knowledge base retrieval gate.

These encode the behaviour the team lost the first time RAG was enabled:
retrieval was forced into every plan, so general questions came back as
SOP-flavoured reports and the knowledge base was deleted rather than gated.

Test 1 is the important one. It must keep passing now that retrieval is back —
that is the proof RAG returned without swallowing general assistant behaviour.

No Ollama required: these assert on planning and gating, not model output.
"""

import pytest

from backend.agent.planner import AgentPlanner, TaskClassifier, needs_knowledge_base
from backend.agent.state import AgentState, TaskCategory
from backend.agent.tools_registry import default_tool_registry


def plan_for(query: str, input_files=None):
    """Returns (category, [tool names]) for a query, as the orchestrator would."""
    state = AgentState(task_id="t_test", user_query=query, input_files=input_files or [])
    category, steps = AgentPlanner.create_plan(state)
    return category, [s.assigned_tool for s in steps]


# ── The four acceptance tests ────────────────────────────────────────────────

def test_1_general_question_stays_general():
    """A general question gets a plain answer: no retrieval, no report."""
    category, tools = plan_for("What is the capital of France?")

    assert category == TaskCategory.GENERAL_REASONING
    assert tools == ["model_router_tool"]
    assert "rag_search_tool" not in tools, "retrieval leaked into a general question"
    assert "generate_docx_tool" not in tools, "a report was forced onto a plain question"


def test_2_internal_question_triggers_retrieval():
    """A question about the organisation's own rules searches the knowledge base first."""
    category, tools = plan_for("What is our corrosion tolerance limit per the SOP?")

    assert tools[0] == "rag_search_tool", "internal question did not search the corpus"
    assert "model_router_tool" in tools, "retrieval must still be followed by an answer"


def test_3_unknown_internal_topic_still_plans_an_answer():
    """
    A knowledge-base-shaped question about an uncovered topic must still reach
    the model, so it can say "not in the knowledge base" rather than dead-ending.
    """
    _, tools = plan_for("What is our company policy on underwater basket weaving?")

    assert "model_router_tool" in tools, "no answering step: the user would get nothing"


def test_4_coding_question_skips_retrieval():
    """Code requests never touch the corpus."""
    _, tools = plan_for("Write a python function to reverse a string")

    assert "rag_search_tool" not in tools
    assert "generate_docx_tool" not in tools


# ── Gate unit tests ──────────────────────────────────────────────────────────

@pytest.mark.parametrize("query", [
    "What is our corrosion tolerance limit?",
    "Per our SOP, how often are seals replaced?",
    "Check the manual for the vibration trip threshold",
    "What does the knowledge base say about confined space entry?",
    "Do we require a permit for confined space work?",
])
def test_gate_fires_on_internal_questions(query):
    assert needs_knowledge_base(query) is True


@pytest.mark.parametrize("query", [
    "What is the capital of France?",
    "Write a python function to reverse a string",
    "Explain quantum entanglement simply",
    "Translate 'good morning' into Hindi",
    "What is 17 * 23?",
    "",
])
def test_gate_stays_shut_on_general_questions(query):
    assert needs_knowledge_base(query) is False


def test_gate_ignores_general_knowledge_about_industrial_topics():
    """
    'Explain corrosion' is general chemistry, not a question about OUR rules.
    A topic word alone must not open the gate.
    """
    assert needs_knowledge_base("Explain how corrosion works in metals") is False


# ── Registry and honesty guarantees ──────────────────────────────────────────

def test_rag_tool_is_registered():
    """The regression that started all of this: the tool silently unregistered."""
    assert default_tool_registry.get_tool("rag_search_tool") is not None


def test_rag_tool_never_fabricates_evidence():
    """
    An unanswerable query must return zero results — never placeholder snippets.
    The original bug returned hardcoded SOP text for literally any input.
    """
    tool = default_tool_registry.get_tool("rag_search_tool")
    out = tool.run(query="zzzz nonexistent topic qqqq", top_k=3)

    assert out["status"] in {"NO_MATCH", "UNAVAILABLE", "ERROR"}
    assert out["results"] == [], "fabricated evidence returned for an unmatched query"


def test_classifier_reserves_deliverables_for_explicit_requests():
    """Reports are produced on request, never as the default answer shape."""
    assert TaskClassifier.classify("summarise this", []) == TaskCategory.GENERAL_REASONING
    assert TaskClassifier.classify("generate docx summary", []) == TaskCategory.DELIVERABLE_GENERATION


# ── Deliverable detection ────────────────────────────────────────────────────
# Regression cases: asking for a file while a document is attached used to
# classify as plain document analysis and silently produce no file at all.

@pytest.mark.parametrize("query,files,expected_tool", [
    # The reported bug: attachment + explicit file request.
    ("Summarise this resume and generate a docx", ["cv.pdf"], "generate_docx_tool"),
    ("Summarise the details in this flight ticket as a word document", ["t.pdf"], "generate_docx_tool"),
    ("make me an excel sheet of these findings", ["x.pdf"], "generate_xlsx_tool"),
    # Phrasings the old narrow keyword list missed.
    ("give me an xlsx of the action items", [], "generate_xlsx_tool"),
    ("I need a spreadsheet of inspection intervals", [], "generate_xlsx_tool"),
    ("draft a word doc covering the findings", [], "generate_docx_tool"),
    ("export xlsx", [], "generate_xlsx_tool"),
])
def test_requested_file_is_always_generated(query, files, expected_tool):
    _, tools = plan_for(query, files)
    assert expected_tool in tools, f"user asked for a file but none was planned: {tools}"


@pytest.mark.parametrize("query,files", [
    ("Summarise this document", ["r.pdf"]),
    ("What is the capital of France?", []),
    ("What is a docx file?", []),          # asking *about* a format, not for one
    ("Explain how spreadsheets work", []),
])
def test_no_file_generated_unless_requested(query, files):
    _, tools = plan_for(query, files)
    assert "generate_docx_tool" not in tools
    assert "generate_xlsx_tool" not in tools


def test_spreadsheet_rows_parsed_from_markdown_table():
    """The model is asked for a table; it must export as rows, not one cell."""
    from backend.agent.orchestrator import AgentOrchestrator

    rows = AgentOrchestrator._rows_from_answer(
        "| Task | Status |\n|------|--------|\n| Inspect weld | Open |\n| Replace seal | Done |"
    )
    assert rows == [
        {"Task": "Inspect weld", "Status": "Open"},
        {"Task": "Replace seal", "Status": "Done"},
    ]


def test_spreadsheet_rows_fall_back_to_bullets():
    from backend.agent.orchestrator import AgentOrchestrator

    rows = AgentOrchestrator._rows_from_answer("Findings:\n- First item\n- Second item")
    assert rows == [{"item": "First item"}, {"item": "Second item"}]


# ── Typo tolerance and multi-format requests ─────────────────────────────────
# Real user input contains typos. Exact substring matching silently dropped
# those requests, and returning a single format dropped half of a "docx and
# spreadsheet" ask. Both failures were invisible: the user just got prose.

@pytest.mark.parametrize("query,expected", [
    # Reported verbatim, including the misspelling of "spreadsheet".
    ("generate a summary in form of docx for this resume and also in form of spreasheet",
     ["docx", "xlsx"]),
    # Both formats, varied phrasing.
    ("summarise as docx and xlsx", ["docx", "xlsx"]),
    ("give me a word document and an excel sheet", ["docx", "xlsx"]),
    ("export to both docx and spreadsheet", ["docx", "xlsx"]),
    # Single format with typos: deletion, transposition, doubled letter.
    ("genrate a docx", ["docx"]),
    ("create a spreadshet", ["xlsx"]),
    ("make a wrod document", ["docx"]),
    ("give me an excell sheet", ["xlsx"]),
    ("i need a exel file", ["xlsx"]),
    ("sumarise this reusme into a spredsheet", ["xlsx"]),
    ("pls giv me docx nd xlsx", ["docx", "xlsx"]),
])
def test_deliverables_survive_typos_and_multiple_formats(query, expected):
    from backend.agent.planner import detect_deliverables
    assert detect_deliverables(query) == expected


@pytest.mark.parametrize("query", [
    "What is a docx file?",                     # question about the format
    "what is the difference between docx and pdf",
    "explain how spreadsheets work",
    "describe the excel format",
    "in other words it is fine",                # "fine" is one edit from "file"
    "Summarise this document",                  # refers to the attachment
    "summarise this resume",
])
def test_fuzzy_matching_does_not_invent_requests(query):
    from backend.agent.planner import detect_deliverables
    assert detect_deliverables(query) == []


def test_both_generators_planned_when_both_requested():
    _, tools = plan_for(
        "generate a summary in form of docx for this resume and also in form of spreasheet",
        ["resume.pdf"],
    )
    assert "generate_docx_tool" in tools
    assert "generate_xlsx_tool" in tools


# ── Heavily misspelled format names ──────────────────────────────────────────
# Edit distance alone is not enough: "sparesaheet" is four edits from
# "spreadsheet", past any cap that stays safe, so a similarity ratio covers
# long mangled words while edit distance covers short ones.

@pytest.mark.parametrize("query,expected", [
    ("generate a summary docx of this pdf and also the sparesaheet", ["docx", "xlsx"]),
    ("i need a sparesaheet", ["xlsx"]),
    ("give me a spredsheet", ["xlsx"]),
    ("send me the spreadsheeet", ["xlsx"]),
    ("create a spreadshet", ["xlsx"]),
    ("give me a sheet of the findings", ["xlsx"]),
])
def test_heavily_misspelled_formats_are_understood(query, expected):
    from backend.agent.planner import detect_deliverables
    assert detect_deliverables(query) == expected


@pytest.mark.parametrize("query", [
    # "sheet" is an ordinary word, so it needs an explicit request word too.
    "the street was sweet and the sheets were spread",
    "the sheets on the bed are clean",
    "my work is done and the world is fine",
    "find the line in this document",
])
def test_ordinary_prose_never_requests_a_file(query):
    from backend.agent.planner import detect_deliverables
    assert detect_deliverables(query) == []
