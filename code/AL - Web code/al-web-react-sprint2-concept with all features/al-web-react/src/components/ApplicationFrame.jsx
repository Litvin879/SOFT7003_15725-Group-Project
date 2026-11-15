import { Link } from "react-router";
import { PipelinePage, StatusBadge } from "./Pipeline.jsx";

// Shared frame for one application's pages: back link, loading and
// error messages, the applicant heading and the Loan file / AI audit tabs.
export default function ApplicationFrame({ user, id, loading, error, app, tab, children }) {
  const backTo = user.role === "broker" ? "/broker" : "/underwriter";
  const tabs = [
    { key: "file", label: "Loan file", to: `/application/${id}` },
    { key: "audit", label: "AI audit", to: `/application/${id}/audit` }
  ];

  return (
    <PipelinePage title={tab === "audit" ? "AI audit" : "Loan file"} user={user}>
      <Link to={backTo} className="text-sm font-medium text-blue-700 hover:underline">← Back to pipeline</Link>

      {loading && <p className="py-10 text-center text-slate-500">Loading application…</p>}

      {error && (
        <p id="error" role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error.code === "permission-denied"
            ? "You don't have access to this loan file. Brokers can only open their own clients' files."
            : "Couldn't load this application: " + error.message}
        </p>
      )}

      {!loading && !error && !app && (
        <p id="error" className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">This application doesn't exist.</p>
      )}

      {app && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 id="applicant" className="text-2xl font-bold">{app.borrowerName}</h2>
              <p className="text-sm text-slate-500">Application {app.id}</p>
            </div>
            <StatusBadge status={app.status} />
          </div>

          <nav className="flex gap-1 border-b border-slate-200">
            {tabs.map(t => (
              <Link key={t.key} to={t.to} id={`tab-${t.key}`} aria-current={t.key === tab ? "page" : undefined}
                className={"-mb-px border-b-2 px-3 py-2 text-sm font-medium " +
                  (t.key === tab ? "border-blue-700 text-blue-800" : "border-transparent text-slate-500 hover:text-slate-800")}>
                {t.label}
              </Link>
            ))}
          </nav>

          {app.aiError && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Couldn't reach the AI Engine: {app.aiError} Showing the results saved in Firebase.
            </p>
          )}

          {children}
        </>
      )}
    </PipelinePage>
  );
}
