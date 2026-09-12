import React, { useState, useRef, useCallback } from "react";
import {
  UploadCloud,
  FileText,
  X,
  ScanLine,
  CheckCircle2,
  RotateCcw,
  Square,
  AlertTriangle,
  ArrowRight,
  Activity,
  Calculator,
  Wifi,
} from "lucide-react";
import type { AgentState, HumanDecision } from "../types/agent";
import { DeliverablesPreview } from "./DeliverablesPreview";
import { AgentThinkingSteps } from "./AgentThinkingSteps";
import { sampleIndustrialScenarios } from "../services/api";

interface Props {
  state: AgentState | null;
  isRunning: boolean;
  error: string | null;
  onRunTask: (query: string, files: File[]) => void;
  onSubmitApproval?: (
    decision: HumanDecision,
    reviewer: string,
    comments?: string,
    modifications?: Record<string, unknown>
  ) => void;
  onReset: () => void;
  onStopTask?: () => void;
  onNavigateToNetwork?: () => void;
}

export const ScanWorkbench: React.FC<Props> = ({
  state,
  isRunning,
  error,
  onRunTask,
  onReset,
  onStopTask,
  onNavigateToNetwork,
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [query, setQuery] = useState("");
  const [activeQueryPrompt, setActiveQueryPrompt] = useState("");
  const [activeFilesList, setActiveFilesList] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    setFiles((prev) => [...prev, ...Array.from(incoming)]);
  };

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      addFiles(e.dataTransfer.files);
    },
    [files]
  );

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSelectScenario = (sc: (typeof sampleIndustrialScenarios)[0]) => {
    setQuery(sc.query);
  };

  const handleSubmit = async () => {
    if (!query.trim() || isRunning) return;
    setIsUploading(true);
    setActiveQueryPrompt(query);
    setActiveFilesList([...files]);
    try {
      await onRunTask(query, files);
    } finally {
      setIsUploading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleResetAll = () => {
    setFiles([]);
    setQuery("");
    setActiveQueryPrompt("");
    setActiveFilesList([]);
    onReset();
  };

  const activeModel = state?.findings?.model_used || "Qwen2.5-7B-Instruct (Q4_K_M)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", width: "100%", maxWidth: "1280px", margin: "0 auto", paddingBottom: "3rem" }}>
      {/* ── Error Banner ── */}
      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "0.75rem",
            padding: "1rem 1.25rem",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "8px",
          }}
        >
          <AlertTriangle size={18} color="var(--red-500)" style={{ flexShrink: 0, marginTop: "2px" }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--red-500)", marginBottom: "0.2rem" }}>
              Error
            </p>
            <p style={{ fontSize: "0.825rem", color: "var(--text-primary)" }}>{error}</p>
          </div>
          <button className="btn btn--secondary" style={{ padding: "0.3rem 0.75rem", fontSize: "0.75rem" }} onClick={handleResetAll}>
            Dismiss
          </button>
        </div>
      )}

      {/* ── Welcome / Scenario Starters ── */}
      {!state && !isRunning && (
        <div className="panel" style={{ padding: "1.75rem", background: "#ffffff" }}>
          <div style={{ maxWidth: "680px", margin: "0 auto 1.5rem auto" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--brand-navy)", marginBottom: "0.35rem" }}>
              What do you need?
            </h2>
            <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
              Ask a question, attach a document, or pick a scenario below.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem", color: "var(--text-muted)" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 600, letterSpacing: "0.02em" }}>
              Example prompts
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem" }}>
            {sampleIndustrialScenarios.map((sc) => (
              <button
                key={sc.id}
                onClick={() => handleSelectScenario(sc)}
                style={{
                  textAlign: "left",
                  padding: "0.85rem 1rem",
                  background: query === sc.query ? "#f0f9ff" : "var(--bg-raised)",
                  border: "1px solid",
                  borderColor: query === sc.query ? "#bae6fd" : "var(--border-dim)",
                  borderRadius: "8px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ fontSize: "0.825rem", fontWeight: 700, color: "var(--brand-navy)", marginBottom: "0.3rem" }}>
                  {sc.title}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                  {sc.query}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Active Conversation Stream ── */}
      {(activeQueryPrompt || state || isRunning) && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* User Message */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              background: "#ffffff",
              border: "1px solid var(--border-dim)",
              borderRadius: "10px",
              padding: "1rem 1.25rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.725rem", fontWeight: 600, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                You
              </span>
              <button
                onClick={handleResetAll}
                className="btn btn--secondary"
                style={{ padding: "0.25rem 0.6rem", fontSize: "0.725rem", display: "flex", alignItems: "center", gap: "0.3rem" }}
              >
                <RotateCcw size={12} /> New conversation
              </button>
            </div>

            <div style={{ fontSize: "0.925rem", color: "var(--brand-navy)", fontWeight: 500, lineHeight: 1.5 }}>
              {activeQueryPrompt || state?.user_query}
            </div>

            {/* Attached file chips */}
            {(activeFilesList.length > 0 || (state?.input_files && state.input_files.length > 0)) && (
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.15rem" }}>
                {(activeFilesList.length > 0 ? activeFilesList.map((f) => f.name) : state?.input_files || []).map((name, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      background: "var(--bg-raised)",
                      border: "1px solid var(--border-dim)",
                      borderRadius: "5px",
                      padding: "0.2rem 0.55rem",
                      fontSize: "0.725rem",
                      color: "var(--text-secondary)",
                      fontWeight: 500,
                    }}
                  >
                    <FileText size={13} />
                    <span>{name.split("/").pop()?.split("\\").pop()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Agent Thinking Steps */}
          <AgentThinkingSteps
            state={state}
            isRunning={isRunning}
            activeQuery={activeQueryPrompt || state?.user_query || ""}
            defaultExpanded={isRunning}
          />

          {/* Stop Button while running */}
          {isRunning && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.65rem 1rem",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "8px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--red-500)" }}>
                <Activity size={15} style={{ animation: "spin 1.5s linear infinite" }} />
                <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>
                  Generating response...
                </span>
              </div>

              {onStopTask && (
                <button
                  onClick={onStopTask}
                  className="btn btn--danger"
                  style={{ padding: "0.35rem 0.85rem", fontSize: "0.775rem", display: "flex", alignItems: "center", gap: "0.35rem" }}
                >
                  <Square size={12} fill="currentColor" />
                  <span>Stop</span>
                </button>
              )}
            </div>
          )}

          {/* ── RESPONSE AREA (flat, no outer card wrapper) ── */}
          {state && !isRunning && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {/* Response Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                  paddingBottom: "0.75rem",
                  borderBottom: "1px solid var(--border-dim)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <CheckCircle2 size={18} color="var(--green-600)" />
                  <div>
                    <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--brand-navy)" }}>
                      Response
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: "0.75rem" }}>
                      Model: <strong style={{ color: "var(--text-secondary)" }}>{activeModel}</strong>
                    </span>
                  </div>
                </div>

                {onNavigateToNetwork && (
                  <button
                    onClick={onNavigateToNetwork}
                    className="btn btn--secondary"
                    style={{ fontSize: "0.725rem", padding: "0.3rem 0.65rem", display: "flex", alignItems: "center", gap: "0.35rem" }}
                  >
                    <Wifi size={13} /> Network audit
                  </button>
                )}
              </div>

              {/* 1. WRITTEN ANSWER — plain formatted text, no card wrapper */}
              <div
                style={{
                  fontSize: "0.9rem",
                  color: "#1e293b",
                  lineHeight: 1.7,
                  whiteSpace: "pre-wrap",
                }}
              >
                {state.text_response || state.findings?.synthesized_analysis || "Analysis completed."}
              </div>

              {/* 2. CALCULATION STEPS (if applicable) */}
              {state.calculation_details && (
                <div
                  style={{
                    background: "#ffffff",
                    border: "1px solid #bae6fd",
                    borderRadius: "8px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.65rem 1rem",
                      background: "#f0f9ff",
                      borderBottom: "1px solid #bae6fd",
                    }}
                  >
                    <Calculator size={16} color="var(--brand-blue)" />
                    <span style={{ fontSize: "0.825rem", fontWeight: 700, color: "var(--brand-navy)" }}>
                      {state.calculation_details.standard || "Engineering Calculation"}
                    </span>
                  </div>

                  <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {state.calculation_details.formula && (
                      <div style={{ background: "#f8fafc", border: "1px solid var(--border-dim)", borderRadius: "6px", padding: "0.6rem 0.85rem", fontFamily: "var(--font-mono)", fontSize: "0.825rem", color: "var(--brand-blue)", fontWeight: 600 }}>
                        Formula: {state.calculation_details.formula}
                      </div>
                    )}

                    {state.calculation_details.steps && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {state.calculation_details.steps.map((st, i) => (
                          <div
                            key={i}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "0.55rem 0.85rem",
                              background: i % 2 === 0 ? "#ffffff" : "#f8fafc",
                              border: "1px solid var(--border-dim)",
                              borderRadius: "6px",
                              fontSize: "0.8rem",
                            }}
                          >
                            <span style={{ fontWeight: 600, color: "var(--brand-navy)" }}>
                              Step {st.step}: {st.title}
                            </span>
                            <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                              {st.formula}
                            </span>
                            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--brand-blue)" }}>
                              = {st.result}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {state.calculation_details.verdict && (
                      <div
                        style={{
                          padding: "0.6rem 0.85rem",
                          background: "#fffbe6",
                          border: "1px solid #ffe58f",
                          borderRadius: "6px",
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          color: "#d48806",
                        }}
                      >
                        Verdict: {state.calculation_details.verdict}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 3. MULTI-DOCUMENT COMPARISON TABLE (if applicable) */}
              {state.multi_doc_comparison && (
                <div
                  style={{
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.65rem 1rem",
                      background: "#f1f5f9",
                      borderBottom: "1px solid #cbd5e1",
                    }}
                  >
                    <span style={{ fontSize: "0.825rem", fontWeight: 700, color: "var(--brand-navy)" }}>
                      Document Comparison
                    </span>
                    <span style={{ fontSize: "0.725rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                      {state.multi_doc_comparison.doc1} ⟷ {state.multi_doc_comparison.doc2}
                    </span>
                  </div>

                  <div style={{ overflowX: "auto", padding: "0.5rem" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", textAlign: "left" }}>
                      <thead>
                        <tr style={{ background: "#f8fafc", borderBottom: "1px solid var(--border-dim)" }}>
                          <th style={{ padding: "0.55rem 0.75rem" }}>Parameter</th>
                          <th style={{ padding: "0.55rem 0.75rem" }}>Baseline</th>
                          <th style={{ padding: "0.55rem 0.75rem" }}>Current</th>
                          <th style={{ padding: "0.55rem 0.75rem" }}>Variance</th>
                          <th style={{ padding: "0.55rem 0.75rem" }}>Risk</th>
                        </tr>
                      </thead>
                      <tbody>
                        {state.multi_doc_comparison.metrics?.map((m, i) => (
                          <tr key={i} style={{ borderBottom: "1px solid var(--border-dim)" }}>
                            <td style={{ padding: "0.55rem 0.75rem", fontWeight: 600 }}>{m.parameter}</td>
                            <td style={{ padding: "0.55rem 0.75rem" }}>{m.baseline}</td>
                            <td style={{ padding: "0.55rem 0.75rem" }}>{m.current}</td>
                            <td style={{ padding: "0.55rem 0.75rem", color: "var(--brand-blue)", fontFamily: "var(--font-mono)", fontWeight: 600 }}>{m.variance}</td>
                            <td style={{ padding: "0.55rem 0.75rem" }}>
                              <span style={{
                                padding: "0.1rem 0.4rem",
                                borderRadius: "4px",
                                fontSize: "0.7rem",
                                fontWeight: 700,
                                background: m.severity === "CRITICAL" ? "#fee2e2" : "#fef3c7",
                                color: m.severity === "CRITICAL" ? "#dc2626" : "#b45309",
                              }}>
                                {m.severity}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 4. DELIVERABLES (DOCX/XLSX/SANDBOX) */}
              <DeliverablesPreview state={state} />

              {/* 5. CITATIONS — compact list, not card grid */}
              {state.retrieved_evidence && state.retrieved_evidence.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--brand-navy)", marginBottom: "0.15rem" }}>
                    Citations ({state.retrieved_evidence.length})
                  </div>
                  {state.retrieved_evidence.slice(0, 6).map((ev, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: "0.5rem",
                        padding: "0.4rem 0",
                        borderBottom: i < Math.min(state.retrieved_evidence!.length, 6) - 1 ? "1px solid var(--border-dim)" : "none",
                        fontSize: "0.775rem",
                      }}
                    >
                      <span style={{ fontWeight: 600, color: "var(--brand-navy)", flexShrink: 0 }}>
                        {ev.source_doc}{ev.page_num ? ` p.${ev.page_num}` : ""}
                      </span>
                      {ev.is_fallback && (
                        <span style={{
                          fontSize: "0.625rem",
                          fontWeight: 700,
                          padding: "1px 5px",
                          borderRadius: "3px",
                          background: "#fef3c7",
                          color: "#92400e",
                          border: "1px solid #fde68a",
                          flexShrink: 0,
                        }}>
                          FALLBACK
                        </span>
                      )}
                      <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
                        "{ev.snippet}"
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Chat Input Box ── */}
      <div
        className="panel"
        style={{
          padding: "1rem",
          background: "#ffffff",
          boxShadow: "var(--shadow-card)",
          border: "1px solid var(--border-base)",
          borderRadius: "10px",
        }}
      >
        {/* File Dropzone & Chips */}
        <div style={{ marginBottom: "0.75rem" }}>
          {files.length > 0 ? (
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: "0.725rem", fontWeight: 600, color: "var(--text-muted)" }}>Attached:</span>
              {files.map((f, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    background: "var(--bg-raised)",
                    border: "1px solid var(--border-dim)",
                    borderRadius: "5px",
                    padding: "0.25rem 0.55rem",
                    fontSize: "0.725rem",
                  }}
                >
                  <FileText size={13} color="var(--brand-blue)" />
                  <span style={{ maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                  <button
                    onClick={() => removeFile(i)}
                    style={{ background: "transparent", border: "none", cursor: "pointer", padding: "1px", display: "flex" }}
                  >
                    <X size={12} color="var(--text-muted)" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => inputRef.current?.click()}
                className="btn btn--secondary"
                style={{ padding: "0.2rem 0.5rem", fontSize: "0.675rem" }}
              >
                + Add
              </button>
            </div>
          ) : (
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              style={{
                border: "1px dashed",
                borderColor: dragging ? "var(--brand-blue)" : "var(--border-dim)",
                borderRadius: "6px",
                padding: "0.5rem 0.85rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                color: "var(--text-muted)",
                fontSize: "0.75rem",
                background: dragging ? "#f0f9ff" : "transparent",
              }}
            >
              <UploadCloud size={15} color="var(--brand-blue)" />
              <span>Attach files (PDFs, images, CSVs) — optional</span>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            multiple
            style={{ display: "none" }}
            onChange={(e) => addFiles(e.target.files)}
          />
        </div>

        {/* Textarea + Actions */}
        <div style={{ display: "flex", gap: "0.65rem", alignItems: "flex-end" }}>
          <textarea
            className="input-base"
            rows={2}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isRunning}
            placeholder="Ask a question or describe a task... (Enter to send)"
            style={{
              flex: 1,
              resize: "none",
              borderRadius: "8px",
              padding: "0.65rem 0.85rem",
              fontSize: "0.85rem",
              lineHeight: 1.4,
            }}
          />

          <div style={{ display: "flex", gap: "0.5rem" }}>
            {isRunning ? (
              onStopTask && (
                <button
                  className="btn btn--danger"
                  onClick={onStopTask}
                  style={{ padding: "0.65rem 1rem", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.35rem" }}
                >
                  <Square size={13} fill="currentColor" />
                  <span>Stop</span>
                </button>
              )
            ) : (
              <button
                className="btn btn--primary"
                disabled={!query.trim() || isUploading}
                onClick={handleSubmit}
                style={{ padding: "0.65rem 1.25rem", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.35rem" }}
              >
                <ScanLine size={15} />
                <span>{isUploading ? "Uploading..." : "Send"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
