import React, { useState } from "react";
import {
  Database,
  Search,
  BookOpen,
  FileText,
  CheckCircle2,
  Shield,
  Layers,
  FileCheck,
} from "lucide-react";

export const KnowledgeVault: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("OISD-STD-118 corrosion allowance");
  const [selectedDoc, setSelectedDoc] = useState<string>("asme");

  const corpusDocuments = [
    {
      id: "asme",
      title: "ASME Boiler & Pressure Vessel Code (BPVC) Section VIII Div 1",
      category: "Statutory Mechanical Engineering Code",
      pages: 842,
      chunks: 3420,
      lastIndexed: "2026-08-15",
      sampleSnippet:
        "UG-27 Thickness of Shells Under Internal Pressure: Minimum calculated thickness shall include localized metal loss and corrosion allowance. Formula P = (S*E*t)/(R + 0.6*t).",
    },
    {
      id: "oisd",
      title: "OISD-STD-118: Oil Industry Safety Directorate Layout & Pressure Standards",
      category: "Hydrocarbon Safety Standard",
      pages: 184,
      chunks: 920,
      lastIndexed: "2026-08-18",
      sampleSnippet:
        "Section 4.2.1: Hydrocarbon pressure equipment showing wall thinning greater than 35% of nominal design thickness mandates immediate emergency derating or containment sleeve installation.",
    },
    {
      id: "is2825",
      title: "IS 2825: Indian Standard Code for Unfired Pressure Vessels",
      category: "National Regulatory Standard",
      pages: 310,
      chunks: 1450,
      lastIndexed: "2026-08-10",
      sampleSnippet:
        "Clause 6.3: Radiographic and Ultrasonic testing requirements for Category A and B butt welds in hydrocarbon and toxic chemical service.",
    },
    {
      id: "psu_sop",
      title: "PSU Refinery Maintenance SOP & Work Permit Manual v4.2",
      category: "Internal Confidential PSU Circular",
      pages: 96,
      chunks: 480,
      lastIndexed: "2026-08-22",
      sampleSnippet:
        "Section 7.3: Prior to resuming hydrocarbon service, Form-B statutory approval note must be signed by Chief Inspection Engineer.",
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
                background: "rgba(245, 158, 11, 0.15)",
                border: "1px solid rgba(245, 158, 11, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Database size={20} color="#fbbf24" />
            </div>
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#f1f5f9" }}>
                Knowledge Vault & Air-Gapped SOP Vector Corpus
              </h3>
              <p style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                Local Milvus / ChromaDB embeddings storage • 100% On-Premise RAG
              </p>
            </div>
          </div>

          <div className="badge-sovereign">
            <Shield size={12} />
            <span>CONFIDENTIAL CORPUS LOCKED</span>
          </div>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="glass-panel" style={{ padding: "1.25rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            background: "#080d1a",
            border: "1px solid #27354f",
            borderRadius: "8px",
            padding: "0.6rem 1rem",
          }}
        >
          <Search size={18} color="#94a3b8" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search local statutory SOPs, engineering codes, and internal circulars..."
            style={{
              width: "100%",
              background: "transparent",
              border: "none",
              color: "#f1f5f9",
              fontSize: "0.85rem",
              outline: "none",
            }}
          />
          <button className="btn-primary" style={{ padding: "0.4rem 0.85rem", fontSize: "0.75rem" }}>
            Vector Search
          </button>
        </div>
      </div>

      {/* Documents Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1.25rem",
        }}
      >
        {corpusDocuments.map((doc) => (
          <div
            key={doc.id}
            onClick={() => setSelectedDoc(doc.id)}
            className="glass-panel-interactive"
            style={{
              padding: "1.25rem",
              cursor: "pointer",
              border: selectedDoc === doc.id ? "1px solid #fbbf24" : "1px solid #1e293b",
              background: selectedDoc === doc.id ? "rgba(245, 158, 11, 0.08)" : "#0e1629",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "0.5rem",
              }}
            >
              <span className="badge-tag">{doc.category}</span>
              <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontFamily: "var(--font-mono)" }}>
                {doc.chunks} Embeddings
              </span>
            </div>

            <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#f1f5f9", marginBottom: "0.5rem" }}>
              {doc.title}
            </h4>

            <p
              style={{
                fontSize: "0.8rem",
                color: "#cbd5e1",
                fontStyle: "italic",
                marginBottom: "0.75rem",
                lineHeight: "1.4",
              }}
            >
              "{doc.sampleSnippet}"
            </p>

            <div
              style={{
                borderTop: "1px solid #1e293b",
                paddingTop: "0.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: "0.7rem",
                color: "#94a3b8",
                fontFamily: "var(--font-mono)",
              }}
            >
              <span>Pages: {doc.pages}</span>
              <span>Last Vectorized: {doc.lastIndexed}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
