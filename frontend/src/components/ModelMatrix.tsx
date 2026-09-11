import React from "react";
import { activeModelsList } from "../services/api";
import { Cpu, CheckCircle2, RotateCw, Activity } from "lucide-react";

export const ModelMatrix: React.FC = () => {
  return (
    <div style={{ width: "100%" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontWeight: 700, fontSize: "1.25rem", color: "var(--brand-navy)", marginBottom: "0.4rem" }}>
          Autonomous Model Routing Matrix
        </h2>
        <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
          The sovereign orchestration engine auto-routes tasks to optimal local models based on task domain, context length, and GPU VRAM constraints.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(480px, 1fr))", gap: "1.25rem" }}>
        {activeModelsList.map((model) => (
          <div key={model.id} className="panel" style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.85rem", background: "#ffffff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--brand-navy)", marginBottom: "0.2rem" }}>
                  {model.name}
                </h3>
                <span style={{ fontSize: "0.775rem", color: "var(--brand-blue)", fontWeight: 600 }}>
                  {model.specialization}
                </span>
              </div>
              <div
                style={{
                  padding: "0.25rem 0.6rem",
                  borderRadius: "6px",
                  fontSize: "0.725rem",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  background: model.status === "ACTIVE" ? "#f0fdf4" : model.status === "ROUTED" ? "#f0f9ff" : "#f1f5f9",
                  color: model.status === "ACTIVE" ? "var(--green-600)" : model.status === "ROUTED" ? "var(--brand-blue)" : "var(--text-muted)",
                  border: `1px solid ${model.status === "ACTIVE" ? "#bbf7d0" : model.status === "ROUTED" ? "#bae6fd" : "var(--border-dim)"}`
                }}
              >
                {model.status === "ACTIVE" ? <CheckCircle2 size={13} /> : model.status === "ROUTED" ? <RotateCw size={13} /> : <Activity size={13} />}
                {model.status}
              </div>
            </div>

            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.45 }}>
              {model.description}
            </p>

            <div style={{ marginTop: "auto", display: "flex", gap: "1rem", borderTop: "1px solid var(--border-dim)", paddingTop: "0.85rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                <Cpu size={14} color="var(--brand-blue)" />
                <span>{model.vramUsageGb} GB Dedicated VRAM</span>
              </div>
              <div style={{ width: "1px", background: "var(--border-dim)" }} />
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>Quantization:</span>
                <span style={{ fontFamily: "var(--font-mono)" }}>{model.weightsFormat}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

