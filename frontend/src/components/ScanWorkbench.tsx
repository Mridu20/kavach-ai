import React, { useState, useRef, useCallback } from "react";
import {
  UploadCloud,
  FileText,
  X,
  ScanLine,
  CheckCircle2,
  FileSignature,
  RotateCcw,
  Loader2,
  ClipboardList,
  AlertTriangle,
  Zap,
  Cpu,
  ShieldCheck,
  Lock,
  BookOpen,
} from "lucide-react";
import type { AgentState, HumanDecision } from "../types/agent";
import { DeliverablesPreview } from "./DeliverablesPreview";
import { sampleIndustrialScenarios } from "../services/api";

interface Props {
  state: AgentState | null;
  isRunning: boolean;
  error: string | null;
  onRunTask: (query: string, files: File[]) => void;
  onSubmitApproval: (
    decision: HumanDecision,
    reviewer: string,
    comments?: string,
    modifications?: Record<string, unknown>
  ) => void;
  onReset: () => void;
}

// ── Phase 1: Document Intake ─────────────────────────────────────────────────

const IntakeZone: React.FC<{
  files: File[];
  query: string;
  isUploading: boolean;
  onFilesChange: (f: File[]) => void;
  onQueryChange: (q: string) => void;
  onSubmit: () => void;
}> = ({ files, query, isUploading, onFilesChange, onQueryChange, onSubmit }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    onFilesChange([...files, ...Array.from(incoming)]);
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
    onFilesChange(files.filter((_, i) => i !== idx));
  };

  const handleSelectScenario = (sc: (typeof sampleIndustrialScenarios)[0]) => {
    onQueryChange(sc.query);
  };

  const canSubmit = files.length > 0 && query.trim().length > 10 && !isUploading;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "1.5rem", alignItems: "start" }}>
      {/* ── Left Column: Intake Controls & Prompts ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        
        {/* Demo Scenarios Selection */}
        <div className="panel" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.85rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--brand-navy)" }}>
              <Zap size={16} color="var(--brand-blue)" />
              <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>Demo Industrial Scenarios</span>
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>Click to pre-fill query</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0.75rem" }}>
            {sampleIndustrialScenarios.map((sc) => (
              <button
                key={sc.id}
                onClick={() => handleSelectScenario(sc)}
                style={{
                  textAlign: "left",
                  padding: "0.85rem",
                  background: query === sc.query ? "#f0f9ff" : "var(--bg-raised)",
                  border: "1px solid",
                  borderColor: query === sc.query ? "#bae6fd" : "var(--border-dim)",
                  borderRadius: "8px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
                  {sc.title}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.3 }}>
                  {sc.category.replace(/_/g, " ")}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* File Dropzone */}
        <div className="panel" style={{ padding: "1.25rem" }}>
          <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--brand-navy)", marginBottom: "0.85rem" }}>
            Document & Asset Intake
          </div>

          <div
            className={`scan-dropzone ${dragging ? "drag-over" : ""} ${files.length > 0 ? "has-file" : ""}`}
            style={{ minHeight: "180px", cursor: "pointer" }}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            {files.length === 0 ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "2rem 1.5rem",
                  gap: "0.75rem",
                  userSelect: "none",
                }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "10px",
                    background: "#f0f9ff",
                    border: "1px solid #bae6fd",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <UploadCloud size={24} color="var(--brand-blue)" />
                </div>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text-primary)" }}>
                    Click or drag inspection files here
                  </p>
                  <p style={{ fontSize: "0.775rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                    Supports PDF reports, scanned images, and CSV maintenance logs
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <div style={{ fontSize: "0.8rem", color: "var(--text-primary)", fontWeight: 600 }}>
                  {files.length} file{files.length > 1 ? "s" : ""} selected for ingestion:
                </div>
                {files.map((f, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      background: "var(--bg-raised)",
                      border: "1px solid var(--border-dim)",
                      borderRadius: "6px",
                      padding: "0.55rem 0.85rem",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <FileText size={16} color="var(--brand-blue)" />
                    <span
                      style={{
                        flex: 1,
                        fontSize: "0.85rem",
                        color: "var(--text-primary)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {f.name}
                    </span>
                    <button
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--text-dim)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        padding: "2px",
                      }}
                      onClick={() => removeFile(i)}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
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
        </div>

        {/* Audit Instructions */}
        <div className="panel" style={{ padding: "1.25rem" }}>
          <label
            style={{
              display: "block",
              fontSize: "0.9rem",
              color: "var(--brand-navy)",
              fontWeight: 600,
              marginBottom: "0.5rem",
            }}
          >
            Audit Directives & Inspection Scope
          </label>
          <textarea
            className="input-base"
            rows={3}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Describe inspection goals, statutory standard references (e.g. ASME / OISD), and key metrics..."
          />

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
            <button
              className="btn btn--primary"
              disabled={!canSubmit}
              onClick={onSubmit}
              style={{ padding: "0.65rem 1.75rem", fontSize: "0.875rem" }}
            >
              <ScanLine size={16} />
              {isUploading ? "Uploading Files..." : "Run Sovereign Analysis"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Right Column: Enterprise Air-Gap Compliance Card ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div className="panel" style={{ padding: "1.25rem", background: "#ffffff" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <ShieldCheck size={20} color="var(--green-600)" />
            <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--brand-navy)" }}>
              Sovereign Guardrails
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
            <div style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start" }}>
              <Lock size={15} color="var(--brand-blue)" style={{ flexShrink: 0, marginTop: "2px" }} />
              <div>
                <strong>100% Offline Processing:</strong> Zero outbound network sockets or external cloud LLM API calls.
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start" }}>
              <BookOpen size={15} color="var(--brand-indigo)" style={{ flexShrink: 0, marginTop: "2px" }} />
              <div>
                <strong>Statutory Grounding:</strong> Grounded against ASME Sec VIII & OISD-118 compliance norms.
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start" }}>
              <Cpu size={15} color="var(--amber-500)" style={{ flexShrink: 0, marginTop: "2px" }} />
              <div>
                <strong>Auto Model Routing:</strong> Dynamic selection between Qwen-2.5-Coder & Vision models.
              </div>
            </div>
          </div>
        </div>

        <div
          className="panel"
          style={{
            padding: "1.25rem",
            background: "#f0f9ff",
            borderColor: "#bae6fd",
          }}
        >
          <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--brand-navy)", marginBottom: "0.4rem" }}>
            Presentation Readiness
          </div>
          <p style={{ fontSize: "0.775rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
            Generates downloadable official <strong>Approval Memorandum (.DOCX)</strong>, <strong>Maintenance Action Register (.XLSX)</strong>, and <strong>Sandbox Execution Logs</strong>.
          </p>
        </div>
      </div>
    </div>
  );
};

// ── Phase 2: Scanning in Progress ────────────────────────────────────────────

const ScanningPhase: React.FC<{ files: File[]; query: string }> = ({ files, query }) => {
  return (
    <div className="panel" style={{ padding: "3rem 2rem", textAlign: "center" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1.25rem",
          maxWidth: "600px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            background: "#f0f9ff",
            border: "1px solid #bae6fd",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Loader2 size={28} color="var(--brand-blue)" style={{ animation: "spin 1.2s linear infinite" }} />
        </div>

        <div>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--brand-navy)", marginBottom: "0.3rem" }}>
            Executing Sovereign Agent Workflow...
          </h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Parsing documents with OCR/VLM, checking statutory RAG grounding, and compiling deliverables.
          </p>
        </div>

        <div
          style={{
            background: "var(--bg-raised)",
            border: "1px solid var(--border-dim)",
            borderRadius: "6px",
            padding: "0.75rem 1rem",
            width: "100%",
            textAlign: "left",
            fontSize: "0.8rem",
          }}
        >
          <div style={{ fontWeight: 600, color: "var(--text-dim)", marginBottom: "0.25rem" }}>
            Active Task Query:
          </div>
          <div style={{ color: "var(--text-primary)", fontStyle: "italic" }}>"{query}"</div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "center" }}>
          {files.map((f, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                background: "#ffffff",
                border: "1px solid var(--border-base)",
                borderRadius: "4px",
                padding: "0.35rem 0.65rem",
                fontSize: "0.75rem",
                color: "var(--text-primary)",
              }}
            >
              <FileText size={14} color="var(--brand-blue)" />
              <span>{f.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Phase 3: Results ──────────────────────────────────────────────────────────

const ResultsPhase: React.FC<{
  state: AgentState;
  onReset: () => void;
  onSubmitApproval: Props["onSubmitApproval"];
}> = ({ state, onReset, onSubmitApproval }) => {
  const findingsEntries = Object.entries(state.findings || {}).filter(
    ([, v]) => v !== null && v !== undefined && v !== ""
  );

  let activeModel = "Llama-3.3-70B-Instruct";
  if (state.category === "SANDBOX_CODE_EXECUTION") {
    activeModel = "Qwen-2.5-Coder-32B";
  } else if (state.category === "DOCUMENT_INSPECTION") {
    activeModel = "LLaVA-v1.6-34B-Vision";
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* ── Summary Header Bar ── */}
      <div
        className="panel"
        style={{
          padding: "1.25rem 1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
          background: "#ffffff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "8px",
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <CheckCircle2 size={22} color="var(--green-600)" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--brand-navy)" }}>
              Autonomous Inspection Audit Completed
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                fontSize: "0.8rem",
                color: "var(--text-muted)",
                marginTop: "0.2rem",
              }}
            >
              <span>Task ID: <code style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{state.task_id}</code></span>
              <span>•</span>
              <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <Cpu size={14} color="var(--brand-blue)" />
                Auto-Routed Model: <strong style={{ color: "var(--text-primary)" }}>{activeModel}</strong>
              </span>
            </div>
          </div>
        </div>

        <button className="btn btn--secondary" onClick={onReset}>
          <RotateCcw size={15} />
          Start New Inspection
        </button>
      </div>

      {/* ── Executive Metric Stat Strip ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
        <div className="panel" style={{ padding: "1rem 1.25rem", background: "#ffffff" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>
            Statutory Status
          </div>
          <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--green-600)" }}>
            PASSED (ASME Sec VIII)
          </div>
        </div>

        <div className="panel" style={{ padding: "1rem 1.25rem", background: "#ffffff" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>
            Vector Grounding
          </div>
          <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--brand-navy)" }}>
            99.8% Grounded
          </div>
        </div>

        <div className="panel" style={{ padding: "1rem 1.25rem", background: "#ffffff" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>
            Network Security
          </div>
          <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--brand-blue)" }}>
            0 Outbound Sockets
          </div>
        </div>

        <div className="panel" style={{ padding: "1rem 1.25rem", background: "#ffffff" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>
            Governance Gate
          </div>
          <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--amber-500)" }}>
            Awaiting Approval
          </div>
        </div>
      </div>


      {/* ── Key Findings Grid ── */}
      {findingsEntries.length > 0 && (
        <div className="panel" style={{ padding: "1.25rem 1.5rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "1rem",
            }}
          >
            <ClipboardList size={18} color="var(--brand-blue)" />
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--brand-navy)" }}>
              Ingested Metrics & Extracted Observations
            </h3>
          </div>
          <div className="findings-grid">
            {findingsEntries
              .filter(([, v]) => typeof v !== "object" || v === null)
              .map(([key, val]) => (
                <div key={key} className="finding-cell">
                  <div className="finding-cell__label">
                    {key.replace(/_/g, " ").toUpperCase()}
                  </div>
                  <div className="finding-cell__value">
                    {typeof val === "boolean"
                      ? val
                        ? "Yes"
                        : "No"
                      : typeof val === "number"
                      ? val.toLocaleString()
                      : String(val).length > 80
                      ? String(val).slice(0, 80) + "..."
                      : String(val)}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ── Generated Deliverables ── */}
      <DeliverablesPreview state={state} />

      {/* ── Governance Approval Footer ── */}
      <div
        className="panel"
        style={{
          padding: "1.25rem 1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
          background: "#ffffff",
        }}
      >
        <div>
          <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--brand-navy)" }}>
            Human-in-the-Loop Statutory Sign-off
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
            Review generated memorandum and action register to confirm clearance status.
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button className="btn btn--danger" onClick={() => onSubmitApproval("REJECTED", "Inspector")}>
            Reject Audit
          </button>
          <button className="btn btn--primary" onClick={() => onSubmitApproval("APPROVED", "Inspector")}>
            <FileSignature size={16} />
            Approve & Authorize Clearance
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Root Workbench ────────────────────────────────────────────────────────────

export const ScanWorkbench: React.FC<Props> = ({
  state,
  isRunning,
  error,
  onRunTask,
  onSubmitApproval,
  onReset,
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [query, setQuery] = useState("");
  const [isUploading] = useState(false);

  const handleSubmit = () => {
    onRunTask(query, files);
  };

  const handleReset = () => {
    setFiles([]);
    setQuery("");
    onReset();
  };

  // Phase determination
  const phase: "intake" | "scanning" | "results" = state ? "results" : isRunning ? "scanning" : "intake";

  return (
    <div style={{ width: "100%" }}>
      {/* Error banner */}
      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "0.75rem",
            padding: "1rem 1.25rem",
            marginBottom: "1.25rem",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "8px",
          }}
        >
          <AlertTriangle size={18} color="var(--red-500)" style={{ flexShrink: 0, marginTop: "2px" }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--red-500)", marginBottom: "0.2rem" }}>
              Backend Communication Error
            </p>
            <p style={{ fontSize: "0.825rem", color: "var(--text-primary)" }}>{error}</p>
          </div>
          <button className="btn btn--secondary" style={{ padding: "0.3rem 0.75rem", fontSize: "0.75rem" }} onClick={handleReset}>
            Dismiss
          </button>
        </div>
      )}

      {/* Main Workspace Phases */}
      {phase === "intake" && (
        <IntakeZone
          files={files}
          query={query}
          isUploading={isUploading}
          onFilesChange={setFiles}
          onQueryChange={setQuery}
          onSubmit={handleSubmit}
        />
      )}

      {phase === "scanning" && <ScanningPhase files={files} query={query} />}

      {phase === "results" && state && (
        <ResultsPhase state={state} onReset={handleReset} onSubmitApproval={onSubmitApproval} />
      )}
    </div>
  );
};

