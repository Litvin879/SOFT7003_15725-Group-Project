import { useParams } from "react-router";
import useApplication from "../hooks/useApplication.js";
import ApprovalPanel from "../components/ApprovalPanel.jsx";
import ApplicationFrame from "../components/ApplicationFrame.jsx";
import { RiskTier } from "../components/Pipeline.jsx";
import {
  euro, valuationGap, dtiBreakdown, monthlyRepayment, PLACEHOLDER_INTEREST_RATE, OVERVALUED_THRESHOLD
} from "../lib/lending.js";

// One application's loan file. Brokers can only open their own clients' files.
// Live from Firestore, so changes (e.g. an approval saved by AL-Ledger)
// show without refreshing.
export default function LoanFile({ user }) {
  const { id } = useParams();
  const { loading, error, app } = useApplication(id, user);

  return (
    <ApplicationFrame user={user} id={id} loading={loading} error={error} app={app} tab="file">
      {app && user.role === "underwriter" && <ApprovalPanel app={app} />}
      {app && <LoanFileDetails app={app} />}
    </ApplicationFrame>
  );
}

function Section({ title, children }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <h2 className="border-b border-slate-200 px-4 py-3 font-semibold">{title}</h2>
      <div className="px-4 py-3">{children}</div>
    </section>
  );
}

function Rows({ rows }) {
  return (
    <dl className="divide-y divide-slate-100 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-4 py-2">
          <dt className="text-slate-500">{label}</dt>
          <dd className="text-right font-medium tabular-nums">{value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

const Waiting = ({ children }) => <p className="text-sm text-slate-500">{children}</p>;

function LoanFileDetails({ app }) {
  const gap = valuationGap(app.askingPrice, app.ai?.mlValuation);

  // Repayment: from the AI Engine, or estimated with the application's
  // rate (or the placeholder rate if it has none)
  const repaymentFromAi = app.ai?.monthlyRepayment;
  const rate = app.interestRate ?? PLACEHOLDER_INTEREST_RATE;
  const estimatedRepayment = monthlyRepayment(app.loanAmount, rate, app.termYears);
  const dti = dtiBreakdown({
    annualIncome: app.annualIncome,
    existingMonthlyDebt: app.existingDebt,
    newMonthlyRepayment: repaymentFromAi ?? estimatedRepayment
  });

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2">
        <Section title="Borrower and application">
          <Rows rows={[
            ["Borrower", app.borrowerName],
            ["Broker", app.brokerName],
            ["Status", app.status],
            ["Mortgage term", app.termYears ? `${app.termYears} years` : null],
            ["Loan amount", app.loanAmount != null ? euro(app.loanAmount) : null]
          ]} />
        </Section>

        <Section title="Financial details">
          <Rows rows={[
            ["Annual income", app.annualIncome != null ? euro(app.annualIncome) : null],
            ["Deposit", app.deposit != null ? euro(app.deposit) : null],
            ["Existing debt (monthly)", app.existingDebt != null ? euro(app.existingDebt) : null]
          ]} />
        </Section>

        <Section title="Property">
          <Rows rows={[
            ["Type", app.propertyType],
            ["County", app.county],
            ["Bedrooms", app.bedrooms],
            ["Asking price", app.askingPrice != null ? euro(app.askingPrice) : null]
          ]} />
        </Section>

        <Section title="LTV and risk">
          <Rows rows={[
            ["LTV", app.ltv != null ? `${app.ltv}%` : null],
            ["LTV band", app.ltvBand],
            ["LTV source", app.ltvSource],
            ["Risk tier", <RiskTier key="r" tier={app.riskTier} />],
            ["AI recommendation", app.ai?.recommendation ?? "Pending"]
          ]} />
        </Section>

        <Section title="Asking price vs ML valuation">
          {gap ? (
            <>
              <Rows rows={[
                ["Asking price", euro(app.askingPrice)],
                ["ML valuation", euro(app.ai.mlValuation)],
                ["Difference", `${gap.difference >= 0 ? "+" : "−"}${euro(Math.abs(gap.difference))} (${gap.percent >= 0 ? "+" : ""}${gap.percent}%)`]
              ]} />
              {gap.overvalued && (
                <p id="overvalued" className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                  Overvalued: the asking price is more than {OVERVALUED_THRESHOLD}% above the ML valuation.
                </p>
              )}
            </>
          ) : (
            <Waiting>
              {app.askingPrice == null ? "No asking price on this application yet. " : ""}
              {app.ai?.mlValuation == null ? "Waiting for the ML valuation from the AI Engine." : ""}
            </Waiting>
          )}
        </Section>

        <Section title="DTI breakdown">
          {dti ? (
            <>
              <Rows rows={[
                ["Gross monthly income", euro(dti.monthlyIncome)],
                ["Existing debt repayments", euro(dti.existingMonthlyDebt)],
                ["New mortgage repayment", app.loanAmount || repaymentFromAi ? euro(dti.newMonthlyRepayment) : "Not available yet"],
                ["Total monthly debt", euro(dti.totalMonthlyDebt)],
                ["DTI", `${dti.dti}%`],
                ...(app.ai?.dti != null && app.ai.dti !== dti.dti ? [["DTI from AI Engine", `${app.ai.dti}%`]] : [])
              ]} />
              {repaymentFromAi == null && app.loanAmount != null && (
                <p className="mt-2 text-xs text-slate-500">
                  Repayment estimated at {rate}%{app.interestRate == null ? " (assumed rate)" : ""} until the AI Engine provides it.
                </p>
              )}
            </>
          ) : (
            <Waiting>No income on this application yet.</Waiting>
          )}
        </Section>
      </div>
    </>
  );
}
