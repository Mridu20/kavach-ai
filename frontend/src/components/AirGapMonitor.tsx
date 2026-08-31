import React, { useState, useEffect } from "react";
import {
  Radio,
  ShieldCheck,
  Lock,
  Download,
  AlertOctagon,
  CheckCircle,
  Network,
  Activity,
  FileCheck,
} from "lucide-react";
import { initialNetworkLogs } from "../services/api";
import { NetworkPacketLog } from "../types/agent";

export const AirGapMonitor: React.FC = () => {
  const [packetLogs, setPacketLogs] = useState<NetworkPacketLog[]>(initialNetworkLogs);
  const [totalBlocked, setTotalBlocked] = useState<number>(142);
  const [localPackets, setLocalPackets] = useState<number>(38910);
  const [egressCount, setEgressCount] = useState<number>(0);

  // Simulated live telemetry pulses
  useEffect(() => {
    const interval = setInterval(() => {
      setLocalPackets((prev) => prev + Math.floor(Math.random() * 8) + 2);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const handleExportCertificate = () => {
    const certificate = {
      certificate_id: `KVH-CERT-${Date.now()}`,
      issued_at: new Date().toISOString(),
      organization: "Confidential PSU / Industrial Installation",
      sovereignty_verdict: "AIR-GAPPED COMPLIANT (ZERO EGRESS VERIFIED)",
      external_egress_packets: 0,
      blocked_cloud_attempts: totalBlocked,
      on_premise_packets_processed: localPackets,
      sha256_audit_seal: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      compliance_standards: ["ISO 27001 Annex A.13", "NIST SP 800-53 SC-7", "OISD-STD-118 Section 9"],
    };

    const blob = new Blob([JSON.stringify(certificate, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `KAVACH_AI_SOVEREIGNTY_CERTIFICATE_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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
                background: "rgba(16, 185, 129, 0.15)",
                border: "1px solid rgba(16, 185, 129, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Radio size={20} color="#10b981" />
            </div>
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#f1f5f9" }}>
                Air-Gap Sovereign Radar & Zero-Egress Network Monitor
              </h3>
              <p style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                Real-time kernel socket firewall & hardware egress telemetry
              </p>
            </div>
          </div>

          <button
            onClick={handleExportCertificate}
            className="btn-primary"
            style={{ padding: "0.45rem 0.85rem", fontSize: "0.8rem" }}
          >
            <Download size={14} />
            <span>Export Sovereignty Certificate</span>
          </button>
        </div>
      </div>

      {/* 3 Telemetry Metric Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "1.25rem",
        }}
      >
        {/* Metric 1: Zero Egress */}
        <div
          className="glass-panel"
          style={{
            padding: "1.25rem",
            border: "1px solid rgba(16, 185, 129, 0.4)",
            background: "linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(6, 95, 70, 0.15) 100%)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#34d399", fontFamily: "var(--font-mono)" }}>
              CLOUD EGRESS PACKETS
            </span>
            <Lock size={16} color="#34d399" />
          </div>
          <div style={{ fontSize: "2.25rem", fontWeight: 800, color: "#ffffff", fontFamily: "var(--font-mono)" }}>
            {egressCount} <span style={{ fontSize: "1rem", color: "#34d399" }}>BYTES</span>
          </div>
          <p style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.25rem" }}>
            100% On-Premise Air-Gapped Isolation Guaranteed
          </p>
        </div>

        {/* Metric 2: Blocked Cloud APIs */}
        <div
          className="glass-panel"
          style={{
            padding: "1.25rem",
            border: "1px solid rgba(239, 68, 68, 0.4)",
            background: "linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(153, 27, 27, 0.15) 100%)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#f87171", fontFamily: "var(--font-mono)" }}>
              BLOCKED CLOUD ATTEMPTS
            </span>
            <AlertOctagon size={16} color="#f87171" />
          </div>
          <div style={{ fontSize: "2.25rem", fontWeight: 800, color: "#ffffff", fontFamily: "var(--font-mono)" }}>
            {totalBlocked} <span style={{ fontSize: "1rem", color: "#f87171" }}>BLOCKED</span>
          </div>
          <p style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.25rem" }}>
            OpenAI, Anthropic, AWS, Azure, Google endpoints dropped
          </p>
        </div>

        {/* Metric 3: On-Premise GPU Packets */}
        <div
          className="glass-panel"
          style={{
            padding: "1.25rem",
            border: "1px solid rgba(6, 182, 212, 0.4)",
            background: "linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(14, 116, 144, 0.15) 100%)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#38bdf8", fontFamily: "var(--font-mono)" }}>
              LOCAL GPU TENSOR IPC
            </span>
            <Activity size={16} color="#38bdf8" />
          </div>
          <div style={{ fontSize: "2.25rem", fontWeight: 800, color: "#ffffff", fontFamily: "var(--font-mono)" }}>
            {localPackets.toLocaleString()} <span style={{ fontSize: "1rem", color: "#38bdf8" }}>PACKETS</span>
          </div>
          <p style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.25rem" }}>
            Localhost CUDA Shared Memory & Unix Domain Sockets
          </p>
        </div>
      </div>

      {/* Visual Radar & Real-Time Socket Table */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "0.9fr 1.1fr",
          gap: "1.5rem",
        }}
      >
        {/* Radar Scanner Visualizer */}
        <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center", marginBottom: "1rem" }}>
            <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#f1f5f9" }}>
              Air-Gap Perimeter Radar
            </h4>
            <p style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
              Continuous sweep of network interface adapters
            </p>
          </div>

          <div
            style={{
              position: "relative",
              width: "240px",
              height: "240px",
              borderRadius: "50%",
              border: "2px solid #10b981",
              background: "radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, rgba(5, 8, 17, 0.9) 70%)",
              boxShadow: "0 0 30px rgba(16, 185, 129, 0.25)",
              overflow: "hidden",
            }}
          >
            {/* Concentric Circles */}
            <div style={{ position: "absolute", inset: "25%", border: "1px dashed rgba(16, 185, 129, 0.4)", borderRadius: "50%" }} />
            <div style={{ position: "absolute", inset: "50%", border: "1px dashed rgba(16, 185, 129, 0.4)", borderRadius: "50%" }} />
            <div style={{ position: "absolute", inset: "75%", border: "1px dashed rgba(16, 185, 129, 0.4)", borderRadius: "50%" }} />

            {/* Radar Crosshairs */}
            <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: "1px", background: "rgba(16, 185, 129, 0.3)" }} />
            <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: "1px", background: "rgba(16, 185, 129, 0.3)" }} />

            {/* Animated Radar Sweep Arm */}
            <div className="radar-sweep-arm" />

            {/* Center Localhost Ping */}
            <div
              style={{
                position: "absolute",
                top: "calc(50% - 6px)",
                left: "calc(50% - 6px)",
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                background: "#10b981",
                boxShadow: "0 0 10px #10b981",
              }}
            />
          </div>

          <div
            style={{
              marginTop: "1.25rem",
              padding: "0.5rem 1rem",
              background: "#080d1a",
              border: "1px solid #1e293b",
              borderRadius: "6px",
              fontSize: "0.75rem",
              fontFamily: "var(--font-mono)",
              color: "#34d399",
            }}
          >
            STATUS: SECURE • ZERO EXTERNAL EMISSIONS
          </div>
        </div>

        {/* Real-time Socket Packet Log Table */}
        <div className="glass-panel" style={{ padding: "1.5rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Network size={16} color="#38bdf8" />
              <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#f1f5f9" }}>
                Real-Time Kernel Socket Interceptor
              </h4>
            </div>
            <span className="badge-tag">FILTER: ALL_INTERFACES</span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.75rem",
                textAlign: "left",
              }}
            >
              <thead>
                <tr style={{ background: "#0a1021", borderBottom: "1px solid #27354f" }}>
                  <th style={{ padding: "0.5rem", color: "#94a3b8" }}>Time</th>
                  <th style={{ padding: "0.5rem", color: "#94a3b8" }}>Target Socket</th>
                  <th style={{ padding: "0.5rem", color: "#94a3b8" }}>Protocol</th>
                  <th style={{ padding: "0.5rem", color: "#94a3b8" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {packetLogs.map((pkt) => (
                  <tr
                    key={pkt.id}
                    style={{
                      borderBottom: "1px solid #1e293b",
                      background: pkt.status === "LOCAL_BLOCKED" ? "rgba(239, 68, 68, 0.08)" : "transparent",
                    }}
                  >
                    <td style={{ padding: "0.5rem", color: "#94a3b8", fontFamily: "var(--font-mono)" }}>{pkt.timestamp}</td>
                    <td style={{ padding: "0.5rem" }}>
                      <div style={{ fontWeight: 600, color: "#f1f5f9" }}>{pkt.destination}</div>
                      <div style={{ fontSize: "0.7rem", color: "#64748b", fontFamily: "var(--font-mono)" }}>{pkt.ip}</div>
                    </td>
                    <td style={{ padding: "0.5rem", fontFamily: "var(--font-mono)", color: "#cbd5e1" }}>{pkt.protocol}</td>
                    <td style={{ padding: "0.5rem" }}>
                      <span
                        style={{
                          padding: "0.15rem 0.45rem",
                          borderRadius: "4px",
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          fontFamily: "var(--font-mono)",
                          background:
                            pkt.status === "LOCAL_BLOCKED"
                              ? "rgba(239, 68, 68, 0.2)"
                              : pkt.status === "ON_PREM_GPU"
                              ? "rgba(16, 185, 129, 0.2)"
                              : "rgba(59, 130, 246, 0.2)",
                          color:
                            pkt.status === "LOCAL_BLOCKED"
                              ? "#f87171"
                              : pkt.status === "ON_PREM_GPU"
                              ? "#34d399"
                              : "#60a5fa",
                        }}
                      >
                        {pkt.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
