import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { logOut } from "../auth.js";
import { STATUSES, RISK_TIERS, LTV_BANDS, euro } from "../lib/lending.js";

// Shared building blocks for the broker and underwriter pipelines

export const NOT_YET = "Not available yet"; // filter option for missing LTV / risk

// ---- Page frame: header with title, email and Log out ----
export function PipelinePage({ title, user, children }) {
  const navigate = useNavigate();
  async function handleLogOut() {
    // Leave the page first, otherwise RequireRole sees the sign-out
    // and redirects to /login instead of home
    navigate("/", { replace: true });
    await logOut();
  }
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-blue-700 text-sm font-bold text-white">AL</span>
            <h1 className="text-lg font-semibold">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span id="who" className="hidden text-sm text-slate-600 sm:inline">{user?.email}</span>
            <button id="logout" onClick={handleLogOut}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-100">
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">{children}</main>
    </div>
  );
}

// ---- Count boxes ----
export function Tiles({ items }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {items.map(item => (
        <div key={item.label} className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-2xl font-bold tabular-nums">{item.count}</div>
          <div className="text-sm text-slate-500">{item.label}</div>
        </div>
      ))}
    </div>
  );
}

export const statusCounts = apps =>
  STATUSES.map(label => ({ label, count: apps.filter(a => a.status === label).length }));

export const ltvAndRiskCounts = apps => [
  ...LTV_BANDS.map(b => ({ label: "LTV " + b.label.toLowerCase(), count: apps.filter(a => a.ltvBand === b.label).length })),
  { label: "High risk", count: apps.filter(a => a.riskTier === "High").length }
];

// ---- Filters ----
// Keeps the chosen filters and returns the matching applications
export function useFilters(apps) {
  const empty = { status: "All", ltvBand: "All", riskTier: "All", broker: "All" };
  const [filters, setFilters] = useState(empty);

  const visible = useMemo(() => apps.filter(a =>
    (filters.status === "All" || a.status === filters.status) &&
    (filters.ltvBand === "All" || (a.ltvBand ?? NOT_YET) === filters.ltvBand) &&
    (filters.riskTier === "All" || (a.riskTier ?? NOT_YET) === filters.riskTier) &&
    (filters.broker === "All" || a.brokerName === filters.broker)
  ), [apps, filters]);

  const set = (name, value) => setFilters(f => ({ ...f, [name]: value }));
  const clear = () => setFilters(empty);
  const active = Object.values(filters).some(v => v !== "All");
  return { filters, set, clear, active, visible };
}

function Select({ id, label, value, options, onChange }) {
  return (
    <label htmlFor={id} className="text-sm text-slate-600">
      {label}
      <select id={id} value={value} onChange={e => onChange(e.target.value)}
        className="ml-2 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100">
        {["All", ...options].map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

export function Filters({ filterState, brokers }) {
  const { filters, set, clear, active } = filterState;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <Select id="filter-status" label="Status" value={filters.status} options={STATUSES} onChange={v => set("status", v)} />
      <Select id="filter-ltv" label="LTV band" value={filters.ltvBand} options={[...LTV_BANDS.map(b => b.label), NOT_YET]} onChange={v => set("ltvBand", v)} />
      <Select id="filter-risk" label="Risk tier" value={filters.riskTier} options={[...RISK_TIERS, NOT_YET]} onChange={v => set("riskTier", v)} />
      {brokers && <Select id="filter-broker" label="Broker" value={filters.broker} options={brokers} onChange={v => set("broker", v)} />}
      {active && (
        <button onClick={clear} className="text-sm font-medium text-blue-700 hover:underline">Clear filters</button>
      )}
    </div>
  );
}

// ---- Table ----
const statusStyle = {
  "Applied": "bg-blue-50 text-blue-800",
  "AI Deliberated": "bg-violet-50 text-violet-800",
  "Underwriter Approved": "bg-emerald-50 text-emerald-800",
  "Funded": "bg-green-100 text-green-900",
  "Closed": "bg-slate-100 text-slate-700"
};
const riskStyle = { Low: "text-green-700", Medium: "text-amber-700", High: "text-red-700" };

export function StatusBadge({ status }) {
  return <span className={"rounded-full px-2 py-0.5 text-xs font-medium " + (statusStyle[status] ?? "bg-slate-100 text-slate-700")}>{status}</span>;
}

export function RiskTier({ tier }) {
  if (!tier) return <span className="text-slate-400">Pending</span>;
  return <span className={"font-semibold " + riskStyle[tier]}>{tier}</span>;
}

const dateText = date => (date ? date.toLocaleDateString("en-IE", { day: "2-digit", month: "short", year: "numeric" }) : "—");

// showBroker: add the Broker column (underwriter view)
export function ApplicationsTable({ heading, apps, totalCount, showBroker, emptyMessage, onClear }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h2 className="font-semibold">{heading}</h2>
        <span id="row-count" className="text-sm text-slate-500 tabular-nums">
          {apps.length === totalCount ? `${totalCount} applications` : `${apps.length} of ${totalCount} applications`}
        </span>
      </div>

      {totalCount === 0 ? (
        <p id="empty" className="px-4 py-10 text-center text-slate-500">{emptyMessage}</p>
      ) : apps.length === 0 ? (
        <p id="empty" className="px-4 py-10 text-center text-slate-500">
          No applications match these filters.{" "}
          <button onClick={onClear} className="font-medium text-blue-700 hover:underline">Clear filters</button>
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                {["Applicant", showBroker && "Broker", "Property", "Loan", "LTV", "LTV band", "Risk tier", "Status", "Submitted", ""]
                  .filter(h => h !== false)
                  .map((h, i) => <th key={i} className="whitespace-nowrap px-4 py-2 font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {apps.map(app => (
                <tr key={app.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-2.5 font-medium">{app.borrowerName}</td>
                  {showBroker && <td className="whitespace-nowrap px-4 py-2.5">{app.brokerName}</td>}
                  <td className="whitespace-nowrap px-4 py-2.5">{app.property}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 tabular-nums">{euro(app.loanAmount)}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 tabular-nums">{app.ltv != null ? app.ltv + "%" : "—"}</td>
                  <td className="whitespace-nowrap px-4 py-2.5">{app.ltvBand ?? <span className="text-slate-400">—</span>}</td>
                  <td className="whitespace-nowrap px-4 py-2.5"><RiskTier tier={app.riskTier} /></td>
                  <td className="whitespace-nowrap px-4 py-2.5"><StatusBadge status={app.status} /></td>
                  <td className="whitespace-nowrap px-4 py-2.5 tabular-nums">{dateText(app.submittedAt)}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right">
                    <Link to={`/application/${app.id}`}
                      className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium hover:bg-slate-100">
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
  );
}

// Loading and error messages while the list is fetched
export function LoadState({ loading, error }) {
  if (loading) return <p className="py-10 text-center text-slate-500">Loading applications…</p>;
  if (error) {
    const blocked = error.code === "permission-denied";
    return (
      <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {blocked
          ? "Firebase didn't allow these applications to be read. Check the Firestore Security Rules."
          : "Couldn't load applications: " + error.message}
      </p>
    );
  }
  return null;
}
