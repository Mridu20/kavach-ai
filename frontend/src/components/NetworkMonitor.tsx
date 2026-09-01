import React from "react";
import { ShieldAlert, ShieldCheck, Activity, Globe } from "lucide-react";
import { initialNetworkLogs } from "../services/api";

export const NetworkMonitor: React.FC = () => {
  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", marginTop: "2rem" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontWeight: 600, fontSize: "1.25rem", color: "var(--text-primary)", marginBottom: "0.5rem" }}>
          Network Security & Sovereignty
        </h2>
        <p style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
          Real-time monitoring of outbound connections. Proves complete air-gapped execution by blocking all cloud egress.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
        <div className="panel" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
            <Activity size={16} />
            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Total Requests</span>
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text-primary)" }}>
            1,204
          </div>
        </div>

        <div className="panel" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
            <ShieldCheck size={16} color="var(--green-500)" />
            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Local/On-Premise (Allowed)</span>
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--green-500)" }}>
            1,202
          </div>
        </div>

        <div className="panel" style={{ padding: "1.5rem", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
            <ShieldAlert size={16} color="var(--red-500)" />
            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Cloud Outbound (Blocked)</span>
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--red-500)" }}>
            2
          </div>
        </div>
      </div>

      <div className="panel" style={{ overflow: "hidden" }}>
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--border-dim)", background: "var(--bg-raised)" }}>
          <h3 style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)" }}>
            Recent Traffic Log
          </h3>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-dim)", color: "var(--text-muted)" }}>
                <th style={{ padding: "1rem 1.5rem", fontWeight: 500 }}>Time</th>
                <th style={{ padding: "1rem 1.5rem", fontWeight: 500 }}>Destination</th>
                <th style={{ padding: "1rem 1.5rem", fontWeight: 500 }}>Protocol/IP</th>
                <th style={{ padding: "1rem 1.5rem", fontWeight: 500 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {initialNetworkLogs.map((log) => (
                <tr key={log.id} style={{ borderBottom: "1px solid var(--border-dim)", background: log.status === "LOCAL_BLOCKED" ? "rgba(239, 68, 68, 0.05)" : "transparent" }}>
                  <td style={{ padding: "1rem 1.5rem", color: "var(--text-dim)" }}>{log.timestamp}</td>
                  <td style={{ padding: "1rem 1.5rem", color: "var(--text-primary)", fontWeight: 500 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      {log.isExternal ? <Globe size={14} color="var(--red-400)" /> : <Activity size={14} color="var(--green-400)" />}
                      {log.destination}
                    </div>
                  </td>
                  <td style={{ padding: "1rem 1.5rem", color: "var(--text-muted)" }}>{log.ip}</td>
                  <td style={{ padding: "1rem 1.5rem" }}>
                    {log.status === "LOCAL_BLOCKED" ? (
                      <span style={{ padding: "0.2rem 0.5rem", borderRadius: "4px", background: "rgba(239, 68, 68, 0.15)", color: "var(--red-500)", fontWeight: 600, fontSize: "0.75rem" }}>
                        BLOCKED
                      </span>
                    ) : (
                      <span style={{ padding: "0.2rem 0.5rem", borderRadius: "4px", background: "rgba(16, 185, 129, 0.15)", color: "var(--green-500)", fontWeight: 600, fontSize: "0.75rem" }}>
                        ALLOWED (LOCAL)
                      </span>
                    )}
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
