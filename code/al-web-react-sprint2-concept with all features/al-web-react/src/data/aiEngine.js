// aiEngine.js
// ------------------------------------------------------------
// How AL-Web receives results from the AI Engine (AL-Core).
//
// Two ways are supported, so either can be agreed with the team:
//
// 1. Through Firestore (default)
//    The AI Engine writes its results into each application
//    document under "aiAssessment":
//      aiAssessment: {
//        ltv: 87.5,                 // %
//        riskTier: "Medium",        // Low | Medium | High
//        mlValuation: 312000,       // €
//        monthlyRepayment: 1290,    // €
//        dti: 38.2,                 // %
//        recommendation: "Approve", // Approve | Conditionally Approve | Decline
//
//        // AI committee deliberation (Feature 3, assumed shape)
//        consensus: 75,             // % of agents agreeing (0–100 or 0–1)
//        creditMemo: "Summary written by the Underwriting Strategist",
//        agents: [
//          { agent: "Affordability", verdict: "Approve", confidence: 0.82,
//            reasoning: "Full text of the agent's reasoning…",
//            keyFindings: ["DTI 29.8% is within limits"] },
//          { agent: "Valuation", ... },
//          { agent: "Market & Macro", ... },
//          { agent: "Underwriting Strategist", ... }
//        ]
//      }
//    The pages read these straight from Firestore, live.
//
// 2. Through an HTTP API
//    Set VITE_AI_ENGINE_URL in a .env file, for example:
//      VITE_AI_ENGINE_URL=http://localhost:5000
//    The loan file then calls:
//      GET {VITE_AI_ENGINE_URL}/applications/{applicationId}/assessment
//    with the user's Firebase ID token, and expects the same JSON
//    fields as above.
// ------------------------------------------------------------
import { auth } from "../auth.js";
import { RISK_TIERS } from "../lib/lending.js";

const AI_ENGINE_URL = import.meta.env.VITE_AI_ENGINE_URL;
export const aiEngineApiEnabled = Boolean(AI_ENGINE_URL);

const toNumber = value => (value == null || value === "" || Number.isNaN(Number(value)) ? null : Number(value));

// The four agents on the AI committee, in the order they're shown
export const AGENTS = [
  { key: "affordability", name: "Affordability" },
  { key: "valuation",     name: "Valuation" },
  { key: "market",        name: "Market & Macro" },
  { key: "strategist",    name: "Underwriting Strategist" }
];

export const DECISIONS = ["Approve", "Conditionally Approve", "Decline"];

// "approved", "CONDITIONAL_APPROVAL", "reject" -> one of DECISIONS
export function toDecision(value) {
  const text = String(value ?? "").trim().toLowerCase().replace(/[_-]+/g, " ");
  if (!text) return null;
  if (text.startsWith("cond")) return "Conditionally Approve";
  if (text.startsWith("approv")) return "Approve";
  if (text.startsWith("decl") || text.startsWith("reject")) return "Decline";
  return null;
}

// "Affordability Agent", "market_macro" -> which of the four agents
function agentKey(name) {
  const text = String(name ?? "").toLowerCase();
  if (text.includes("afford")) return "affordability";
  if (text.includes("valu")) return "valuation";
  if (text.includes("market") || text.includes("macro")) return "market";
  if (text.includes("strateg") || text.includes("underwrit")) return "strategist";
  return null;
}

// 0.82 or 82 -> 82
const toPercent = value => {
  const n = toNumber(value);
  if (n == null) return null;
  return Math.round(n <= 1 ? n * 100 : n);
};

function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

// Accepts a list of agents or an object keyed by agent name
function normaliseAgents(raw) {
  if (!raw) return null;
  const list = Array.isArray(raw)
    ? raw
    : typeof raw === "object" ? Object.entries(raw).map(([agent, value]) => ({ agent, ...value })) : [];
  const agents = list
    .map(a => ({
      key: agentKey(a.agent ?? a.name),
      verdict: toDecision(a.verdict ?? a.recommendation ?? a.decision),
      confidence: toPercent(a.confidence),
      reasoning: String(a.reasoning ?? a.log ?? a.summary ?? ""),
      keyFindings: Array.isArray(a.keyFindings) ? a.keyFindings.map(String) : [],
      createdAt: toDate(a.createdAt ?? a.timestamp)
    }))
    .filter(a => a.key);
  return agents.length ? agents : null;
}

// Cleans up whatever the AI Engine sent into one fixed shape
export function normaliseAssessment(raw) {
  if (!raw || typeof raw !== "object") return null;
  const tier = RISK_TIERS.find(t => t.toLowerCase() === String(raw.riskTier ?? "").trim().toLowerCase()) ?? null;
  return {
    ltv: toNumber(raw.ltv),
    riskTier: tier,
    mlValuation: toNumber(raw.mlValuation),
    monthlyRepayment: toNumber(raw.monthlyRepayment),
    dti: toNumber(raw.dti),
    recommendation: toDecision(raw.recommendation),
    consensus: toPercent(raw.consensus),
    creditMemo: raw.creditMemo ? String(raw.creditMemo) : null,
    agents: normaliseAgents(raw.agents)
  };
}

// How many agents agree with the final decision.
// Uses the AI Engine's own consensus figure if it sent one.
export function agreement(assessment) {
  const agents = assessment?.agents ?? [];
  const final = assessment?.recommendation;
  const withVerdict = agents.filter(a => a.verdict);
  const agreeing = final ? withVerdict.filter(a => a.verdict === final).length : 0;
  const percent = assessment?.consensus
    ?? (withVerdict.length && final ? Math.round((agreeing / withVerdict.length) * 100) : null);
  return { agreeing, total: withVerdict.length, percent };
}

// Asks the AI Engine API for one application's results.
// Returns null when no API is configured.
export async function fetchAssessment(applicationId) {
  if (!AI_ENGINE_URL) return null;

  const token = await auth.currentUser?.getIdToken();
  const response = await fetch(
    `${AI_ENGINE_URL}/applications/${encodeURIComponent(applicationId)}/assessment`,
    { headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) } }
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`The AI Engine returned an error (${response.status}).`);
  return normaliseAssessment(await response.json());
}
