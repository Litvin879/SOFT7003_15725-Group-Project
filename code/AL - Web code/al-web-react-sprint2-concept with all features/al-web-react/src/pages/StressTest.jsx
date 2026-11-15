import { useMemo, useState } from "react";
import { Link } from "react-router";
import useApplications from "../hooks/useApplications.js";
import { PipelinePage, LoadState } from "../components/Pipeline.jsx";
import {
  stressTest, euro, ACTIVE_STATUSES, AFFORDABILITY_DTI_LIMIT, PLACEHOLDER_INTEREST_RATE,
  RATE_RISE_MIN_BPS, RATE_RISE_MAX_BPS
} from "../lib/lending.js";

const PRESETS = [100, 150, 200, 250, 300];

// Macro Stress-Testing Simulator (underwriter only).
// Applies a rate rise to every active application and recalculates
// the monthly repayment and DTI.
export default function StressTest({ user }) {
  const { apps, loading, error } = useApplications(user);
  const [bps, setBps] = useState(200);

  const { tested, untested, active } = useMemo(() => {
    const active = apps.filter(a => ACTIVE_STATUSES.includes(a.status));
    const results = active.map(a => stressTest(a, bps));
    return {
      active,
      tested: results.filter(r => !r.missing.length).sort((a, b) => b.dtiAfter - a.dtiAfter),
      untested: results.filter(r => r.missing.length)
    };
  }, [apps, bps]);

  const totalIncrease = tested.reduce((sum, r) => sum + r.increase, 0);
  const atRiskBefore = tested.filter(r => r.atRiskBefore).length;
  const atRiskAfter = tested.filter(r => r.atRiskAfter).length;
  const newlyAtRisk = tested.filter(r => r.atRiskAfter && !r.atRiskBefore).length;
  const anyAssumed = tested.some(r => r.rateAssumed);

  return (
    <PipelinePage title="Stress test" user={user}>
      <section className="rounded-lg border border-slate-200 bg-white px-4 py-4">
        <h2 className="font-semibold">Interest rate rise</h2>
        <p className="text-sm text-slate-500">
          Recalculates monthly repayments and DTI for active applications. 100 bps = 1 percentage point.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="Rate rise presets">
          {PRESETS.map(p => (
            <button key={p} onClick={() => setBps(p)} aria-pressed={bps === p} data-bps={p}
              className={"rounded-md border px-3 py-1.5 text-sm font-medium tabular-nums " +
                (bps === p ? "border-blue-700 bg-blue-700 text-white" : "border-slate-300 bg-white hover:bg-slate-100")}>
              +{p} bps
            </button>
          ))}
        </div>

        <label htmlFor="bps" className="mt-4 block text-sm text-slate-600">
          Rate rise: <strong id="bps-value" className="tabular-nums text-slate-900">+{bps} bps</strong>
          <span className="tabular-nums"> (+{(bps / 100).toFixed(2)} percentage points)</span>
        </label>
        <input id="bps" type="range" min={RATE_RISE_MIN_BPS} max={RATE_RISE_MAX_BPS} step={25} value={bps}
          onChange={e => setBps(Number(e.target.value))} className="mt-2 w-full max-w-md accent-blue-700" />
        <div className="flex max-w-md justify-between text-xs text-slate-500 tabular-nums">
          <span>+{RATE_RISE_MIN_BPS}</span><span>+{RATE_RISE_MAX_BPS}</span>
        </div>
      </section>

      <LoadState loading={loading} error={error} />

      {!loading && !error && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile id="tile-tested" value={tested.length} label={`Active applications tested (of ${active.length})`} />
            <Tile id="tile-increase" value={euro(tested.length ? totalIncrease / tested.length : 0)} label="Average monthly increase" />
            <Tile id="tile-risk" value={`${atRiskBefore} → ${atRiskAfter}`} label={`Above ${AFFORDABILITY_DTI_LIMIT}% DTI (before → after)`} />
            <Tile id="tile-new-risk" value={newlyAtRisk} label="Newly at risk" warn={newlyAtRisk > 0} />
          </div>

          {anyAssumed && (
            <p className="text-sm text-slate-500">
              Applications without an interest rate are tested from an assumed {PLACEHOLDER_INTEREST_RATE}% rate.
            </p>
          )}

          <section className="rounded-lg border border-slate-200 bg-white">
            <h2 className="border-b border-slate-200 px-4 py-3 font-semibold">Results by application</h2>
            {tested.length === 0 ? (
              <p id="empty" className="px-4 py-10 text-center text-slate-500">
                {active.length === 0
                  ? "There are no active applications to test."
                  : "None of the active applications have enough data to test yet."}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      {["Applicant", "Broker", "Loan", "Rate", "Repayment", "Change", "DTI", "Affordability", ""].map((h, i) => (
                        <th key={i} className="whitespace-nowrap px-4 py-2 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tested.map(r => (
                      <tr key={r.app.id}>
                        <td className="whitespace-nowrap px-4 py-2.5 font-medium">{r.app.borrowerName}</td>
                        <td className="whitespace-nowrap px-4 py-2.5">{r.app.brokerName}</td>
                        <td className="whitespace-nowrap px-4 py-2.5 tabular-nums">{euro(r.app.loanAmount)}</td>
                        <td className="whitespace-nowrap px-4 py-2.5 tabular-nums">
                          {r.baseRate.toFixed(2)}% → {r.newRate.toFixed(2)}%{r.rateAssumed && <span title="Assumed rate" className="text-slate-400">*</span>}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 tabular-nums">{euro(r.repaymentBefore)} → {euro(r.repaymentAfter)}</td>
                        <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-red-700">+{euro(r.increase)}</td>
                        <td className="whitespace-nowrap px-4 py-2.5 tabular-nums">{r.dtiBefore.toFixed(1)}% → <strong>{r.dtiAfter.toFixed(1)}%</strong></td>
                        <td className="whitespace-nowrap px-4 py-2.5"><Affordability result={r} /></td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-right">
                          <Link to={`/application/${r.app.id}`} className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium hover:bg-slate-100">
                            View file
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {untested.length > 0 && (
            <section id="untested" className="rounded-lg border border-slate-200 bg-white px-4 py-3">
              <h2 className="font-semibold">Not tested ({untested.length})</h2>
              <p className="text-sm text-slate-500">These active applications are missing data needed for the calculation.</p>
              <ul className="mt-2 space-y-1 text-sm">
                {untested.map(r => (
                  <li key={r.app.id}>
                    <Link to={`/application/${r.app.id}`} className="font-medium text-blue-700 hover:underline">{r.app.borrowerName}</Link>
                    <span className="text-slate-500">: missing {r.missing.join(", ")}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </PipelinePage>
  );
}

function Tile({ id, value, label, warn }) {
  return (
    <div id={id} className={"rounded-lg border p-4 " + (warn ? "border-red-200 bg-red-50" : "border-slate-200 bg-white")}>
      <div className={"text-2xl font-bold tabular-nums " + (warn ? "text-red-700" : "")}>{value}</div>
      <div className="text-sm text-slate-500">{label}</div>
    </div>
  );
}

function Affordability({ result }) {
  if (result.atRiskAfter && !result.atRiskBefore) {
    return <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">Newly at risk</span>;
  }
  if (result.atRiskAfter) {
    return <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">At risk</span>;
  }
  return <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">Affordable</span>;
}
