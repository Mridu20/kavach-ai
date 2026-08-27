import React, { useState } from "react";
import {
  Eye,
  Scan,
  Layers,
  ZoomIn,
  AlertTriangle,
  FileText,
  Table,
  CheckCircle2,
  Maximize2,
} from "lucide-react";

export const MultimodalInspector: React.FC = () => {
  const [activeLayer, setActiveLayer] = useState<"ocr" | "defects" | "pid">("defects");
  const [selectedBbox, setSelectedBbox] = useState<number | null>(1);

  const defectBboxes = [
    {
      id: 1,
      label: "DEFECT: Longitudinal Weld Seam Crack (B-12)",
      coords: { top: "38%", left: "42%", width: "24%", height: "18%" },
      severity: "CRITICAL",
      confidence: 0.968,
      measured: "Length: 28.4 mm • Depth: 3.88 mm",
      statutoryCode: "ASME Sec VIII Div 1 UW-51 (Unacceptable)",
    },
    {
      id: 2,
      label: "ANOMALY: Localized Pitting Corrosion Zone",
      coords: { top: "62%", left: "18%", width: "16%", height: "14%" },
      severity: "HIGH",
      confidence: 0.912,
      measured: "Remaining wall: 4.12 mm (48.5% loss)",
      statutoryCode: "OISD-STD-118 Section 4.2.1",
    },
    {
      id: 3,
      label: "TAG: Emergency Relief Nozzle Flange N-3",
      coords: { top: "20%", left: "68%", width: "15%", height: "15%" },
      severity: "NORMAL",
      confidence: 0.985,
      measured: "ANSI Class 300 RF Flange Gasket integrity OK",
      statutoryCode: "ASME B16.5",
    },
  ];

  const extractedTables = [
    {
      seam: "WELD-B12-LONG",
      location: "Elevation +14.2m",
      nominal: "8.00 mm",
      measured: "4.12 mm",
      lossPercent: "48.5%",
      verdict: "DERATE / REPAIR",
    },
    {
      seam: "CIRC-C04-TOP",
      location: "Top Dish Head",
      nominal: "10.00 mm",
      measured: "9.20 mm",
      lossPercent: "8.0%",
      verdict: "ACCEPTABLE",
    },
    {
      seam: "NOZZLE-N1-INLET",
      location: "Feed Nozzle Neck",
      nominal: "12.50 mm",
      measured: "11.10 mm",
      lossPercent: "11.2%",
      verdict: "ACCEPTABLE",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header Banner */}
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
                background: "rgba(6, 182, 212, 0.15)",
                border: "1px solid rgba(6, 182, 212, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Eye size={20} color="#06b6d4" />
            </div>
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#f1f5f9" }}>
                Multimodal OCR & Engineering Drawing Vision Lab
              </h3>
              <p style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                Local Vision LLM (LLaVA / Qwen2-VL) running on on-premise GPU tensor cores
              </p>
            </div>
          </div>

          {/* Layer Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <button
              onClick={() => setActiveLayer("defects")}
              className={activeLayer === "defects" ? "btn-primary" : "btn-secondary"}
              style={{ padding: "0.45rem 0.85rem", fontSize: "0.75rem" }}
            >
              <Scan size={14} />
              <span>Defect Detection Overlay</span>
            </button>

            <button
              onClick={() => setActiveLayer("ocr")}
              className={activeLayer === "ocr" ? "btn-primary" : "btn-secondary"}
              style={{ padding: "0.45rem 0.85rem", fontSize: "0.75rem" }}
            >
              <FileText size={14} />
              <span>OCR Bounding Box Layer</span>
            </button>

            <button
              onClick={() => setActiveLayer("pid")}
              className={activeLayer === "pid" ? "btn-primary" : "btn-secondary"}
              style={{ padding: "0.45rem 0.85rem", fontSize: "0.75rem" }}
            >
              <Layers size={14} />
              <span>P&ID Valve Schematic Overlay</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Inspection Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 0.8fr",
          gap: "1.5rem",
        }}
      >
        {/* LEFT: Scanned Document & Defect Canvas */}
        <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span className="badge-tag">DOC: VESSEL_UT_SCAN_PAGE_3.PNG</span>
              <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Resolution: 2400 x 1800 px</span>
            </div>
            <span style={{ fontSize: "0.75rem", color: "#34d399", fontFamily: "var(--font-mono)" }}>
              ● 100% LOCAL TENSOR INFERENCE
            </span>
          </div>

          {/* Interactive Inspection Canvas */}
          <div
            style={{
              position: "relative",
              background: "#070c18",
              border: "1px solid #27354f",
              borderRadius: "10px",
              height: "440px",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Simulated Technical Diagram Background */}
            <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.65 }}>
              <defs>
                <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#1e293b" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />

              {/* Vessel Drawing Outline */}
              <rect x="25%" y="15%" width="50%" height="70%" rx="30" fill="none" stroke="#38bdf8" strokeWidth="2" />
              <line x1="25%" y1="45%" x2="75%" y2="45%" stroke="#ef4444" strokeWidth="3" strokeDasharray="6 3" />
              <text x="27%" y="43%" fill="#ef4444" fontSize="12" fontFamily="monospace" fontWeight="bold">
                WELD SEAM B-12 (CRACK DETECTED)
              </text>

              {/* Nozzle Outlets */}
              <rect x="75%" y="22%" width="12%" height="10%" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
              <text x="77%" y="28%" fill="#94a3b8" fontSize="10" fontFamily="monospace">N-3 RELIEF</text>

              <circle cx="32%" cy="68%" r="24" fill="rgba(245, 158, 11, 0.15)" stroke="#f59e0b" strokeWidth="2" />
              <text x="28%" y="70%" fill="#f59e0b" fontSize="11" fontFamily="monospace">PIT-4</text>
            </svg>

            {/* Interactive Bounding Boxes */}
            {defectBboxes.map((b) => (
              <div
                key={b.id}
                onClick={() => setSelectedBbox(b.id)}
                style={{
                  position: "absolute",
                  top: b.coords.top,
                  left: b.coords.left,
                  width: b.coords.width,
                  height: b.coords.height,
                  border:
                    selectedBbox === b.id
                      ? "2px solid #38bdf8"
                      : b.severity === "CRITICAL"
                      ? "2px dashed #ef4444"
                      : b.severity === "HIGH"
                      ? "2px dashed #f59e0b"
                      : "2px dashed #10b981",
                  backgroundColor:
                    selectedBbox === b.id
                      ? "rgba(56, 189, 248, 0.2)"
                      : b.severity === "CRITICAL"
                      ? "rgba(239, 68, 68, 0.15)"
                      : "rgba(16, 185, 129, 0.1)",
                  cursor: "pointer",
                  borderRadius: "4px",
                  boxShadow: selectedBbox === b.id ? "0 0 16px rgba(56, 189, 248, 0.6)" : "none",
                  transition: "all 0.2s ease",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: "-22px",
                    left: "0",
                    background:
                      b.severity === "CRITICAL"
                        ? "#ef4444"
                        : b.severity === "HIGH"
                        ? "#f59e0b"
                        : "#10b981",
                    color: "#ffffff",
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    fontFamily: "var(--font-mono)",
                    padding: "0.15rem 0.4rem",
                    borderRadius: "3px",
                    whiteSpace: "nowrap",
                  }}
                >
                  #{b.id} {b.severity} ({(b.confidence * 100).toFixed(0)}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: Bounding Box Inspector & Extracted Structured Table */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Selected Feature Card */}
          {selectedBbox && (
            <div className="glass-panel" style={{ padding: "1.25rem" }}>
              {(() => {
                const b = defectBboxes.find((x) => x.id === selectedBbox);
                if (!b) return null;
                return (
                  <div>
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
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          fontFamily: "var(--font-mono)",
                          color: b.severity === "CRITICAL" ? "#f87171" : "#fbbf24",
                        }}
                      >
                        FEATURE INSPECTOR #{b.id}
                      </span>
                      <span className="badge-tag">Confidence: {(b.confidence * 100).toFixed(1)}%</span>
                    </div>

                    <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#f1f5f9", marginBottom: "0.4rem" }}>
                      {b.label}
                    </h4>

                    <div style={{ fontSize: "0.8rem", color: "#cbd5e1", marginBottom: "0.5rem" }}>
                      <strong>Measurements:</strong> {b.measured}
                    </div>

                    <div
                      style={{
                        padding: "0.6rem 0.85rem",
                        background: "#080d1a",
                        border: "1px solid #1e293b",
                        borderRadius: "6px",
                        fontSize: "0.75rem",
                        color: "#38bdf8",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      <strong>Statutory Code:</strong> {b.statutoryCode}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Extracted Structured Table */}
          <div className="glass-panel" style={{ padding: "1.25rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                marginBottom: "0.75rem",
              }}
            >
              <Table size={16} color="#10b981" />
              <h4 style={{ fontSize: "0.9rem", fontWeight: 700, color: "#f1f5f9" }}>
                Extracted Ultrasonic Inspection Table (Local OCR)
              </h4>
            </div>

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
                  <th style={{ padding: "0.5rem", color: "#94a3b8" }}>Seam</th>
                  <th style={{ padding: "0.5rem", color: "#94a3b8" }}>Nom.</th>
                  <th style={{ padding: "0.5rem", color: "#94a3b8" }}>Meas.</th>
                  <th style={{ padding: "0.5rem", color: "#94a3b8" }}>Loss</th>
                  <th style={{ padding: "0.5rem", color: "#94a3b8" }}>Verdict</th>
                </tr>
              </thead>
              <tbody>
                {extractedTables.map((row, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: "1px solid #1e293b",
                      background: row.verdict.includes("DERATE") ? "rgba(239, 68, 68, 0.1)" : "transparent",
                    }}
                  >
                    <td style={{ padding: "0.5rem", fontFamily: "var(--font-mono)", color: "#38bdf8" }}>{row.seam}</td>
                    <td style={{ padding: "0.5rem", color: "#94a3b8" }}>{row.nominal}</td>
                    <td style={{ padding: "0.5rem", fontWeight: 700, color: "#f1f5f9" }}>{row.measured}</td>
                    <td style={{ padding: "0.5rem", color: row.verdict.includes("DERATE") ? "#f87171" : "#34d399" }}>
                      {row.lossPercent}
                    </td>
                    <td style={{ padding: "0.5rem" }}>
                      <span
                        style={{
                          padding: "0.15rem 0.4rem",
                          borderRadius: "4px",
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          fontFamily: "var(--font-mono)",
                          background: row.verdict.includes("DERATE") ? "#ef4444" : "#10b981",
                          color: "#ffffff",
                        }}
                      >
                        {row.verdict}
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
