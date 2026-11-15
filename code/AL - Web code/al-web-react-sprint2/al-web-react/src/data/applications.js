// applications.js
// ------------------------------------------------------------
// Reads mortgage applications from the Firestore "application"
// collection and turns each document into one tidy object the
// pages can show.
//
//   watchApplications(user, onChange, onError)  -> live list
//   getApplication(id, user)                    -> one application
// ------------------------------------------------------------
import { collection, query, where, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "../auth.js";
import { APPLICATIONS_COLLECTION, USERS_COLLECTION } from "../firebase-config.js";
import { STATUSES, calcLtv, ltvBand } from "../lib/lending.js";
import { normaliseAssessment } from "./aiEngine.js";

// Where each value lives in an application document.
// If the team renames a field, change it here only.
export const FIELDS = {
  borrowerId:   "borrowerID",
  brokerId:     "brokerID",
  status:       "status",
  annualIncome: "financialDetails.annualIncome",
  deposit:      "financialDetails.deposit",
  existingDebt: "financialDetails.existingDebt",   // monthly repayment (to confirm with team)
  termYears:    "financialDetails.mortgageTermYears",
  bedrooms:     "propertyDetails.bedrooms",
  county:       "propertyDetails.county",
  propertyType: "propertyDetails.propertyType",
  askingPrice:  "propertyDetails.askingPrice",     // not in the data yet
  loanAmount:   "loanAmount",                      // not in the data yet
  submittedAt:  "createdAt",                       // not in the data yet
  ai:           "aiAssessment"                     // filled in by the AI Engine
};

const read = (data, path) => path.split(".").reduce((value, key) => value?.[key], data);
const toNumber = value => (value == null || value === "" || Number.isNaN(Number(value)) ? null : Number(value));

function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate(); // Firestore Timestamp
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

// "applied" -> "Applied", unknown values are kept as they are
function tidyStatus(value) {
  const text = String(value ?? "").trim();
  return STATUSES.find(s => s.toLowerCase() === text.toLowerCase()) ?? (text || "Unknown");
}

// Adds AI Engine results to an application and works out LTV,
// LTV band and risk tier. Values the AI Engine leaves empty keep
// whatever the application already had.
export function withAssessment(app, assessment) {
  const merged = { ...(app.ai ?? {}) };
  for (const [key, value] of Object.entries(assessment ?? {})) {
    if (value != null) merged[key] = value;
  }
  const ai = Object.keys(merged).length ? merged : null;

  // LTV from the AI Engine if it has sent one, otherwise worked out here
  const calculatedLtv = calcLtv(app.loanAmount, ai?.mlValuation ?? app.askingPrice);
  const ltv = ai?.ltv ?? calculatedLtv;
  return {
    ...app,
    ai,
    ltv,
    ltvSource: ai?.ltv != null ? "AI Engine" : calculatedLtv != null ? "Calculated" : null,
    ltvBand: ltvBand(ltv),
    riskTier: ai?.riskTier ?? null
  };
}

// One Firestore document -> one application object
export function toApplication(id, data) {
  const askingPrice = toNumber(read(data, FIELDS.askingPrice));
  const deposit = toNumber(read(data, FIELDS.deposit));
  const loanAmount = toNumber(read(data, FIELDS.loanAmount))
    ?? (askingPrice && deposit != null ? askingPrice - deposit : null);
  const county = read(data, FIELDS.county);
  const propertyType = read(data, FIELDS.propertyType);

  return withAssessment({
    id,
    borrowerId: read(data, FIELDS.borrowerId) ?? null,
    brokerId: read(data, FIELDS.brokerId) ?? null,
    status: tidyStatus(read(data, FIELDS.status)),
    annualIncome: toNumber(read(data, FIELDS.annualIncome)),
    deposit,
    existingDebt: toNumber(read(data, FIELDS.existingDebt)),
    termYears: toNumber(read(data, FIELDS.termYears)),
    bedrooms: toNumber(read(data, FIELDS.bedrooms)),
    county: county ?? null,
    propertyType: propertyType ?? null,
    property: [propertyType, county].filter(Boolean).join(", ") || "—",
    askingPrice,
    loanAmount,
    submittedAt: toDate(read(data, FIELDS.submittedAt)),
    ai: null,
    // Filled in by addNames()
    borrowerName: null,
    brokerName: null
  }, normaliseAssessment(read(data, FIELDS.ai)));
}

// ---- Names of borrowers and brokers (from the users collection) ----
const nameCache = new Map();

async function nameOf(uid) {
  if (!uid) return null;
  if (!nameCache.has(uid)) {
    nameCache.set(uid, getDoc(doc(db, USERS_COLLECTION, uid))
      .then(snap => (snap.exists() ? snap.data().name || snap.data().email : null))
      .catch(() => null));
  }
  return nameCache.get(uid);
}

async function addNames(apps) {
  await Promise.all(apps.map(async app => {
    app.borrowerName = (await nameOf(app.borrowerId)) ?? "Unknown borrower";
    app.brokerName = (await nameOf(app.brokerId)) ?? (app.brokerId ? "Unknown broker" : "No broker");
  }));
  return apps;
}

// Newest first; applications without a date go last
const newestFirst = (a, b) => (b.submittedAt?.getTime() ?? 0) - (a.submittedAt?.getTime() ?? 0);

// ---- Live list for the pipeline ----
// Brokers only get applications where brokerID is their user ID.
// Underwriters get every application. Firestore Security Rules
// enforce the same thing on the server.
export function watchApplications(user, onChange, onError) {
  const all = collection(db, APPLICATIONS_COLLECTION);
  const source = user.role === "broker" ? query(all, where(FIELDS.brokerId, "==", user.uid)) : all;

  return onSnapshot(
    source,
    async snapshot => {
      const apps = snapshot.docs.map(d => toApplication(d.id, d.data()));
      onChange((await addNames(apps)).sort(newestFirst));
    },
    onError
  );
}

// ---- One application for the loan file ----
// Returns null if it doesn't exist. Throws { code: "permission-denied" }
// if this user isn't allowed to see it.
export async function getApplication(id, user) {
  const snapshot = await getDoc(doc(db, APPLICATIONS_COLLECTION, id));
  if (!snapshot.exists()) return null;

  const [app] = await addNames([toApplication(snapshot.id, snapshot.data())]);
  if (user.role === "broker" && app.brokerId !== user.uid) {
    const err = new Error("Not your client");
    err.code = "permission-denied";
    throw err;
  }
  return app;
}
