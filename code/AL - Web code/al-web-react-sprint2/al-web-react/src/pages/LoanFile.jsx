import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { getApplication, withAssessment } from "../data/applications.js";
import { aiEngineApiEnabled, fetchAssessment } from "../data/aiEngine.js";
import { PipelinePage, StatusBadge, RiskTier } from "../components/Pipeline.jsx";
import {
  euro, valuationGap, dtiBreakdown, monthlyRepayment, PLACEHOLDER_INTEREST_RATE, OVERVALUED_THRESHOLD
} from "../lib/lending.js";

// One application's loan file. Brokers can only open their own clients' files.
export default function LoanFile({ user }) {
  const { id } = useParams();
  const [state, setState] = useState({ loading: true });
  const backTo = user.role === "broker" ? "/broker" : "/underwriter";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let app = await getApplication(id, user);
        // If an AI Engine API is set up, its results replace the Firestore ones
        if (app && aiEngineApiEnabled) {
          try {
            const fromApi = await fetchAssessment(app.id);
            if (fromApi) app = withAssessment(app, fromApi);
          } catch (err) {
            app = { ...app, aiError: err.message };
          }
        }
        if (!cancelled) setState({ loading: false, app });
      } catch (error) {
        if (!cancelled) setState({ loading: false, error });
      }
    })();
    return () => { cancelled = true; };
  }, [id, user.uid]);

  const { loading, app, error } = state;

  return (
    <PipelinePage title="Loan file" user={user}>
      <Link to={backTo} className="text-sm font-medium text-blue-700 hover:underline">← Back to pipeline</Link>

      {loading && <p className="py-10 text-center text-slate-500">Loading loan file…</p>}

      {error && (
        <p id="error" role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error.code === "permission-denied"
            ? "You don't have access to this loan file. Brokers can only open their own clients' files."
            : "Couldn't load this loan file: " + error.message}
        </p>
      )}

      {!loading && !error && !app && (
        <p id="error" className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">This application doesn't exist.</p>
      )}

      {app && <LoanFileDetails app={app} />}
    </PipelinePage>
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

  // Repayment: from the AI Engine, or estimated with a placeholder rate
  const repaymentFromAi = app.ai?.monthlyRepayment;
  const estimatedRepayment = monthlyRepayment(app.loanAmount, PLACEHOLDER_INTEREST_RATE, app.termYears);
  const dti = dtiBreakdown({
    annualIncome: app.annualIncome,
    existingMonthlyDebt: app.existingDebt,
    newMonthlyRepayment: repaymentFromAi ?? estimatedRepayment
  });

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="applicant" className="text-2xl font-bold">{app.borrowerName}</h2>
          <p className="text-sm text-slate-500">Application {app.id}</p>
        </div>
        <StatusBadge status={app.status} />
      </div>

      {app.aiError && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Couldn't reach the AI Engine: {app.aiError} Showing the results saved in Firebase.
        </p>
      )}

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
                  Repayment estimated at {PLACEHOLDER_INTEREST_RATE}% until the AI Engine provides it.
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
