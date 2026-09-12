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
  Zap,
  Cpu,
  ShieldCheck,
  ArrowRight,
  Activity,
  Calculator,
  Layers,
  BookOpen,
  Wifi,
} from "lucide-react";
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';
import './markdown.css';
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
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", width: "100%", maxWidth: "1280px", margin: "0 auto", paddingBottom: "3rem" }}>
      {/* ── Top Sovereignty Proof Bar ── */}
      <div
        className="panel"
        style={{
          padding: "0.85rem 1.25rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.75rem",
          background: "linear-gradient(90deg, #ffffff 0%, #f8fafc 100%)",
          border: "1px solid var(--border-dim)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "6px",
              background: "#0f172a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <ShieldCheck size={16} color="#38bdf8" />
          </div>
          <div>
            <div style={{ fontSize: "0.825rem", fontWeight: 700, color: "var(--brand-navy)" }}>
              SOVEREIGN ON-PREMISE AIR-GAPPED ASSISTANT
            </div>
            <div style={{ fontSize: "0.725rem", color: "var(--text-muted)" }}>
              Zero telemetry egress • Local Ollama models & CPU Tesseract OCR • 100% on-hardware
            </div>
          </div>
        </div>

        {onNavigateToNetwork && (
          <button
            onClick={onNavigateToNetwork}
            className="btn btn--secondary"
            style={{
              fontSize: "0.775rem",
              padding: "0.4rem 0.85rem",
              display: "flex",
              alignItems: "center",
              gap: "0.45rem",
              borderColor: "#bbf7d0",
              background: "#f0fdf4",
              color: "var(--green-600)",
              fontWeight: 600,
            }}
          >
            <Wifi size={14} />
            <span>Air-Gap Network Audit (Live psutil)</span>
            <ArrowRight size={13} />
          </button>
        )}
      </div>

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
              Execution Notice
            </p>
            <p style={{ fontSize: "0.825rem", color: "var(--text-primary)" }}>{error}</p>
          </div>
          <button className="btn btn--secondary" style={{ padding: "0.3rem 0.75rem", fontSize: "0.75rem" }} onClick={handleResetAll}>
            Dismiss
          </button>
        </div>
      )}

      {/* ── Conversational View Area ── */}
      {!state && !isRunning && (
        /* Welcome / Scenario Starters */
        <div className="panel" style={{ padding: "1.75rem", background: "#ffffff" }}>
          <div style={{ textAlign: "center", maxWidth: "680px", margin: "0 auto 1.75rem auto" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1rem auto",
                boxShadow: "0 4px 12px rgba(15, 23, 42, 0.15)",
              }}
            >
              <ShieldCheck size={26} color="#ffffff" />
            </div>
            <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--brand-navy)", marginBottom: "0.5rem" }}>
              How can KAVACH AI assist your inspection today?
            </h2>
            <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
              Ask an engineering query, request statutory derating calculations, analyze ultrasonic scans, or compare multi-document maintenance records under zero-cloud isolation.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.85rem", color: "var(--brand-navy)" }}>
            <Zap size={15} color="var(--brand-blue)" />
            <span style={{ fontSize: "0.825rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Quick Scenario Starters (Single-Click Load)
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

      {/* ── Active Conversation Stream (Prompt + Live Agent Response) ── */}
      {(activeQueryPrompt || state || isRunning) && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* User Prompt Message Card */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.6rem",
              background: "#ffffff",
              border: "1px solid var(--border-dim)",
              borderRadius: "10px",
              padding: "1.25rem 1.5rem",
              boxShadow: "0 2px 6px rgba(0, 0, 0, 0.03)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                User Directives & Ingested Query
              </span>
              <button
                onClick={handleResetAll}
                className="btn btn--secondary"
                style={{ padding: "0.25rem 0.6rem", fontSize: "0.725rem", display: "flex", alignItems: "center", gap: "0.3rem" }}
              >
                <RotateCcw size={12} /> Start New Inspection
              </button>
            </div>

            <div style={{ fontSize: "0.95rem", color: "var(--brand-navy)", fontWeight: 600, lineHeight: 1.5 }}>
              "{activeQueryPrompt || state?.user_query}"
            </div>

            {/* Attached file badges */}
            {(activeFilesList.length > 0 || (state?.input_files && state.input_files.length > 0)) && (
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.3rem" }}>
                {(activeFilesList.length > 0 ? activeFilesList.map((f) => f.name) : state?.input_files || []).map((name, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      background: "#f0f9ff",
                      border: "1px solid #bae6fd",
                      borderRadius: "6px",
                      padding: "0.3rem 0.65rem",
                      fontSize: "0.75rem",
                      color: "var(--brand-blue)",
                      fontWeight: 600,
                    }}
                  >
                    <FileText size={14} />
                    <span>{name.split("/").pop()?.split("\\").pop()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Live Agent Thinking & Execution State */}
          <AgentThinkingSteps
            state={state}
            isRunning={isRunning}
            activeQuery={activeQueryPrompt || state?.user_query || ""}
            defaultExpanded={isRunning}
          />

          {/* Stop Button Banner while running */}
          {isRunning && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.75rem 1.25rem",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "8px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", color: "var(--red-600)" }}>
                <Activity size={16} style={{ animation: "spin 1.5s linear infinite" }} />
                <span style={{ fontSize: "0.825rem", fontWeight: 600 }}>
                  Agent is generating response and executing local tools...
                </span>
              </div>

              {onStopTask && (
                <button
                  onClick={onStopTask}
                  className="btn btn--danger"
                  style={{ padding: "0.4rem 1rem", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.4rem" }}
                >
                  <Square size={13} fill="currentColor" />
                  <span>Stop Generation</span>
                </button>
              )}
            </div>
          )}

          {/* ── THE SINGLE UNIFIED RESPONSE CARD ── */}
          {state && !isRunning && (
            <div
              className="panel"
              style={{
                background: "#ffffff",
                padding: "1.75rem",
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem",
                border: "1px solid var(--border-base)",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.05)",
              }}
            >
              {/* Response Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "0.75rem",
                  borderBottom: "1px solid var(--border-dim)",
                  paddingBottom: "1rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div
                    style={{
                      width: "38px",
                      height: "38px",
                      borderRadius: "8px",
                      background: "#f0fdf4",
                      border: "1px solid #bbf7d0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <CheckCircle2 size={20} color="var(--green-600)" />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--brand-navy)" }}>
                      Sovereign Agent Response
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                        <Cpu size={13} color="var(--brand-blue)" />
                        Model: <strong style={{ color: "var(--brand-navy)" }}>{activeModel}</strong>
                      </span>
                      <span>•</span>
                      <span style={{ color: "var(--green-600)", fontWeight: 600 }}>0 Cloud Egress</span>
                    </div>
                  </div>
                </div>

                {onNavigateToNetwork && (
                  <button
                    onClick={onNavigateToNetwork}
                    className="btn btn--secondary"
                    style={{ fontSize: "0.75rem", padding: "0.35rem 0.75rem" }}
                  >
                    <Wifi size={13} /> View Live Sockets
                  </button>
                )}
              </div>

              {/* 1. WRITTEN ANSWER (ALWAYS PRESENT) */}
              <div
                className="markdown-body"
                style={{
                  fontSize: "0.925rem",
                  color: "#1e293b",
                  lineHeight: 1.7,
                  background: "#f8fafc",
                  border: "1px solid var(--border-dim)",
                  borderRadius: "8px",
                  padding: "1.5rem",
                }}
              >
                <ReactMarkdown children={state.text_response || state.findings?.synthesized_analysis || "Inspection analysis completed."} rehypePlugins={[rehypeHighlight]} />
              </div>

              {/* 2. VISIBLE STEP-BY-STEP CALCULATION CARD (IF APPLICABLE) */}
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
                      padding: "0.75rem 1.25rem",
                      background: "#f0f9ff",
                      borderBottom: "1px solid #bae6fd",
                    }}
                  >
                    <Calculator size={17} color="var(--brand-blue)" />
                    <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--brand-navy)" }}>
                      {state.calculation_details.standard || "Statutory Engineering Calculation"}
                    </span>
                  </div>

                  <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {state.calculation_details.formula && (
                      <div style={{ background: "#f8fafc", border: "1px solid var(--border-dim)", borderRadius: "6px", padding: "0.75rem 1rem", fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: "var(--brand-blue)", fontWeight: 600 }}>
                        Governing Formula: {state.calculation_details.formula}
                      </div>
                    )}

                    {state.calculation_details.steps && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                        {state.calculation_details.steps.map((st, i) => (
                          <div
                            key={i}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "0.65rem 1rem",
                              background: i % 2 === 0 ? "#ffffff" : "#f8fafc",
                              border: "1px solid var(--border-dim)",
                              borderRadius: "6px",
                              fontSize: "0.825rem",
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
                          padding: "0.75rem 1rem",
                          background: "#fffbe6",
                          border: "1px solid #ffe58f",
                          borderRadius: "6px",
                          fontSize: "0.825rem",
                          fontWeight: 700,
                          color: "#d48806",
                        }}
                      >
                        Statutory Verdict: {state.calculation_details.verdict}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 3. MULTI-DOCUMENT COMPARATIVE MATRIX (IF APPLICABLE) */}
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
                      padding: "0.75rem 1.25rem",
                      background: "#f1f5f9",
                      borderBottom: "1px solid #cbd5e1",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <Layers size={17} color="var(--brand-navy)" />
                      <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--brand-navy)" }}>
                        Multi-Document Variance Analysis
                      </span>
                    </div>
                    <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                      {state.multi_doc_comparison.doc1} ⟷ {state.multi_doc_comparison.doc2}
                    </span>
                  </div>

                  <div style={{ overflowX: "auto", padding: "0.75rem" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.825rem", textAlign: "left" }}>
                      <thead>
                        <tr style={{ background: "#f8fafc", borderBottom: "1px solid var(--border-dim)" }}>
                          <th style={{ padding: "0.6rem 0.85rem" }}>Inspection Parameter</th>
                          <th style={{ padding: "0.6rem 0.85rem" }}>Baseline Record</th>
                          <th style={{ padding: "0.6rem 0.85rem" }}>Current Record</th>
                          <th style={{ padding: "0.6rem 0.85rem" }}>Variance / Progression</th>
                          <th style={{ padding: "0.6rem 0.85rem" }}>Risk Level</th>
                        </tr>
                      </thead>
                      <tbody>
                        {state.multi_doc_comparison.metrics?.map((m, i) => (
                          <tr key={i} style={{ borderBottom: "1px solid var(--border-dim)" }}>
                            <td style={{ padding: "0.6rem 0.85rem", fontWeight: 600 }}>{m.parameter}</td>
                            <td style={{ padding: "0.6rem 0.85rem" }}>{m.baseline}</td>
                            <td style={{ padding: "0.6rem 0.85rem" }}>{m.current}</td>
                            <td style={{ padding: "0.6rem 0.85rem", color: "var(--brand-blue)", fontFamily: "var(--font-mono)", fontWeight: 600 }}>{m.variance}</td>
                            <td style={{ padding: "0.6rem 0.85rem" }}>
                              <span style={{ padding: "0.15rem 0.45rem", borderRadius: "4px", fontSize: "0.7rem", fontWeight: 700, background: m.severity === "CRITICAL" ? "#fee2e2" : "#fef3c7", color: m.severity === "CRITICAL" ? "#dc2626" : "#b45309" }}>
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

              {/* 4. ATTACHED DELIVERABLES (DOCX / XLSX / SANDBOX ARTIFACTS ONLY IF GENERATED) */}
              <DeliverablesPreview state={state} />

              {/* 5. SOP CITATIONS & STATUTORY GROUNDING */}
              {state.retrieved_evidence && state.retrieved_evidence.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.825rem", fontWeight: 700, color: "var(--brand-navy)" }}>
                    <BookOpen size={15} color="var(--brand-blue)" />
                    <span>Grounded SOP Evidence Citations ({state.retrieved_evidence.length})</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "0.6rem" }}>
                    {state.retrieved_evidence.slice(0, 4).map((ev, i) => (
                      <div
                        key={i}
                        style={{
                          padding: "0.75rem 1rem",
                          background: "var(--bg-raised)",
                          border: "1px solid var(--border-dim)",
                          borderRadius: "6px",
                          fontSize: "0.775rem",
                        }}
                      >
                        <div style={{ fontWeight: 700, color: "var(--brand-navy)", marginBottom: "0.2rem" }}>
                          {ev.source_doc} {ev.page_num ? `(Page ${ev.page_num})` : ""}
                        </div>
                        <div style={{ color: "var(--text-muted)", fontStyle: "italic", lineHeight: 1.4 }}>
                          "{ev.snippet}"
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Single Unified Chat Input Box (Pinned / Accessible) ── */}
      <div
        className="panel"
        style={{
          padding: "1.25rem",
          background: "#ffffff",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
          border: "1px solid var(--border-base)",
          borderRadius: "10px",
        }}
      >
        {/* File Dropzone & Chips Strip */}
        <div style={{ marginBottom: "0.85rem" }}>
          {files.length > 0 ? (
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)" }}>Attached:</span>
              {files.map((f, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    background: "var(--bg-raised)",
                    border: "1px solid var(--border-dim)",
                    borderRadius: "6px",
                    padding: "0.3rem 0.65rem",
                    fontSize: "0.75rem",
                  }}
                >
                  <FileText size={14} color="var(--brand-blue)" />
                  <span style={{ maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                  <button
                    onClick={() => removeFile(i)}
                    style={{ background: "transparent", border: "none", cursor: "pointer", padding: "1px", display: "flex" }}
                  >
                    <X size={13} color="var(--text-muted)" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => inputRef.current?.click()}
                className="btn btn--secondary"
                style={{ padding: "0.25rem 0.55rem", fontSize: "0.7rem" }}
              >
                + Add More
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
                padding: "0.6rem 1rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                color: "var(--text-muted)",
                fontSize: "0.775rem",
                background: dragging ? "#f0f9ff" : "transparent",
              }}
            >
              <UploadCloud size={16} color="var(--brand-blue)" />
              <span>Attach inspection reports, scanned PDFs, images, or telemetry CSVs (optional)</span>
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

        {/* Textarea Input + Action Controls */}
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end" }}>
          <textarea
            className="input-base"
            rows={2}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isRunning}
            placeholder="Ask an inspection question, request statutory derating calculation, or enter directives (Press Enter to Send)..."
            style={{
              flex: 1,
              resize: "none",
              borderRadius: "8px",
              padding: "0.75rem 1rem",
              fontSize: "0.875rem",
              lineHeight: 1.4,
            }}
          />

          <div style={{ display: "flex", gap: "0.5rem" }}>
            {isRunning ? (
              onStopTask && (
                <button
                  className="btn btn--danger"
                  onClick={onStopTask}
                  style={{ padding: "0.75rem 1.25rem", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.4rem" }}
                >
                  <Square size={14} fill="currentColor" />
                  <span>Stop</span>
                </button>
              )
            ) : (
              <button
                className="btn btn--primary"
                disabled={!query.trim() || isUploading}
                onClick={handleSubmit}
                style={{ padding: "0.75rem 1.5rem", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.4rem" }}
              >
                <ScanLine size={16} />
                <span>{isUploading ? "Uploading..." : "Send Prompt"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
