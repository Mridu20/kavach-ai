import React, { useState } from "react";
import {
  Sparkles,
  Cpu,
  Zap,
  CheckCircle2,
  HardDrive,
  Activity,
  Layers,
  ArrowRight,
} from "lucide-react";
import { activeModelsList } from "../services/api";

export const ModelRouterMatrix: React.FC = () => {
  const [selectedTaskType, setSelectedTaskType] = useState<string>("coding");

  const routingRules = [
    {
      task: "Engineering Code & Python Sandbox",
      routedModel: "Qwen-2.5-Coder-32B-Instruct",
      rationale: "Optimized for deterministic Python AST generation, math stress formulas & syntax execution without external API dependencies.",
      latencyMs: 140,
    },
    {
      task: "Multimodal P&ID & Defect Scans",
      routedModel: "LLaVA-v1.6-34B-Vision / Qwen2-VL",
      rationale: "Equipped with high-resolution patch encoders for technical schematics, weld radiographs & scanned engineering drawings.",
      latencyMs: 280,
    },
    {
      task: "Statutory Approval Note Synthesis",
      routedModel: "Llama-3.3-70B-Instruct-Sovereign",
      rationale: "Deep executive formatting and PSU bureaucratic language generation with rigid adherence to OISD/ASME guidelines.",
      latencyMs: 310,
    },
    {
      task: "Complex Failure Mode Verification",
      routedModel: "DeepSeek-R1-Distill-Llama-70B",
      rationale: "Long-form Chain-of-Thought (CoT) reasoning for verifying structural failure theories and non-conformance edge cases.",
      latencyMs: 420,
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Top Banner */}
      <div className="glass-panel" style={{ padding: "1.25rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "8px",
                background: "rgba(139, 92, 246, 0.15)",
                border: "1px solid rgba(139, 92, 246, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Sparkles size={20} color="#a78bfa" />
            </div>
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#f1f5f9" }}>
                Multi-Model Auto-Selection Matrix
              </h3>
              <p style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                Dynamic on-premise model router with 0 cloud dependencies • Hot-swappable weights
              </p>
            </div>
          </div>

          <div className="badge-sovereign">
            <Cpu size={12} />
            <span>CUDA TENSOR CORES ACTIVE</span>
          </div>
        </div>
      </div>

      {/* Model Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: "1.25rem",
        }}
      >
        {activeModelsList.map((model) => (
          <div
            key={model.id}
            className="glass-panel"
            style={{
              padding: "1.25rem",
              border:
                model.status === "ACTIVE"
                  ? "1px solid #10b981"
                  : model.status === "ROUTED"
                  ? "1px solid #3b82f6"
                  : "1px solid #1e293b",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "0.75rem",
              }}
            >
              <span
                style={{
                  fontSize: "0.7rem",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  padding: "0.2rem 0.5rem",
                  borderRadius: "4px",
                  background:
                    model.status === "ACTIVE"
                      ? "rgba(16, 185, 129, 0.2)"
                      : model.status === "ROUTED"
                      ? "rgba(59, 130, 246, 0.2)"
                      : "rgba(100, 116, 139, 0.2)",
                  color:
                    model.status === "ACTIVE"
                      ? "#34d399"
                      : model.status === "ROUTED"
                      ? "#60a5fa"
                      : "#94a3b8",
                }}
              >
                ● {model.status}
              </span>

              <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontFamily: "var(--font-mono)" }}>
                {model.tokenThroughput} t/s
              </span>
            </div>

            <h4 style={{ fontSize: "1rem", fontWeight: 700, color: "#f1f5f9", marginBottom: "0.25rem" }}>
              {model.name}
            </h4>
            <p style={{ fontSize: "0.75rem", color: "#38bdf8", marginBottom: "0.75rem" }}>
              {model.specialization}
            </p>

            <p style={{ fontSize: "0.8rem", color: "#94a3b8", marginBottom: "1rem", lineHeight: "1.4" }}>
              {model.description}
            </p>

            {/* Spec Footer */}
            <div
              style={{
                borderTop: "1px solid #1e293b",
                paddingTop: "0.75rem",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.5rem",
                fontSize: "0.72rem",
                color: "#94a3b8",
                fontFamily: "var(--font-mono)",
              }}
            >
              <div>
                <span style={{ color: "#64748b" }}>Format: </span>
                <span style={{ color: "#e2e8f0" }}>{model.weightsFormat}</span>
              </div>
              <div>
                <span style={{ color: "#64748b" }}>VRAM: </span>
                <span style={{ color: "#34d399" }}>{model.vramUsageGb} GB</span>
              </div>
              <div>
                <span style={{ color: "#64748b" }}>Context: </span>
                <span style={{ color: "#e2e8f0" }}>{model.contextLength}</span>
              </div>
              <div>
                <span style={{ color: "#64748b" }}>Isolation: </span>
                <span style={{ color: "#38bdf8" }}>Air-Gapped</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Dynamic Routing Logic Matrix */}
      <div className="glass-panel" style={{ padding: "1.5rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "1rem",
          }}
        >
          <Zap size={18} color="#38bdf8" />
          <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#f1f5f9" }}>
            Automated Task Routing Decision Table
          </h4>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.8rem",
              textAlign: "left",
            }}
          >
            <thead>
              <tr style={{ background: "#0a1021", borderBottom: "2px solid #27354f" }}>
                <th style={{ padding: "0.75rem", color: "#94a3b8" }}>Task Requirement</th>
                <th style={{ padding: "0.75rem", color: "#94a3b8" }}>Auto-Selected Open-Weight Model</th>
                <th style={{ padding: "0.75rem", color: "#94a3b8" }}>Routing Rationale</th>
                <th style={{ padding: "0.75rem", color: "#94a3b8" }}>Avg. Latency</th>
              </tr>
            </thead>
            <tbody>
              {routingRules.map((rule, idx) => (
                <tr
                  key={idx}
                  style={{
                    borderBottom: "1px solid #1e293b",
                    background: idx % 2 === 0 ? "rgba(15, 23, 42, 0.4)" : "rgba(15, 23, 42, 0.8)",
                  }}
                >
                  <td style={{ padding: "0.75rem", fontWeight: 600, color: "#f1f5f9" }}>{rule.task}</td>
                  <td style={{ padding: "0.75rem", fontFamily: "var(--font-mono)", color: "#34d399" }}>
                    {rule.routedModel}
                  </td>
                  <td style={{ padding: "0.75rem", color: "#cbd5e1" }}>{rule.rationale}</td>
                  <td style={{ padding: "0.75rem", fontFamily: "var(--font-mono)", color: "#38bdf8" }}>
                    {rule.latencyMs} ms
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
