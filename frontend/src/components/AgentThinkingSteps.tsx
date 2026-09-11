import React, { useState, useEffect } from "react";
import {
  Brain,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Loader2,
  Circle,
  AlertCircle,
  Terminal,
  Cpu,
  Clock,
  Code2,
  Search,
  FileCheck,
  Zap,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import type { AgentState, PlanStep, ToolCallRecord, TraceEvent } from "../types/agent";

interface Props {
  state: AgentState | null;
  isRunning: boolean;
  activeQuery?: string;
  defaultExpanded?: boolean;
}

export const AgentThinkingSteps: React.FC<Props> = ({
  state,
  isRunning,
  activeQuery,
  defaultExpanded = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [activeTab, setActiveTab] = useState<"steps" | "trace">("steps");
  const [expandedStepIds, setExpandedStepIds] = useState<Record<number, boolean>>({});
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Timer for active thinking duration
  useEffect(() => {
    let timer: any = null;
    if (isRunning) {
      setElapsedSeconds(0);
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRunning]);

  // Keep expanded while running
  useEffect(() => {
    if (isRunning) {
      setIsExpanded(true);
    }
  }, [isRunning]);

  if (!state && !isRunning) {
    return null;
  }

  const steps: PlanStep[] = state?.plan || [
    {
      step_id: 1,
      title: "Classifying Task & Initializing Workflow",
      description: "Analyzing prompt intent and routing to local specialized GPU models.",
      assigned_tool: "task_classifier",
      status: "IN_PROGRESS",
    },
  ];

  const totalSteps = steps.length;
  const completedSteps = steps.filter((s) => s.status === "COMPLETED").length;
  const inProgressStep = steps.find((s) => s.status === "IN_PROGRESS");
  const percentComplete = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  const toggleStepDetails = (stepId: number) => {
    setExpandedStepIds((prev) => ({
      ...prev,
      [stepId]: !prev[stepId],
    }));
  };

  const getToolIcon = (toolName: string) => {
    switch (toolName) {
      case "ocr_pdf_tool":
      case "vision_analysis_tool":
        return <Search size={14} color="var(--brand-blue)" />;
      case "rag_search_tool":
        return <Zap size={14} color="#8b5cf6" />;
      case "sandbox_code_tool":
        return <Code2 size={14} color="#f59e0b" />;
      case "generate_docx_tool":
      case "generate_xlsx_tool":
        return <FileCheck size={14} color="var(--green-600)" />;
      default:
        return <Cpu size={14} color="var(--brand-blue)" />;
    }
  };

  const getEventBadgeColor = (eventType: string) => {
    switch (eventType) {
      case "CLASSIFICATION":
        return { bg: "#f3e8ff", border: "#d8b4fe", text: "#7e22ce" };
      case "PLANNING":
        return { bg: "#e0f2fe", border: "#bae6fd", text: "#0369a1" };
      case "TOOL_START":
        return { bg: "#fef3c7", border: "#fde68a", text: "#b45309" };
      case "TOOL_END":
        return { bg: "#dcfce7", border: "#bbf7d0", text: "#15803d" };
      case "VERIFICATION":
        return { bg: "#ccfbf1", border: "#99f6e4", text: "#0f766e" };
      case "ERROR":
        return { bg: "#fee2e2", border: "#fecaca", text: "#b91c1c" };
      default:
        return { bg: "#f1f5f9", border: "#e2e8f0", text: "#475569" };
    }
  };

  // Find tool execution record matching step
  const getToolRecord = (stepId: number): ToolCallRecord | undefined => {
    return state?.tool_calls?.find((tc) => tc.step_id === stepId);
  };

  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid var(--border-dim)",
        borderRadius: "10px",
        overflow: "hidden",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.04)",
        marginBottom: "1.25rem",
        transition: "all 0.2s ease",
      }}
    >
      {/* ── Accordion Header ── */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          padding: "1rem 1.25rem",
          background: isRunning ? "linear-gradient(90deg, #f0f9ff 0%, #ffffff 100%)" : "#f8fafc",
          borderBottom: isExpanded ? "1px solid var(--border-dim)" : "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              background: isRunning ? "#e0f2fe" : "#f1f5f9",
              border: `1px solid ${isRunning ? "#bae6fd" : "#cbd5e1"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {isRunning ? (
              <Brain size={18} color="var(--brand-blue)" style={{ animation: "pulse 1.5s infinite" }} />
            ) : (
              <Brain size={18} color="var(--brand-navy)" />
            )}
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--brand-navy)" }}>
                {isRunning
                  ? `Thinking... (${completedSteps}/${totalSteps} Steps Complete)`
                  : `Agent Execution & Reasoning Trace (${completedSteps}/${totalSteps} Steps)`}
              </span>
              {isRunning && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    padding: "0.15rem 0.5rem",
                    borderRadius: "12px",
                    background: "#e0f2fe",
                    color: "var(--brand-blue)",
                    fontSize: "0.725rem",
                    fontWeight: 600,
                  }}
                >
                  <Clock size={11} />
                  {elapsedSeconds}s
                </span>
              )}
            </div>
            <div style={{ fontSize: "0.775rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
              {isRunning
                ? inProgressStep
                  ? `Active Step: ${inProgressStep.title}`
                  : "Initializing sovereign execution plan..."
                : state?.verification?.verified
                ? "All execution steps verified with zero external cloud calls."
                : "Execution plan completed."}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {/* Progress Pill */}
          <div
            style={{
              padding: "0.25rem 0.65rem",
              background: completedSteps === totalSteps ? "#dcfce7" : "#f1f5f9",
              border: `1px solid ${completedSteps === totalSteps ? "#bbf7d0" : "#e2e8f0"}`,
              borderRadius: "6px",
              fontSize: "0.775rem",
              fontWeight: 600,
              color: completedSteps === totalSteps ? "#15803d" : "var(--text-primary)",
            }}
          >
            {percentComplete}% Complete
          </div>

          {/* Toggle Chevron */}
          <button
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              color: "var(--text-muted)",
            }}
          >
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      {/* ── Accordion Content ── */}
      {isExpanded && (
        <div style={{ padding: "1.25rem" }}>
          {/* Progress Bar */}
          <div
            style={{
              width: "100%",
              height: "6px",
              background: "#e2e8f0",
              borderRadius: "3px",
              overflow: "hidden",
              marginBottom: "1.25rem",
            }}
          >
            <div
              style={{
                width: `${percentComplete}%`,
                height: "100%",
                background:
                  percentComplete === 100
                    ? "linear-gradient(90deg, #10b981 0%, #059669 100%)"
                    : "linear-gradient(90deg, #0284c7 0%, #3b82f6 100%)",
                transition: "width 0.3s ease",
              }}
            />
          </div>

          {/* Tab Bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              borderBottom: "1px solid var(--border-dim)",
              paddingBottom: "0.65rem",
              marginBottom: "1.25rem",
            }}
          >
            <button
              onClick={() => setActiveTab("steps")}
              style={{
                padding: "0.4rem 0.85rem",
                borderRadius: "6px",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                border: "none",
                background: activeTab === "steps" ? "#f0f9ff" : "transparent",
                color: activeTab === "steps" ? "var(--brand-blue)" : "var(--text-muted)",
              }}
            >
              Step-by-Step Reasoning
            </button>

            <button
              onClick={() => setActiveTab("trace")}
              style={{
                padding: "0.4rem 0.85rem",
                borderRadius: "6px",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                border: "none",
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                background: activeTab === "trace" ? "#f0f9ff" : "transparent",
                color: activeTab === "trace" ? "var(--brand-blue)" : "var(--text-muted)",
              }}
            >
              <Terminal size={13} />
              System Trace Logs ({state?.trace?.events?.length || 0})
            </button>
          </div>

          {/* Tab 1: Step-by-Step Reasoning Timeline */}
          {activeTab === "steps" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {steps.map((step, idx) => {
                const record = getToolRecord(step.step_id);
                const isDetailsOpen = !!expandedStepIds[step.step_id];

                return (
                  <div
                    key={step.step_id}
                    style={{
                      display: "flex",
                      gap: "0.85rem",
                      position: "relative",
                    }}
                  >
                    {/* Vertical timeline line */}
                    {idx < steps.length - 1 && (
                      <div
                        style={{
                          position: "absolute",
                          left: "13px",
                          top: "28px",
                          bottom: "-14px",
                          width: "2px",
                          background: step.status === "COMPLETED" ? "#cbd5e1" : "#e2e8f0",
                        }}
                      />
                    )}

                    {/* Step Icon */}
                    <div style={{ flexShrink: 0, marginTop: "2px", zIndex: 1 }}>
                      {step.status === "COMPLETED" ? (
                        <CheckCircle2 size={24} color="#16a34a" />
                      ) : step.status === "IN_PROGRESS" ? (
                        <div
                          style={{
                            width: "24px",
                            height: "24px",
                            borderRadius: "50%",
                            background: "#e0f2fe",
                            border: "2px solid #0284c7",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Loader2
                            size={14}
                            color="#0284c7"
                            style={{ animation: "spin 1.2s linear infinite" }}
                          />
                        </div>
                      ) : step.status === "FAILED" ? (
                        <AlertCircle size={24} color="#dc2626" />
                      ) : (
                        <Circle size={24} color="#cbd5e1" />
                      )}
                    </div>

                    {/* Step Content Card */}
                    <div
                      style={{
                        flex: 1,
                        background: step.status === "IN_PROGRESS" ? "#f0f9ff" : "var(--bg-raised)",
                        border: "1px solid",
                        borderColor:
                          step.status === "IN_PROGRESS"
                            ? "#bae6fd"
                            : step.status === "COMPLETED"
                            ? "var(--border-dim)"
                            : "#f1f5f9",
                        borderRadius: "8px",
                        padding: "0.85rem 1rem",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "0.5rem",
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              color: "var(--text-dim)",
                            }}
                          >
                            STEP {step.step_id}
                          </span>
                          <h4
                            style={{
                              fontSize: "0.875rem",
                              fontWeight: 700,
                              color:
                                step.status === "PENDING"
                                  ? "var(--text-muted)"
                                  : "var(--text-primary)",
                            }}
                          >
                            {step.title}
                          </h4>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          {/* Tool Tag */}
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.3rem",
                              padding: "0.15rem 0.5rem",
                              background: "#ffffff",
                              border: "1px solid var(--border-base)",
                              borderRadius: "4px",
                              fontSize: "0.725rem",
                              fontFamily: "var(--font-mono)",
                              color: "var(--text-primary)",
                            }}
                          >
                            {getToolIcon(step.assigned_tool)}
                            {step.assigned_tool}
                          </span>

                          {/* Execution Time Badge */}
                          {record?.execution_time_ms ? (
                            <span
                              style={{
                                fontSize: "0.725rem",
                                color: "var(--text-muted)",
                                fontFamily: "var(--font-mono)",
                              }}
                            >
                              {record.execution_time_ms}ms
                            </span>
                          ) : null}

                          {/* Toggle Parameter Details Button */}
                          {(record || step.result || step.error) && (
                            <button
                              onClick={() => toggleStepDetails(step.step_id)}
                              style={{
                                background: "transparent",
                                border: "none",
                                cursor: "pointer",
                                fontSize: "0.725rem",
                                color: "var(--brand-blue)",
                                fontWeight: 600,
                                display: "flex",
                                alignItems: "center",
                                gap: "0.2rem",
                                marginLeft: "0.25rem",
                              }}
                            >
                              {isDetailsOpen ? "Hide Details" : "Inspect Tool Output"}
                              <ChevronRight
                                size={12}
                                style={{
                                  transform: isDetailsOpen ? "rotate(90deg)" : "none",
                                  transition: "transform 0.15s ease",
                                }}
                              />
                            </button>
                          )}
                        </div>
                      </div>

                      <p
                        style={{
                          fontSize: "0.8rem",
                          color: "var(--text-muted)",
                          marginTop: "0.25rem",
                        }}
                      >
                        {step.description}
                      </p>

                      {/* Error Message Display */}
                      {step.error && (
                        <div
                          style={{
                            marginTop: "0.5rem",
                            padding: "0.5rem 0.75rem",
                            background: "#fef2f2",
                            border: "1px solid #fecaca",
                            borderRadius: "6px",
                            color: "#b91c1c",
                            fontSize: "0.775rem",
                          }}
                        >
                          <strong>Error:</strong> {step.error}
                        </div>
                      )}

                      {/* Expanded Tool Input/Output Inspector */}
                      {isDetailsOpen && record && (
                        <div
                          style={{
                            marginTop: "0.65rem",
                            padding: "0.75rem",
                            background: "#0f172a",
                            borderRadius: "6px",
                            color: "#e2e8f0",
                            fontFamily: "var(--font-mono)",
                            fontSize: "0.75rem",
                            overflowX: "auto",
                          }}
                        >
                          <div style={{ color: "#38bdf8", fontWeight: 600, marginBottom: "0.25rem" }}>
                            // Tool Parameters:
                          </div>
                          <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                            {JSON.stringify(record.input_params, null, 2)}
                          </pre>

                          {record.output && (
                            <>
                              <div
                                style={{
                                  color: "#4ade80",
                                  fontWeight: 600,
                                  marginTop: "0.65rem",
                                  marginBottom: "0.25rem",
                                }}
                              >
                                // Execution Output:
                              </div>
                              <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                                {typeof record.output === "object"
                                  ? JSON.stringify(record.output, null, 2)
                                  : String(record.output)}
                              </pre>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tab 2: System Trace Logs (Antigravity IDE format) */}
          {activeTab === "trace" && (
            <div
              style={{
                background: "#090d16",
                border: "1px solid #1e293b",
                borderRadius: "8px",
                padding: "1rem",
                fontFamily: "var(--font-mono)",
                fontSize: "0.75rem",
                maxHeight: "340px",
                overflowY: "auto",
              }}
            >
              {state?.trace?.events && state.trace.events.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {state.trace.events.map((evt: TraceEvent) => {
                    const colors = getEventBadgeColor(evt.event_type);
                    return (
                      <div
                        key={evt.event_id}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "0.75rem",
                          padding: "0.4rem 0.5rem",
                          borderBottom: "1px solid #1e293b",
                        }}
                      >
                        <span style={{ color: "#64748b", flexShrink: 0, width: "70px" }}>
                          {evt.timestamp ? evt.timestamp.split("T")[1]?.slice(0, 8) : "--:--:--"}
                        </span>

                        <span
                          style={{
                            padding: "0.1rem 0.4rem",
                            borderRadius: "4px",
                            background: colors.bg,
                            color: colors.text,
                            fontWeight: 700,
                            fontSize: "0.675rem",
                            flexShrink: 0,
                            minWidth: "100px",
                            textAlign: "center",
                          }}
                        >
                          {evt.event_type}
                        </span>

                        <span style={{ color: "#e2e8f0", flex: 1 }}>{evt.message}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ color: "#64748b", textAlign: "center", padding: "1.5rem" }}>
                  No trace events recorded yet.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
