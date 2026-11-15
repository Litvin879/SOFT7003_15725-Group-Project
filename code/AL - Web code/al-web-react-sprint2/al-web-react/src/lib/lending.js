// lending.js
// ------------------------------------------------------------
// Mortgage maths used by the pipeline and the loan file.
// Plain functions with no Firebase code, so they are easy to test
// and can be reused by the stress-testing simulator later.
// ------------------------------------------------------------

export const STATUSES = ["Applied", "AI Deliberated", "Underwriter Approved", "Funded", "Closed"];
export const RISK_TIERS = ["Low", "Medium", "High"];

// LTV thresholds used to group applications
export const LTV_BANDS = [
  { label: "Up to 80%", matches: ltv => ltv <= 80 },
  { label: "80–90%",    matches: ltv => ltv > 80 && ltv <= 90 },
  { label: "Over 90%",  matches: ltv => ltv > 90 }
];

// Used only until the AI Engine sends the real repayment figure
export const PLACEHOLDER_INTEREST_RATE = 4.0; // % a year

// Asking price this much above the ML valuation counts as overvalued
export const OVERVALUED_THRESHOLD = 5; // %

const round1 = n => Math.round(n * 10) / 10;

// LTV = loan ÷ property value, as a %
export function calcLtv(loanAmount, propertyValue) {
  if (!loanAmount || !propertyValue) return null;
  return round1((loanAmount / propertyValue) * 100);
}

// "Up to 80%", "80–90%", "Over 90%", or null if there's no LTV yet
export function ltvBand(ltv) {
  if (ltv == null) return null;
  return LTV_BANDS.find(band => band.matches(ltv))?.label ?? null;
}

// Standard repayment mortgage formula
export function monthlyRepayment(loanAmount, annualRatePct, years) {
  if (!loanAmount || !years) return null;
  const r = annualRatePct / 100 / 12;
  const n = years * 12;
  if (r === 0) return loanAmount / n;
  return (loanAmount * r) / (1 - Math.pow(1 + r, -n));
}

// DTI = monthly debt repayments ÷ gross monthly income, as a %
export function dtiBreakdown({ annualIncome, existingMonthlyDebt, newMonthlyRepayment }) {
  if (!annualIncome) return null;
  const monthlyIncome = annualIncome / 12;
  const existing = existingMonthlyDebt ?? 0;
  const repayment = newMonthlyRepayment ?? 0;
  const total = existing + repayment;
  return {
    monthlyIncome,
    existingMonthlyDebt: existing,
    newMonthlyRepayment: repayment,
    totalMonthlyDebt: total,
    dti: round1((total / monthlyIncome) * 100)
  };
}

// Asking price vs ML valuation
export function valuationGap(askingPrice, mlValuation) {
  if (!askingPrice || !mlValuation) return null;
  const difference = askingPrice - mlValuation;
  const percent = round1((difference / mlValuation) * 100);
  return { difference, percent, overvalued: percent > OVERVALUED_THRESHOLD };
}

export function euro(amount) {
  if (amount == null || Number.isNaN(amount)) return "—";
  return "€" + Math.round(amount).toLocaleString("en-IE");
}
