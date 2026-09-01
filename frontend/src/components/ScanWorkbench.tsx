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
} from "lucide-react";
import type { AgentState, HumanDecision } from "../types/agent";
import { DeliverablesPreview } from "./DeliverablesPreview";
import { sampleIndustrialScenarios } from "../services/api";

interface Props {
  state: AgentState | null;
  isRunning: boolean;
  error: string | null;
  onRunTask: (query: string, files: string[]) => void;
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
  onFilesChange: (f: File[]) => void;
  onQueryChange: (q: string) => void;
  onSubmit: () => void;
}> = ({ files, query, onFilesChange, onQueryChange, onSubmit }) => {
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
    // Convert string array to File array mock for UI display purposes
    const mockFiles = sc.files.map((fName) => new File([""], fName, { type: "application/octet-stream" }));
    onFilesChange(mockFiles);
  };

  const canSubmit = files.length > 0 && query.trim().length > 10;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      
      {/* Demo Scenarios */}
      <div style={{ marginBottom: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem", color: "var(--text-muted)" }}>
          <Zap size={16} color="var(--amber-500)" />
          <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Demo Scenarios</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem" }}>
          {sampleIndustrialScenarios.map((sc) => (
            <button
              key={sc.id}
              onClick={() => handleSelectScenario(sc)}
              style={{
                textAlign: "left",
                padding: "0.85rem",
                background: "var(--bg-raised)",
                border: "1px solid var(--border-dim)",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--amber-500)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-dim)")}
            >
              <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
                {sc.title}
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>
                {sc.category.replace(/_/g, " ")}
              </div>
            </button>
          ))}
        </div>
      </div>

      <hr style={{ border: "none", borderTop: "1px solid var(--border-dim)", margin: "0.5rem 0" }} />

      {/* Drop Zone */}
      <div
        className={`scan-dropzone ${dragging ? "drag-over" : ""} ${files.length > 0 ? "has-file" : ""}`}
        style={{ minHeight: "220px", cursor: "pointer" }}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <div className="scanline-sweep" />

        {files.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "2.5rem",
              gap: "0.85rem",
              userSelect: "none",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "12px",
                background: "var(--bg-raised)",
                border: "1px solid var(--border-base)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <UploadCloud size={28} color="var(--text-dim)" />
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--text-primary)" }}>
                Select documents to analyze
              </p>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>
                Supports PDFs, Images, and CSVs
              </p>
            </div>
          </div>
        ) : (
          <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            <div
              style={{
                fontSize: "0.8rem",
                color: "var(--text-primary)",
                marginBottom: "0.25rem",
                fontWeight: 600,
              }}
            >
              {files.length} document{files.length > 1 ? "s" : ""} selected
            </div>
            {files.map((f, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  background: "var(--bg-panel)",
                  border: "1px solid var(--border-dim)",
                  borderRadius: "7px",
                  padding: "0.6rem 0.85rem",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <FileText size={16} color="var(--amber-500)" />
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
                    borderRadius: "4px",
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

      {/* Instruction */}
      <div>
        <label
          style={{
            display: "block",
            fontSize: "0.8rem",
            color: "var(--text-primary)",
            fontWeight: 600,
            marginBottom: "0.5rem",
          }}
        >
          Instructions
        </label>
        <textarea
          className="input-base"
          rows={3}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="e.g. Extract weld thickness data and flag safety violations"
        />
      </div>

      {/* CTA */}
      <button
        className="btn btn--primary"
        disabled={!canSubmit}
        onClick={onSubmit}
        style={{ alignSelf: "flex-end", padding: "0.7rem 1.75rem", fontSize: "0.875rem" }}
      >
        <ScanLine size={17} />
        Start Analysis
      </button>
    </div>
  );
};

// ── Phase 2: Scanning in Progress ────────────────────────────────────────────

const ScanningPhase: React.FC<{ files: File[]; query: string }> = ({ files }) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ position: "relative", borderRadius: "10px", overflow: "hidden", background: "var(--bg-panel)", border: "1px solid var(--border-base)" }}>
        <div
          style={{
            padding: "3rem 2rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1.5rem",
            justifyContent: "center",
          }}
        >
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
            {files.map((f, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  background: "var(--bg-raised)",
                  border: "1px solid var(--border-base)",
                  borderRadius: "8px",
                  padding: "0.6rem 1rem",
                }}
              >
                <FileText size={18} color="var(--amber-500)" />
                <span style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>
                  {f.name}
                </span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", color: "var(--amber-500)" }}>
            <Loader2 size={20} style={{ animation: "spin 1.2s linear infinite" }} />
            <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>
              Executing Autonomous Agent...
            </span>
          </div>
        </div>
        <div className="scanline-sweep scanline-sweep--active" />
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
      {/* ── Summary header ── */}
      <div
        className="panel"
        style={{
          padding: "1.25rem 1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "rgba(16,185,129,0.15)",
              border: "1px solid rgba(16,185,129,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
             <CheckCircle2 size={20} color="var(--green-500)" />
          </div>
          <div>
            <div
              style={{
                fontWeight: 600,
                fontSize: "1rem",
                color: "var(--text-primary)",
              }}
            >
              Agent Execution Complete
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                fontSize: "0.8rem",
                color: "var(--text-muted)",
                marginTop: "0.25rem"
              }}
            >
              <Cpu size={14} color="var(--amber-500)" />
              Auto-Routed Model: <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{activeModel}</span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <button className="btn btn--secondary" onClick={onReset}>
            <RotateCcw size={16} />
            Start New Task
          </button>
        </div>
      </div>

      {/* ── Findings grid ── */}
      {findingsEntries.length > 0 && (
        <div className="panel" style={{ padding: "1.5rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "1.25rem",
            }}
          >
            <ClipboardList size={18} color="var(--amber-500)" />
            <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)" }}>
              Key Findings
            </h3>
          </div>
          <div className="findings-grid">
            {findingsEntries.map(([key, val]) => (
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
                    : String(val)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Deliverables ── */}
      <DeliverablesPreview state={state} />

      {/* ── Approval ── */}
      <div
        className="panel"
        style={{
          padding: "1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)" }}>
            Approval Required
          </div>
          <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
            Please review the findings and generated deliverables.
          </div>
        </div>
        <div style={{ display: "flex", gap: "1rem" }}>
            <button
                className="btn btn--danger"
                onClick={() => onSubmitApproval("REJECTED", "Inspector")}
            >
                Reject
            </button>
            <button
                className="btn btn--primary"
                onClick={() => onSubmitApproval("APPROVED", "Inspector")}
            >
                <FileSignature size={16} />
                Approve Results
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

  const handleSubmit = () => {
    onRunTask(query, files.map((f) => f.name));
  };

  const handleReset = () => {
    setFiles([]);
    setQuery("");
    onReset();
  };

  // Phase determination
  const phase: "intake" | "scanning" | "results" =
    state ? "results" : isRunning ? "scanning" : "intake";

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", marginTop: "2rem" }}>
      {/* Error banner */}
      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "0.75rem",
            padding: "1rem 1.25rem",
            marginBottom: "1.25rem",
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: "8px",
          }}
        >
          <AlertTriangle size={18} color="var(--red-400)" style={{ flexShrink: 0, marginTop: "2px" }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--red-400)", marginBottom: "0.25rem" }}>
              Error
            </p>
            <p style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>{error}</p>
          </div>
          <button
            className="btn btn--secondary"
            style={{ padding: "0.3rem 0.8rem" }}
            onClick={handleReset}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Phase content */}
      {phase === "intake" && (
        <div className="panel" style={{ padding: "2rem" }}>
          <div style={{ marginBottom: "1.5rem" }}>
            <h2 style={{ fontWeight: 600, fontSize: "1.25rem", color: "var(--text-primary)", marginBottom: "0.5rem" }}>
              New Task Execution
            </h2>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
              Upload documents or select a demo scenario to initiate autonomous analysis.
            </p>
          </div>
          <IntakeZone
            files={files}
            query={query}
            onFilesChange={setFiles}
            onQueryChange={setQuery}
            onSubmit={handleSubmit}
          />
        </div>
      )}

      {phase === "scanning" && (
        <div className="panel" style={{ padding: "2rem" }}>
          <ScanningPhase files={files} query={query} />
        </div>
      )}

      {phase === "results" && state && (
        <ResultsPhase state={state} onReset={handleReset} onSubmitApproval={onSubmitApproval} />
      )}
    </div>
  );
};
