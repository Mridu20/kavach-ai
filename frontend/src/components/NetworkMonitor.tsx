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
    <div style={{ maxWidth: "1000px", margin: "0 auto", marginTop: "2rem" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontWeight: 600, fontSize: "1.25rem", color: "var(--text-primary)", marginBottom: "0.5rem" }}>
          Network Security & Sovereignty
        </h2>
        <p style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
          Live monitoring of this machine's active connections, polled from the backend every 2 seconds.
        </p>
      </div>

      {error && (
        <div className="panel" style={{ padding: "1rem", marginBottom: "1rem", borderColor: "var(--red-500)" }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
        <div className="panel" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
            <Activity size={16} />
            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Total Connections</span>
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text-primary)" }}>
            {stats?.total_connections ?? "—"}
          </div>
        </div>

        <div className="panel" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
            <ShieldCheck size={16} color="var(--green-500)" />
            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Local/On-Premise</span>
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--green-500)" }}>
            {stats?.local_count ?? "—"}
          </div>
        </div>

        <div
          className="panel"
          style={{
            padding: "1.5rem",
            border: stats && stats.external_count > 0 ? "1px solid rgba(239, 68, 68, 0.5)" : undefined,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
            <ShieldAlert size={16} color="var(--red-500)" />
            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>External (Flagged)</span>
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--red-500)" }}>
            {stats?.external_count ?? "—"}
          </div>
        </div>
      </div>

      <div className="panel" style={{ overflow: "hidden" }}>
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--border-dim)", background: "var(--bg-raised)" }}>
          <h3 style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)" }}>
            Live Connections (real, polled every 2s)
          </h3>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-dim)", color: "var(--text-muted)" }}>
                <th style={{ padding: "1rem 1.5rem", fontWeight: 500 }}>Destination</th>
                <th style={{ padding: "1rem 1.5rem", fontWeight: 500 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {(stats?.connections ?? []).map((conn) => (
                <tr
                  key={conn.id}
                  style={{
                    borderBottom: "1px solid var(--border-dim)",
                    background: conn.isExternal ? "rgba(239, 68, 68, 0.05)" : "transparent",
                  }}
                >
                  <td style={{ padding: "1rem 1.5rem", color: "var(--text-primary)", fontWeight: 500 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      {conn.isExternal ? <Globe size={14} color="var(--red-400)" /> : <Activity size={14} color="var(--green-400)" />}
                      {conn.destination}
                    </div>
                  </td>
                  <td style={{ padding: "1rem 1.5rem" }}>
                    <span
                      style={{
                        padding: "0.2rem 0.5rem",
                        borderRadius: "4px",
                        background: conn.isExternal ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.15)",
                        color: conn.isExternal ? "var(--red-500)" : "var(--green-500)",
                        fontWeight: 600,
                        fontSize: "0.75rem",
                      }}
                    >
                      {conn.isExternal ? "FLAGGED" : "ALLOWED (LOCAL)"}
                    </span>
                  </td>
                </tr>
              ))}
              {stats && stats.connections.length === 0 && (
                <tr>
                  <td colSpan={2} style={{ padding: "1.5rem", color: "var(--text-muted)", textAlign: "center" }}>
                    No active connections captured in this poll.
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
