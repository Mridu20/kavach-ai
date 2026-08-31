import React from "react";
import { CheckCircle2, XCircle, ShieldAlert, Sparkles, Lock } from "lucide-react";
import { VerificationResult } from "../types/agent";

interface VerificationBadgeProps {
  verification?: VerificationResult;
}

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({ verification }) => {
  if (!verification) {
    return (
      <div
        style={{
          padding: "0.85rem 1.25rem",
          background: "rgba(15, 23, 42, 0.6)",
          border: "1px dashed #334155",
          borderRadius: "10px",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          color: "#94a3b8",
          fontSize: "0.85rem",
        }}
      >
        <Sparkles size={18} color="#64748b" />
        <span>Self-Verification engine armed. Will run automatically post execution.</span>
      </div>
    );
  }

  return (
    <div
      style={{
        background: verification.verified
          ? "linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(6, 95, 70, 0.15) 100%)"
          : "linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(153, 27, 27, 0.15) 100%)",
        border: verification.verified
          ? "1px solid rgba(16, 185, 129, 0.4)"
          : "1px solid rgba(239, 68, 68, 0.4)",
        borderRadius: "12px",
        padding: "1.25rem",
        boxShadow: verification.verified
          ? "0 0 20px rgba(16, 185, 129, 0.15)"
          : "0 0 20px rgba(239, 68, 68, 0.15)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
          {verification.verified ? (
            <div
              style={{
                background: "rgba(16, 185, 129, 0.2)",
                padding: "0.35rem",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CheckCircle2 size={20} color="#34d399" />
            </div>
          ) : (
            <div
              style={{
                background: "rgba(239, 68, 68, 0.2)",
                padding: "0.35rem",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ShieldAlert size={20} color="#f87171" />
            </div>
          )}

          <div>
            <h4
              style={{
                fontSize: "0.95rem",
                fontWeight: 700,
                color: verification.verified ? "#34d399" : "#f87171",
              }}
            >
              {verification.verified
                ? "Autonomous Self-Verification PASSED"
                : "Verification Failed — Revision Triggered"}
            </h4>
            <p style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
              Attempt #{verification.attempt} • Zero-Cloud Egress Cryptographic Check
            </p>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
            background: "#0c1322",
            border: "1px solid #1e293b",
            padding: "0.25rem 0.6rem",
            borderRadius: "6px",
            fontSize: "0.75rem",
            fontFamily: "var(--font-mono)",
            color: "#34d399",
          }}
        >
          <Lock size={12} />
          <span>ZERO CLOUD LEAKS</span>
        </div>
      </div>

      {/* Grid of 4 Checks */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "0.75rem",
        }}
      >
        {verification.checks.map((c, idx) => (
          <div
            key={idx}
            style={{
              background: "#0d1527",
              border: c.passed ? "1px solid #1e293b" : "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "8px",
              padding: "0.75rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                marginBottom: "0.3rem",
              }}
            >
              {c.passed ? (
                <CheckCircle2 size={14} color="#10b981" />
              ) : (
                <XCircle size={14} color="#ef4444" />
              )}
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  color: c.passed ? "#e2e8f0" : "#fca5a5",
                }}
              >
                {c.check_name}
              </span>
            </div>
            <p
              style={{
                fontSize: "0.72rem",
                color: "#94a3b8",
                lineHeight: "1.35",
              }}
            >
              {c.details}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
