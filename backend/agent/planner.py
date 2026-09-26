"""
Task Classification and Dynamic Planner Engine for General-Purpose AI Agent.
"""

import difflib
import re
from typing import List, Optional, Tuple

from backend.agent.state import AgentState, PlanStep, StepStatus, TaskCategory


# Signals that a question is about the organisation's own documented rules,
# equipment or procedures, and therefore deserves a knowledge base lookup.
#
# This gate exists to protect general assistant behaviour. A previous revision
# forced retrieval into every plan, so "what is the capital of France" was
# answered with SOP fragments stapled to it and shaped like an inspection
# report. Retrieval must be the exception that earns its place, not the default.
_KB_TOPIC_TERMS = (
    "sop", "standard operating procedure", "procedure", "manual", "policy",
    "guideline", "specification", "spec", "datasheet", "work instruction",
    "inspection", "maintenance", "overhaul", "calibration", "shutdown",
    "turbine", "vessel", "corrosion", "weld", "valve", "bearing", "seal",
    "vibration", "lubricant", "threshold", "tolerance", "clearance",
    "permit", "compliance", "audit", "incident", "safety",
)

_KB_POSSESSIVE_TERMS = (
    "our ", "company", "plant", "site", "refinery", "organisation",
    "organization", "internal", "in-house", "we require", "do we",
    "are we", "per our", "as per", "according to the",
)

_KB_EXPLICIT_TERMS = (
    "knowledge base", "look it up", "search the docs", "search our documents",
    "check the manual", "check the sop", "from the manual", "from the sop",
    "in the documentation", "internal documents",
)


def needs_knowledge_base(query: str) -> bool:
    """
    Decides whether a query should trigger a knowledge base lookup.

    Deliberately deterministic keyword matching rather than an LLM call: this
    runs on every request, must be fast, and — more importantly — must be
    debuggable. An LLM gate that misfires at 2am is untraceable; this one can
    be read, tested and corrected in a line.

    Returning False is safe. The plan falls through to a normal model answer,
    which is exactly what a general question should get.
    """
    if not query:
        return False

    q = query.lower()

    # An explicit instruction always wins.
    if any(term in q for term in _KB_EXPLICIT_TERMS):
        return True

    # Otherwise require BOTH an organisational framing ("our", "the plant")
    # and a documented-subject term. Either alone is too loose: "our team is
    # great" is not a lookup, and "explain corrosion in metals" is general
    # knowledge the model can answer without the corpus.
    has_possessive = any(term in q for term in _KB_POSSESSIVE_TERMS)
    has_topic = any(term in q for term in _KB_TOPIC_TERMS)

    return has_possessive and has_topic


# Vocabulary for detecting which file the user is asking for.
#
# Matching is fuzzy (see _fuzzy_has) because people typing quickly produce
# "spreasheet", "excell", "genrate". Exact substring matching silently dropped
# those requests and the user got prose instead of the file they asked for,
# with nothing explaining why.
_XLSX_WORDS = ("xlsx", "xls", "excel", "spreadsheet", "worksheet")
_DOCX_WORDS = ("docx", "doc")

# Ordinary English words that also name a format. Unlike "xlsx" or
# "spreadsheet", seeing one is not by itself a request — "the sheets were
# spread" is a sentence, not an instruction — so these additionally require an
# explicit request word somewhere in the query.
_WEAK_XLSX_WORDS = ("sheet",)

# "word" alone is too common ("in other words"), so it only counts as a docx
# request when paired with a document-ish noun: "word document", "word file".
_WORD_NOUNS = ("document", "doc", "file", "format")

# Intent signals. A format name alone is not a request — "what is a docx file?"
# is a question about the format, not an instruction to produce one.
_REQUEST_WORDS = (
    "generate", "create", "make", "produce", "export", "build", "draft",
    "write", "prepare", "give", "send", "download", "save", "convert",
    "want", "need", "provide", "share", "output", "form", "attach", "also",
)

# Question openers. A format named inside one of these is being asked about,
# not asked for: "what is a docx file?" must not produce a docx.
_DEFINITIONAL_OPENERS = (
    "what", "whats", "which", "how", "why", "explain", "define", "describe",
    "tell", "compare", "difference",
)


def _tokens(text: str) -> List[str]:
    return re.findall(r"[a-z]+", (text or "").lower())


def _edit_distance(a: str, b: str, cap: int = 2) -> int:
    """
    Damerau-Levenshtein distance, counting a transposition as one edit.

    Used instead of difflib's similarity ratio because ratio penalises
    transpositions heavily — "wrod" scores only 0.75 against "word", below any
    threshold loose enough to be safe, so the commonest kind of typo went
    undetected. Adjacent swaps are exactly what fast typing produces.
    """
    if abs(len(a) - len(b)) > cap:
        return cap + 1

    previous_row = list(range(len(b) + 1))
    two_rows_back: List[int] = []

    for i, char_a in enumerate(a, start=1):
        current_row = [i]
        for j, char_b in enumerate(b, start=1):
            cost = 0 if char_a == char_b else 1
            value = min(
                previous_row[j] + 1,          # deletion
                current_row[j - 1] + 1,       # insertion
                previous_row[j - 1] + cost,   # substitution
            )
            # Transposition of two adjacent characters.
            if i > 1 and j > 1 and char_a == b[j - 2] and a[i - 2] == char_b:
                value = min(value, two_rows_back[j - 2] + cost)
            current_row.append(value)
        two_rows_back = previous_row
        previous_row = current_row

    return previous_row[-1]


# Similarity floor for long words, used alongside edit distance. Heavily
# mangled long words ("sparesaheet") land 4+ edits from the target, far past any
# safe edit cap, yet still score above this. Measured against a list of ordinary
# words that must not match — spread, sheets, worksheet, street, sweet, document
# — which produce no false positives at this threshold or below.
_SIMILARITY_FLOOR = 0.80
_SIMILARITY_MIN_LENGTH = 6


def _fuzzy_has(tokens: List[str], vocabulary: Tuple[str, ...]) -> bool:
    """
    True when any token matches a vocabulary word exactly or is a plausible
    misspelling of one.

    Two complementary tests, because neither covers the range alone:

      Edit distance catches light typos in short words — "excell", "wrod",
      "xlxs" — where a similarity ratio is unreliable at that length.

      Similarity ratio catches heavy typos in long words — "sparesaheet" is
      four edits from "spreadsheet", beyond any edit cap that stays safe, but
      still scores 0.82.

    Tokens of three characters or fewer must match exactly: at that length a
    single edit changes the word entirely, and "doc" would match "dog".
    """
    for token in tokens:
        for word in vocabulary:
            if token == word:
                return True
            if len(token) <= 3 or len(word) <= 3:
                continue

            allowed = 2 if min(len(token), len(word)) >= 8 else 1
            if _edit_distance(token, word, cap=allowed) <= allowed:
                return True

            if min(len(token), len(word)) >= _SIMILARITY_MIN_LENGTH:
                if difflib.SequenceMatcher(None, token, word).ratio() >= _SIMILARITY_FLOOR:
                    return True
    return False


def _fuzzy_has_phrase(tokens: List[str], first: str, followers: Tuple[str, ...]) -> bool:
    """
    True when `first` is immediately followed by one of `followers`.

    Adjacency matters for "word document". Matching the two words anywhere in
    the sentence fires on "in other words it is fine", because "fine" is a
    single edit from "file". Requiring them side by side keeps the real phrase
    and drops the coincidence.
    """
    for index, token in enumerate(tokens[:-1]):
        if _fuzzy_has([token], (first,)) and _fuzzy_has([tokens[index + 1]], followers):
            return True
    return False


def detect_deliverables(query: str) -> List[str]:
    """
    Returns every file format the query asks for: ['docx'], ['xlsx'],
    ['docx', 'xlsx'], or [].

    A list rather than one format because users legitimately ask for both at
    once ("a summary as docx and also a spreadsheet"). An earlier revision
    returned a single format and silently dropped the rest of the request.
    """
    if not query:
        return []

    tokens = _tokens(query)
    if not tokens:
        return []

    formats: List[str] = []

    wants_docx = _fuzzy_has(tokens, _DOCX_WORDS) or _fuzzy_has_phrase(
        tokens, "word", _WORD_NOUNS
    )
    if wants_docx:
        formats.append("docx")

    has_request_word = _fuzzy_has(tokens, _REQUEST_WORDS)
    wants_xlsx = _fuzzy_has(tokens, _XLSX_WORDS) or (
        has_request_word and _fuzzy_has(tokens, _WEAK_XLSX_WORDS)
    )
    if wants_xlsx:
        formats.append("xlsx")

    if not formats:
        return []

    # Naming a format is normally a request for it. The exception is a question
    # *about* the format. Requiring an explicit verb instead was too brittle —
    # it dropped "summarise as docx and xlsx", which names no verb from any
    # fixed list, and it broke again on every misspelled verb.
    is_question = tokens[0] in _DEFINITIONAL_OPENERS
    if is_question and not _fuzzy_has(tokens, _REQUEST_WORDS):
        return []

    return formats


def detect_deliverable(query: str) -> Optional[str]:
    """The primary requested format, or None. Used for prompt shaping."""
    formats = detect_deliverables(query)
    return formats[0] if formats else None


class TaskClassifier:
    """Classifies user queries and attached files into clean assistant workflow categories."""

    @staticmethod
    def classify(query: str, input_files: List[str]) -> TaskCategory:
        query_lower = query.lower()

        # Document analysis only when the user explicitly provides files.
        # A requested deliverable is layered on top of this by the planner
        # rather than replacing it, so "summarise this PDF as a docx" both
        # reads the file and writes the document.
        if input_files and len(input_files) > 0:
            return TaskCategory.DOCUMENT_ANALYSIS

        # Code execution in sandbox if explicitly asked
        if any(kw in query_lower for kw in ["run python", "run script", "execute python", "execute script", "execute code", "run in sandbox"]):
            return TaskCategory.SANDBOX_CODE_EXECUTION

        if detect_deliverable(query):
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
            steps = [
                PlanStep(
                    step_id=1,
                    title="Synthesize Content",
                    description="Synthesize document content using language model.",
                    assigned_tool="model_router_tool",
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

        # Prepend a knowledge base lookup only where it earns its place.
        # Document analysis already has the user's file as context and does not
        # need the corpus unless the question is about internal rules.
        if needs_knowledge_base(state.user_query) and category in (
            TaskCategory.GENERAL_REASONING,
            TaskCategory.DOCUMENT_ANALYSIS,
            TaskCategory.DOCUMENT_INSPECTION,
            TaskCategory.DELIVERABLE_GENERATION,
        ):
            steps.insert(
                0,
                PlanStep(
                    step_id=0,
                    title="Knowledge Base Retrieval",
                    description="Search local SOPs and manuals for passages relevant to the query.",
                    assigned_tool="rag_search_tool",
                ),
            )
            for idx, step in enumerate(steps, start=1):
                step.step_id = idx

        # Append an export step for every requested format. These run last so
        # they export the model's synthesised answer, and apply to any
        # category — a document analysis that asked for a .docx gets one.
        for deliverable in detect_deliverables(state.user_query):
            tool = "generate_xlsx_tool" if deliverable == "xlsx" else "generate_docx_tool"
            if any(s.assigned_tool == tool for s in steps):
                continue
            steps.append(
                PlanStep(
                    step_id=len(steps) + 1,
                    title=f"Generate {deliverable.upper()} File",
                    description=f"Export the synthesised content using {tool}.",
                    assigned_tool=tool,
                )
            )

        return category, steps
