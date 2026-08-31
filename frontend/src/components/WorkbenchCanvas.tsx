import React, { useState } from "react";
import {
  Play,
  FileUp,
  Clock,
  Zap,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  Layers,
  FileCheck,
  FileSignature,
  Activity,
  Cpu,
  ShieldCheck,
  Wrench,
  BookOpen,
} from "lucide-react";
import { AgentState, HumanDecision } from "../types/agent";
import { sampleIndustrialScenarios } from "../services/api";
import { DeliverablesPreview } from "./DeliverablesPreview";
import { VerificationBadge } from "./VerificationBadge";
import { HumanApprovalModal } from "./HumanApprovalModal";

interface WorkbenchCanvasProps {
  state: AgentState | null;
  isRunning: boolean;
  onRunTask: (query: string, files: string[]) => void;
  onSubmitApproval: (
    decision: HumanDecision,
    reviewer: string,
    comments?: string,
    modifications?: Record<string, any>
  ) => void;
}

export const WorkbenchCanvas: React.FC<WorkbenchCanvasProps> = ({
  state,
  isRunning,
  onRunTask,
  onSubmitApproval,
}) => {
  const [query, setQuery] = useState(
    sampleIndustrialScenarios[0].query
  );
  const [selectedFiles, setSelectedFiles] = useState<string[]>(
    sampleIndustrialScenarios[0].files
  );
  const [expandedToolId, setExpandedToolId] = useState<string | null>(null);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);

  const handleSelectScenario = (sc: (typeof sampleIndustrialScenarios)[0]) => {
    setQuery(sc.query);
    setSelectedFiles(sc.files);
  };

  const handleExecute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isRunning) return;
    onRunTask(query, selectedFiles);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Top Banner: Preset Industrial Scenarios */}
      <div className="glass-panel" style={{ padding: "1.25rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "0.75rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Zap size={16} color="#fbbf24" />
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f1f5f9" }}>
              PRESET INDUSTRIAL & PSU AGENT SCENARIOS
            </span>
          </div>
          <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
            Click any scenario to auto-fill query and confidential document context
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "0.75rem",
          }}
        >
          {sampleIndustrialScenarios.map((sc) => (
            <button
              key={sc.id}
              onClick={() => handleSelectScenario(sc)}
              className="glass-panel-interactive"
              style={{
                padding: "0.85rem",
                textAlign: "left",
                cursor: "pointer",
                border: query === sc.query ? "1px solid #10b981" : "1px solid #1e293b",
                background: query === sc.query ? "rgba(16, 185, 129, 0.1)" : "#0e1629",
              }}
            >
              <div
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  color: query === sc.query ? "#34d399" : "#f1f5f9",
                  marginBottom: "0.25rem",
                }}
              >
                {sc.title}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  fontSize: "0.7rem",
                  color: "#94a3b8",
                }}
              >
                <span className="badge-tag">{sc.category}</span>
                <span>• {sc.files.length} attached docs</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Studio Grid: Input & Execution Plan */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 0.9fr",
          gap: "1.5rem",
        }}
      >
        {/* LEFT COLUMN: Prompt & Input Studio */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <form onSubmit={handleExecute} className="glass-panel" style={{ padding: "1.5rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "1rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Layers size={18} color="#38bdf8" />
                <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#f1f5f9" }}>
                  Autonomous Agent Instruction
                </h3>
              </div>
              <span className="badge-sovereign">
                <ShieldCheck size={12} /> ON-PREMISE REASONING
              </span>
            </div>

            {/* Textarea */}
            <div style={{ marginBottom: "1rem" }}>
              <textarea
                rows={5}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter industrial instruction (e.g. review inspection report, execute code sandbox, search SOPs)..."
                style={{
                  width: "100%",
                  background: "#080d1a",
                  border: "1px solid #27354f",
                  borderRadius: "8px",
                  padding: "0.85rem",
                  color: "#f1f5f9",
                  fontSize: "0.85rem",
                  lineHeight: "1.5",
                  outline: "none",
                  resize: "vertical",
                }}
              />
            </div>

            {/* Attached Confidential Files */}
            <div style={{ marginBottom: "1.25rem" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "0.5rem",
                }}
              >
                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#94a3b8" }}>
                  ATTACHED ON-PREMISE ASSETS (P&ID, SCANNED PDFs, TELEMETRY)
                </span>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    fontSize: "0.75rem",
                    color: "#38bdf8",
                    cursor: "pointer",
                  }}
                >
                  <FileUp size={14} /> Add Local File
                  <input
                    type="file"
                    multiple
                    style={{ display: "none" }}
                    onChange={(e) => {
                      if (e.target.files) {
                        const names = Array.from(e.target.files).map((f) => f.name);
                        setSelectedFiles([...selectedFiles, ...names]);
                      }
                    }}
                  />
                </label>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {selectedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      padding: "0.3rem 0.65rem",
                      background: "#0c1424",
                      border: "1px solid #1e293b",
                      borderRadius: "6px",
                      fontSize: "0.75rem",
                      color: "#e2e8f0",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    <FileCheck size={14} color="#10b981" />
                    <span>{file}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedFiles(selectedFiles.filter((_, i) => i !== idx))
                      }
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#64748b",
                        cursor: "pointer",
                        marginLeft: "0.2rem",
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Launch Button & Status */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderTop: "1px solid #1e293b",
                paddingTop: "1.25rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Activity size={16} color="#34d399" />
                <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                  Model Auto-Selector: <strong>Dynamic Local Routing</strong>
                </span>
              </div>

              <button
                type="submit"
                disabled={isRunning}
                className="btn-primary"
                style={{
                  opacity: isRunning ? 0.7 : 1,
                  cursor: isRunning ? "not-allowed" : "pointer",
                }}
              >
                {isRunning ? (
                  <>
                    <span className="animate-spin-slow">⏳</span>
                    <span>Executing Sovereign Agent...</span>
                  </>
                ) : (
                  <>
                    <Play size={16} />
                    <span>Launch Autonomous Plan</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Verification Badge */}
          {state && <VerificationBadge verification={state.verification} />}
        </div>

        {/* RIGHT COLUMN: Step-by-Step Plan & Execution State */}
        <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1.25rem",
              borderBottom: "1px solid #1e293b",
              paddingBottom: "0.75rem",
            }}
          >
            <div>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#f1f5f9" }}>
                Multi-Step Execution State Machine
              </h3>
              <p style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                Task ID:{" "}
                <span className="font-mono" style={{ color: "#38bdf8" }}>
                  {state ? state.task_id : "Awaiting launch"}
                </span>
              </p>
            </div>

            {state && (
              <span
                style={{
                  padding: "0.25rem 0.65rem",
                  borderRadius: "9999px",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  background:
                    state.status === "COMPLETED"
                      ? "rgba(16, 185, 129, 0.2)"
                      : state.status === "AWAITING_APPROVAL"
                      ? "rgba(245, 158, 11, 0.2)"
                      : "rgba(59, 130, 246, 0.2)",
                  color:
                    state.status === "COMPLETED"
                      ? "#34d399"
                      : state.status === "AWAITING_APPROVAL"
                      ? "#fbbf24"
                      : "#60a5fa",
                  border: "1px solid currentColor",
                }}
              >
                {state.status}
              </span>
            )}
          </div>

          {/* Steps List */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
              maxHeight: "480px",
              overflowY: "auto",
              paddingRight: "0.25rem",
            }}
          >
            {state && state.plan.length > 0 ? (
              state.plan.map((step) => {
                const toolCall = state.tool_calls.find((tc) => tc.step_id === step.step_id);
                const isExpanded = expandedToolId === `step_${step.step_id}`;

                return (
                  <div
                    key={step.step_id}
                    style={{
                      background: "#0c1322",
                      border:
                        step.status === "COMPLETED"
                          ? "1px solid #1e293b"
                          : step.status === "IN_PROGRESS"
                          ? "1px solid #3b82f6"
                          : "1px solid #1e293b",
                      borderRadius: "8px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      onClick={() =>
                        setExpandedToolId(isExpanded ? null : `step_${step.step_id}`)
                      }
                      style={{
                        padding: "0.75rem 1rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        cursor: "pointer",
                        background:
                          step.status === "IN_PROGRESS"
                            ? "rgba(59, 130, 246, 0.1)"
                            : "transparent",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        {step.status === "COMPLETED" ? (
                          <CheckCircle2 size={18} color="#10b981" />
                        ) : step.status === "IN_PROGRESS" ? (
                          <span className="animate-spin-slow" style={{ fontSize: "1rem" }}>
                            ⚙️
                          </span>
                        ) : step.status === "FAILED" ? (
                          <AlertCircle size={18} color="#ef4444" />
                        ) : (
                          <div
                            style={{
                              width: "18px",
                              height: "18px",
                              borderRadius: "50%",
                              border: "2px solid #334155",
                            }}
                          />
                        )}

                        <div>
                          <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#f1f5f9" }}>
                            Step {step.step_id}: {step.title}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.4rem",
                              fontSize: "0.72rem",
                              color: "#94a3b8",
                              marginTop: "0.15rem",
                            }}
                          >
                            <span className="font-mono" style={{ color: "#38bdf8" }}>
                              <Wrench size={12} style={{ display: "inline", marginRight: "2px" }} />
                              {step.assigned_tool}
                            </span>
                            {toolCall && (
                              <span>• {toolCall.execution_time_ms}ms</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {isExpanded ? (
                        <ChevronDown size={16} color="#64748b" />
                      ) : (
                        <ChevronRight size={16} color="#64748b" />
                      )}
                    </div>

                    {/* Expanded Tool Call Details */}
                    {isExpanded && (
                      <div
                        style={{
                          padding: "0.85rem 1rem",
                          borderTop: "1px solid #1e293b",
                          background: "#050811",
                        }}
                      >
                        <p style={{ fontSize: "0.75rem", color: "#cbd5e1", marginBottom: "0.5rem" }}>
                          {step.description}
                        </p>

                        {step.result && (
                          <div>
                            <span
                              style={{
                                fontSize: "0.7rem",
                                fontWeight: 700,
                                color: "#34d399",
                                fontFamily: "var(--font-mono)",
                              }}
                            >
                              TOOL RESULT PAYLOAD:
                            </span>
                            <pre
                              className="font-mono"
                              style={{
                                background: "#090f1d",
                                border: "1px solid #1e293b",
                                borderRadius: "4px",
                                padding: "0.5rem",
                                fontSize: "0.72rem",
                                color: "#94a3b8",
                                overflowX: "auto",
                                marginTop: "0.25rem",
                              }}
                            >
                              {JSON.stringify(step.result, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div
                style={{
                  textAlign: "center",
                  padding: "3rem 1rem",
                  color: "#64748b",
                }}
              >
                <Layers size={36} style={{ margin: "0 auto 0.75rem", opacity: 0.4 }} />
                <p style={{ fontSize: "0.85rem" }}>No active agent execution plan.</p>
                <p style={{ fontSize: "0.75rem" }}>
                  Launch a scenario or submit a prompt to begin multi-step orchestration.
                </p>
              </div>
            )}
          </div>

          {/* HITL Sign-Off Gate Action Bar */}
          {state && (
            <div
              style={{
                marginTop: "auto",
                paddingTop: "1.25rem",
                borderTop: "1px solid #1e293b",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                  HITL Review Gate:{" "}
                </span>
                <span
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    color:
                      state.approval.status === "APPROVED"
                        ? "#34d399"
                        : state.approval.status === "REJECTED"
                        ? "#f87171"
                        : "#fbbf24",
                  }}
                >
                  {state.approval.status}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsApprovalModalOpen(true)}
                className="btn-secondary"
                style={{ padding: "0.45rem 0.85rem", fontSize: "0.8rem" }}
              >
                <FileSignature size={14} />
                <span>Review & Sign Deliverables</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Grounded Evidence Citations */}
      {state && state.retrieved_evidence.length > 0 && (
        <div className="glass-panel" style={{ padding: "1.25rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "0.75rem",
            }}
          >
            <BookOpen size={16} color="#38bdf8" />
            <h4 style={{ fontSize: "0.9rem", fontWeight: 700, color: "#f1f5f9" }}>
              Grounded SOP & Standard Citations (Vector RAG)
            </h4>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "0.75rem",
            }}
          >
            {state.retrieved_evidence.map((ev, idx) => (
              <div
                key={idx}
                style={{
                  background: "#0a1021",
                  border: "1px solid #1e293b",
                  borderRadius: "8px",
                  padding: "0.85rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "0.35rem",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      color: "#38bdf8",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {ev.source_doc} {ev.page_num && `(p. ${ev.page_num})`}
                  </span>
                  <span
                    style={{
                      fontSize: "0.7rem",
                      fontFamily: "var(--font-mono)",
                      color: "#34d399",
                    }}
                  >
                    {(ev.confidence_score * 100).toFixed(1)}% Match
                  </span>
                </div>
                <p style={{ fontSize: "0.78rem", color: "#94a3b8", fontStyle: "italic" }}>
                  "{ev.snippet}"
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Deliverables Section */}
      {state && (
        <div style={{ marginTop: "0.5rem" }}>
          <DeliverablesPreview state={state} />
        </div>
      )}

      {/* Human Approval Modal */}
      {state && (
        <HumanApprovalModal
          state={state}
          isOpen={isApprovalModalOpen}
          onClose={() => setIsApprovalModalOpen(false)}
          onSubmitDecision={onSubmitApproval}
        />
      )}
    </div>
  );
};
