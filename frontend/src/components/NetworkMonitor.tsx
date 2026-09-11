import React, { useEffect, useState } from "react";
import { ShieldAlert, ShieldCheck, Activity, Globe } from "lucide-react";
import { fetchNetworkStats } from "../services/api";

interface NetworkConnection {
  id: string;
  destination: string;
  isExternal: boolean;
  status: string;
}

export const NetworkMonitor: React.FC = () => {
  const [stats, setStats] = useState<{
    total_connections: number;
    local_count: number;
    external_count: number;
    connections: NetworkConnection[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const data = await fetchNetworkStats();
        if (!cancelled) {
          setStats(data);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to reach backend network monitor.");
        }
      }
    };

    poll();
    const interval = setInterval(poll, 2000); // real live polling, every 2s
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div style={{ width: "100%" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontWeight: 700, fontSize: "1.25rem", color: "var(--brand-navy)", marginBottom: "0.4rem" }}>
          Real-Time Air-Gap & Network Sovereignty Monitor
        </h2>
        <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
          Active socket audit verified locally every 2 seconds to guarantee zero egress data leakage to external clouds.
        </p>
      </div>

      {error && (
        <div className="panel" style={{ padding: "1rem", marginBottom: "1rem", borderColor: "#fecaca", background: "#fef2f2", color: "var(--red-500)", fontSize: "0.85rem" }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem", marginBottom: "1.5rem" }}>
        <div className="panel" style={{ padding: "1.25rem 1.5rem", background: "#ffffff" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
            <Activity size={16} color="var(--brand-blue)" />
            <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>Active Sockets</span>
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--brand-navy)" }}>
            {stats?.total_connections ?? "—"}
          </div>
        </div>

        <div className="panel" style={{ padding: "1.25rem 1.5rem", background: "#ffffff" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
            <ShieldCheck size={16} color="var(--green-600)" />
            <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>Local/On-Premise Traffic</span>
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--green-600)" }}>
            {stats?.local_count ?? "—"}
          </div>
        </div>

        <div
          className="panel"
          style={{
            padding: "1.25rem 1.5rem",
            background: "#ffffff",
            border: stats && stats.external_count > 0 ? "1px solid #fecaca" : undefined,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
            <ShieldAlert size={16} color={stats && stats.external_count > 0 ? "var(--red-500)" : "var(--text-dim)"} />
            <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>External Outbound Leaks</span>
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: stats && stats.external_count > 0 ? "var(--red-500)" : "var(--green-600)" }}>
            {stats?.external_count ?? 0}
          </div>
        </div>
      </div>

      <div className="panel" style={{ overflow: "hidden", background: "#ffffff" }}>
        <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border-dim)", background: "#f8fafc" }}>
          <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--brand-navy)" }}>
            Live Network Connections Audit Log
          </h3>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.825rem", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border-dim)", background: "#f1f5f9", color: "var(--text-secondary)" }}>
                <th style={{ padding: "0.75rem 1.25rem", fontWeight: 600 }}>Destination Socket / Peer</th>
                <th style={{ padding: "0.75rem 1.25rem", fontWeight: 600 }}>Classification Status</th>
              </tr>
            </thead>
            <tbody>
              {(stats?.connections ?? []).map((conn) => (
                <tr
                  key={conn.id}
                  style={{
                    borderBottom: "1px solid var(--border-dim)",
                    background: conn.isExternal ? "#fef2f2" : "#ffffff",
                  }}
                >
                  <td style={{ padding: "0.75rem 1.25rem", color: "var(--text-primary)", fontWeight: 500, fontFamily: "var(--font-mono)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      {conn.isExternal ? <Globe size={15} color="var(--red-500)" /> : <Activity size={15} color="var(--green-600)" />}
                      {conn.destination}
                    </div>
                  </td>
                  <td style={{ padding: "0.75rem 1.25rem" }}>
                    <span
                      style={{
                        padding: "0.2rem 0.5rem",
                        borderRadius: "4px",
                        background: conn.isExternal ? "#fef2f2" : "#f0fdf4",
                        color: conn.isExternal ? "var(--red-500)" : "var(--green-600)",
                        border: `1px solid ${conn.isExternal ? "#fecaca" : "#bbf7d0"}`,
                        fontWeight: 700,
                        fontSize: "0.725rem",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {conn.isExternal ? "FLAGGED EXTERNAL" : "VERIFIED AIR-GAPPED"}
                    </span>
                  </td>
                </tr>
              ))}
              {stats && stats.connections.length === 0 && (
                <tr>
                  <td colSpan={2} style={{ padding: "1.5rem", color: "var(--text-muted)", textAlign: "center" }}>
                    No active outbound connections detected. System clean and sovereign.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

