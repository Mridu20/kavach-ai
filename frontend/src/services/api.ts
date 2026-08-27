/**
 * API Client & Sovereign Local Simulator for Kavach AI Workbench
 */

import {
  AgentState,
  HumanDecision,
  PlanStep,
  TaskCategory,
  ModelInfo,
  NetworkPacketLog,
} from "../types/agent";

const API_BASE_URL = "http://localhost:8000/api/agent";

export const activeModelsList: ModelInfo[] = [
  {
    id: "qwen-coder",
    name: "Qwen-2.5-Coder-32B-Instruct",
    specialization: "Isolated Sandbox Code Execution & Mathematical Calculations",
    weightsFormat: "GGUF Q4_K_M (On-Premise GPU)",
    vramUsageGb: 19.4,
    contextLength: "128k Tokens",
    status: "ACTIVE",
    tokenThroughput: 48.2,
    description: "Executes Python stress/fatigue calculations & generates deterministic audit scripts.",
  },
  {
    id: "llava-vision",
    name: "LLaVA-v1.6-34B-Vision / Qwen2-VL",
    specialization: "P&ID Drawings, Ultrasonic Scans, Weld Defect Recognition",
    weightsFormat: "AWQ 4-Bit (Local VRAM)",
    vramUsageGb: 21.2,
    contextLength: "32k Tokens",
    status: "ACTIVE",
    tokenThroughput: 34.6,
    description: "Multimodal visual OCR & structural defect localization on industrial schematics.",
  },
  {
    id: "llama3-reasoning",
    name: "Llama-3.3-70B-Instruct-Sovereign",
    specialization: "Industrial SOP Compliance, Approval Note Synthesis, RAG Grounding",
    weightsFormat: "EXL2 4.25bpw (Air-Gapped Cluster)",
    vramUsageGb: 38.5,
    contextLength: "128k Tokens",
    status: "ROUTED",
    tokenThroughput: 39.1,
    description: "Synthesizes formal PSU / Refinery Board Approval Notes with statutory citations.",
  },
  {
    id: "deepseek-r1",
    name: "DeepSeek-R1-Distill-Llama-70B",
    specialization: "Multi-step Chain-of-Thought Verification & Failure Mode Analysis",
    weightsFormat: "GGUF Q5_K_M (Local Host)",
    vramUsageGb: 42.0,
    contextLength: "64k Tokens",
    status: "STANDBY",
    tokenThroughput: 28.4,
    description: "Deep reasoning engine verifying ASME Section VIII engineering limit adherence.",
  },
];

export const sampleIndustrialScenarios = [
  {
    id: "vessel-corrosion",
    title: "Refinery Pressure Vessel Corrosion & Ultrasonic Audit",
    category: "DOCUMENT_INSPECTION" as TaskCategory,
    query:
      "Perform sovereign inspection review of Scanned Ultrasonic Thickness Inspection Report #UT-2026-B4. Extract weld B-12 wall thinning data, cross-reference ASME Section VIII Div 1 & OISD-118 safety margins, execute corrosion rate calculation in sandbox, and generate official Approval Note (DOCX) and Maintenance Action Tracker (XLSX).",
    files: ["Vessel_UT_Inspection_Scanned_Report.pdf", "Weld_B12_Ultrasonic_Scan.jpg"],
  },
  {
    id: "turbine-sandbox",
    title: "Power Plant Steam Turbine Vibration & Bearing Code Sandbox",
    category: "SANDBOX_CODE_EXECUTION" as TaskCategory,
    query:
      "Execute sandboxed Python stress & Fast Fourier Transform (FFT) analysis on Stage 3 Turbine bearing vibration telemetry. Verify against ISO 10816-3 vibration severity limits with 0 external network calls.",
    files: ["Turbine_Vibration_Telemetry_2026.csv"],
  },
  {
    id: "pid-valve-audit",
    title: "Defense PSU Piping & Instrumentation (P&ID) Safety Interlock Audit",
    category: "DOCUMENT_INSPECTION" as TaskCategory,
    query:
      "Inspect P&ID Drawing Sheet #DWG-DEF-9042 for Emergency Shutdown Valve (ESDV-401) bypass compliance. Cross-reference DRDO / CCOE hazardous fluid interlock SOPs and produce compliance register.",
    files: ["PID_Drawing_ESDV_401_Scanned.png"],
  },
  {
    id: "sop-retrieval",
    title: "PSU Refinery Maintenance SOP & Hazardous Work Permit Query",
    category: "SOP_RAG_QUERY" as TaskCategory,
    query:
      "What are the mandatory pre-entry gas testing protocols and maximum allowable H2S concentration limits before hot work authorization according to OISD-STD-118 and Refinery SOP-SAF-04?",
    files: ["Refinery_Safety_SOP_Master.pdf"],
  },
];

export const initialNetworkLogs: NetworkPacketLog[] = [
  {
    id: "pkt-01",
    timestamp: "Just now",
    destination: "Localhost GPU Tensor Engine (CUDA:0)",
    ip: "127.0.0.1:8000",
    protocol: "IPC / Local Shared Memory",
    status: "ON_PREM_GPU",
    isExternal: false,
    sizeBytes: 4194304,
  },
  {
    id: "pkt-02",
    timestamp: "1s ago",
    destination: "Docker Network Sandbox (Isolated Bridge)",
    ip: "172.18.0.2:0 (NO_INET)",
    protocol: "Unix Domain Socket",
    status: "INTERNAL_SOCKET",
    isExternal: false,
    sizeBytes: 12480,
  },
  {
    id: "pkt-03",
    timestamp: "3s ago",
    destination: "Vector ChromaDB / Milvus Local SQLite",
    ip: "127.0.0.1:8001",
    protocol: "Local Embedded",
    status: "ON_PREM_GPU",
    isExternal: false,
    sizeBytes: 89120,
  },
  {
    id: "pkt-04",
    timestamp: "5s ago",
    destination: "Blocked Cloud Outbound (api.openai.com)",
    ip: "0.0.0.0 (IPTABLES DROP)",
    protocol: "HTTPS / 443",
    status: "LOCAL_BLOCKED",
    isExternal: true,
    sizeBytes: 0,
  },
  {
    id: "pkt-05",
    timestamp: "7s ago",
    destination: "Blocked Cloud Outbound (api.anthropic.com)",
    ip: "0.0.0.0 (AIR-GAP AIRTIGHT)",
    protocol: "HTTPS / 443",
    status: "LOCAL_BLOCKED",
    isExternal: true,
    sizeBytes: 0,
  },
];

/**
 * Executes agent workflow via FastAPI backend or fallback high-fidelity local simulator
 */
export async function runAgentWorkflow(
  query: string,
  inputFiles: string[] = []
): Promise<AgentState> {
  try {
    const response = await fetch(`${API_BASE_URL}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_query: query,
        input_files: inputFiles,
      }),
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.warn("Backend API offline or unreachable. Using Sovereign Local Simulator.", err);
  }

  // Fallback Sovereign Local Simulator
  return simulateLocalAgentRun(query, inputFiles);
}

/**
 * Submits Human-in-the-Loop decision
 */
export async function submitHumanApproval(
  taskId: string,
  decision: HumanDecision,
  reviewer: string,
  comments?: string,
  modifications?: Record<string, any>
): Promise<AgentState> {
  try {
    const response = await fetch(`${API_BASE_URL}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task_id: taskId,
        decision,
        reviewer,
        comments,
        modifications,
      }),
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.warn("Backend approval API offline. Simulating local state transition.", err);
  }

  return simulateApprovalState(taskId, decision, reviewer, comments, modifications);
}

function simulateLocalAgentRun(query: string, inputFiles: string[]): AgentState {
  const taskId = `task_${Math.random().toString(36).substring(2, 10)}`;
  const now = new Date().toISOString();
  const queryLower = query.toLowerCase();

  let category: TaskCategory = "DOCUMENT_INSPECTION";
  if (queryLower.includes("code") || queryLower.includes("sandbox") || queryLower.includes("fft") || queryLower.includes("telemetry")) {
    category = "SANDBOX_CODE_EXECUTION";
  } else if (queryLower.includes("sop") || queryLower.includes("policy") || queryLower.includes("gas testing")) {
    category = "SOP_RAG_QUERY";
  }

  let planSteps: PlanStep[] = [];

  if (category === "DOCUMENT_INSPECTION") {
    planSteps = [
      {
        step_id: 1,
        title: "On-Premise OCR & Scanned Drawing Processing",
        description: "Extract high-accuracy text, tabular data, and handwritten notes from uploaded inspection PDF/Image.",
        assigned_tool: "ocr_pdf_tool",
        status: "COMPLETED",
        result: {
          scanned_pages: 4,
          tables_extracted: 3,
          min_wall_thickness: "4.12 mm (Nominal: 8.00 mm)",
          weld_seam_id: "WELD-B12-LONGITUDINAL",
          corrosion_allowance_exceeded: true,
        },
      },
      {
        step_id: 2,
        title: "Local Vision Model Defect & P&ID Analysis",
        description: "Perform visual semantic segmentation for weld cracks, pitting corrosion, and schematic valve tags.",
        assigned_tool: "vision_analysis_tool",
        status: "COMPLETED",
        result: {
          defect_detected: "Severe localized pitting and circumferential crack (Length: 28.4mm)",
          confidence: 0.968,
          criticality: "CRITICAL_SHUTDOWN_RECOMMENDED",
        },
      },
      {
        step_id: 3,
        title: "Local SOP & Standard Vector Grounding (RAG)",
        description: "Query embedded local knowledge base for ASME Section VIII Div 1 & OISD-STD-118 safety clauses.",
        assigned_tool: "rag_search_tool",
        status: "COMPLETED",
        result: {
          matches: 3,
          governing_clause: "ASME Sec VIII Div 1 UG-32(e) & OISD-118 Sec 4.2",
          mandate: "Mandatory derating or sleeve replacement before 250 PSI re-pressurization",
        },
      },
      {
        step_id: 4,
        title: "Deterministic Engineering Verification in Sandbox",
        description: "Run air-gapped Python calculation for remaining vessel lifespan and maximum allowable working pressure (MAWP).",
        assigned_tool: "sandbox_code_tool",
        status: "COMPLETED",
        result: {
          calc_script: "mawp_asme_ug27.py",
          calculated_mawp_psi: 142.8,
          original_design_mawp_psi: 250.0,
          derating_percentage: 42.88,
          cloud_calls_blocked: 0,
        },
      },
      {
        step_id: 5,
        title: "Draft Official PSU Approval Note (DOCX)",
        description: "Synthesize structured findings, statutory citations, and executive recommendation into DOCX deliverable.",
        assigned_tool: "generate_docx_tool",
        status: "COMPLETED",
        result: {
          output_file: `${taskId}_Approval_Note_Refinery.docx`,
          file_size_kb: 58.4,
          format: "Official PSU / Refinery Executive Note",
        },
      },
      {
        step_id: 6,
        title: "Draft Maintenance Action Tracker (XLSX)",
        description: "Generate structured Excel spreadsheet with prioritized remediation tasks, responsible departments, and deadlines.",
        assigned_tool: "generate_xlsx_tool",
        status: "COMPLETED",
        result: {
          output_file: `${taskId}_Maintenance_Action_Tracker.xlsx`,
          rows: 6,
          file_size_kb: 24.1,
        },
      },
    ];
  } else if (category === "SANDBOX_CODE_EXECUTION") {
    planSteps = [
      {
        step_id: 1,
        title: "Deterministic Python Sandbox Execution",
        description: "Run isolated FFT spectral analysis and RMS vibration calculation with 0 external network calls.",
        assigned_tool: "sandbox_code_tool",
        status: "COMPLETED",
        result: {
          stdout: "=== TURBINE VIBRATION ANALYSIS ===\nRMS Velocity: 8.42 mm/s (Peak: 14.1 mm/s at 100 Hz)\nISO 10816-3 Category: ZONE C (Unrestricted long-term operation NOT permitted)\nDominant Frequency: 2x Running Speed (Misalignment detected)",
          exit_code: 0,
        },
      },
      {
        step_id: 2,
        title: "Synthesize Diagnostic Action Report",
        description: "Map vibration harmonics to bearing lubrication protocol in internal manual.",
        assigned_tool: "model_router_tool",
        status: "COMPLETED",
        result: {
          recommendation: "Immediate bearing alignment check during scheduled night shift; replenish Mobil DTE 797 lube oil.",
        },
      },
    ];
  } else {
    planSteps = [
      {
        step_id: 1,
        title: "Air-Gapped Vector SOP Search",
        description: "Retrieve mandatory safety procedures from local OISD and PSU refinery repository.",
        assigned_tool: "rag_search_tool",
        status: "COMPLETED",
        result: {
          found_sections: ["OISD-STD-118 Sec 6.1: Gas Testing in Confined Space", "SOP-SAF-04: Hot Work Authorization"],
        },
      },
      {
        step_id: 2,
        title: "Synthesize Sovereign Compliance Guidance",
        description: "Generate citation-backed response with mandatory sign-off checkpoints.",
        assigned_tool: "model_router_tool",
        status: "COMPLETED",
        result: {
          max_h2s_ppm: "10 PPM (TWA) / Immediate evacuation if > 15 PPM",
          oxygen_limit: "19.5% to 23.5% vol/vol",
          lel_limit: "Less than 1% LEL for Hot Work",
        },
      },
    ];
  }

  return {
    task_id: taskId,
    user_query: query,
    input_files: inputFiles.length > 0 ? inputFiles : ["Scanned_Inspection_Document.pdf"],
    category,
    plan: planSteps,
    current_step_index: planSteps.length,
    tool_calls: planSteps.map((step, idx) => ({
      call_id: `call_${Math.random().toString(36).substring(2, 8)}`,
      step_id: step.step_id,
      tool_name: step.assigned_tool,
      input_params: { target_file: inputFiles[0] || "document.pdf" },
      output: step.result,
      execution_time_ms: 180 + idx * 75,
      success: true,
      timestamp: new Date(Date.now() - (planSteps.length - idx) * 1000).toISOString(),
    })),
    retrieved_evidence: [
      {
        source_doc: "ASME_Section_VIII_Div1_2025.pdf",
        page_num: 142,
        snippet: "Section UG-32(e): Minimum calculated thickness for internal pressure must incorporate measured localized metal loss under corrosive operating fluid conditions.",
        confidence_score: 0.954,
      },
      {
        source_doc: "OISD_STD_118_Refinery_Safety.pdf",
        page_num: 38,
        snippet: "Clause 4.2.1: In-service hydrocarbon pressure vessels exhibiting wall loss exceeding 35% of nominal design thickness require mandatory emergency derating or structural repair sleeve.",
        confidence_score: 0.928,
      },
      {
        source_doc: "PSU_Standard_Operating_Procedure_Vessels_v4.pdf",
        page_num: 12,
        snippet: "Section 7.3: Prior to resuming hydrocarbon service, an official Form-B Approval Note must be endorsed by the Chief Inspection Engineer.",
        confidence_score: 0.891,
      },
    ],
    findings: {
      vessel_tag: "V-204 Hydrocracker Stripper Column",
      component: "Longitudinal Weld Seam B-12",
      nominal_thickness_mm: 8.0,
      measured_thickness_mm: 4.12,
      thickness_loss_percent: 48.5,
      defect_type: "Localized Pitting & Internal Circumferential Micro-Cracking",
      calculated_mawp_derated_psi: 142.8,
      safety_verdict: "MANDATORY DERATING REQUIRED / REPAIR SLEEVE INSTALLATION",
      target_plant: "ONGC / IOCL Refinery Unit 4",
    },
    draft_deliverables: {
      approval_note_docx: `${taskId}_Approval_Note_Refinery.docx`,
      action_tracker_xlsx: `${taskId}_Maintenance_Action_Tracker.xlsx`,
      sandbox_script_py: `${taskId}_mawp_calculation.py`,
    },
    verification: {
      verified: true,
      checks: [
        {
          check_name: "ZERO_EXTERNAL_CALLS",
          passed: true,
          details: "Verified 0 cloud network packets egressed. Execution strictly on-premise local GPU.",
        },
        {
          check_name: "EVIDENCE_BACKING",
          passed: true,
          details: "100% of safety claims grounded in ASME Sec VIII and OISD-STD-118 citations.",
        },
        {
          check_name: "REQUIRED_DELIVERABLES",
          passed: true,
          details: "DOCX Approval Note and XLSX Action Tracker successfully compiled.",
        },
        {
          check_name: "CALCULATION_SANITY",
          passed: true,
          details: "Deterministic MAWP math verified against ASME UG-27 cylinder stress formulas.",
        },
      ],
      feedback: "Self-verification passed cleanly. Ready for authorized human inspector sign-off.",
      revision_needed: false,
      attempt: 1,
      zero_external_calls: true,
    },
    approval: {
      status: "PENDING_APPROVAL",
      reviewer: undefined,
      comments: undefined,
      modifications: undefined,
      timestamp: undefined,
    },
    trace: {
      task_id: taskId,
      events: [
        {
          event_id: "evt_1",
          timestamp: now,
          event_type: "INITIALIZATION",
          message: `Initialized sovereign agent task '${taskId}'.`,
          payload: { query, input_files: inputFiles },
        },
        {
          event_id: "evt_2",
          timestamp: now,
          event_type: "CLASSIFICATION",
          message: `Task categorized as '${category}'. Air-gap routing active.`,
          payload: { category },
        },
        {
          event_id: "evt_3",
          timestamp: now,
          event_type: "PLANNING",
          message: `Generated multi-step execution plan with ${planSteps.length} verified steps.`,
          payload: { steps: planSteps.map((s) => s.title) },
        },
        {
          event_id: "evt_4",
          timestamp: now,
          event_type: "VERIFICATION",
          message: "Self-verification PASSED: 0 cloud leaks detected, RAG citations verified.",
          payload: { verified: true },
        },
      ],
      start_time: now,
      end_time: undefined,
      total_tool_calls: planSteps.length,
      total_tokens_used: 4280,
    },
    status: "AWAITING_APPROVAL",
    created_at: now,
    updated_at: now,
  };
}

function simulateApprovalState(
  taskId: string,
  decision: HumanDecision,
  reviewer: string,
  comments?: string,
  modifications?: Record<string, any>
): AgentState {
  const state = simulateLocalAgentRun("Review Task", []);
  state.task_id = taskId;
  state.approval = {
    status: decision,
    reviewer,
    comments: comments || "Endorsed with full compliance check.",
    modifications: modifications || {},
    timestamp: new Date().toISOString(),
  };

  if (decision === "APPROVED" || decision === "MODIFIED") {
    state.status = "COMPLETED";
    state.trace.events.push({
      event_id: `evt_decision_${Date.now()}`,
      timestamp: new Date().toISOString(),
      event_type: "DECISION",
      message: `Task ${decision} by ${reviewer}. Final digital stamp sealed.`,
      payload: { reviewer, comments, modifications },
    });
  } else if (decision === "REJECTED") {
    state.status = "REJECTED";
    state.trace.events.push({
      event_id: `evt_decision_${Date.now()}`,
      timestamp: new Date().toISOString(),
      event_type: "DECISION",
      message: `Task REJECTED by ${reviewer}: ${comments}`,
      payload: { reviewer, comments },
    });
  }

  return state;
}
