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
//        recommendation: "Approve"  // Approve | Conditionally Approve | Decline
//      }
//    The pipeline reads these straight from Firestore.
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
    recommendation: raw.recommendation ?? null
  };
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
