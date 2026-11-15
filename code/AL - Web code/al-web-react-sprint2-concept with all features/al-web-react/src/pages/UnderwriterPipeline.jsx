import useApplications from "../hooks/useApplications.js";
import {
  PipelinePage, Tiles, statusCounts, ltvAndRiskCounts, Filters, useFilters, ApplicationsTable, LoadState
} from "../components/Pipeline.jsx";

// Every application in the portfolio
export default function UnderwriterPipeline({ user }) {
  const { apps, loading, error } = useApplications(user);
  const filterState = useFilters(apps);
  const brokers = [...new Set(apps.map(a => a.brokerName))].sort();

  return (
    <PipelinePage title="Underwriter Pipeline" user={user}>
      <LoadState loading={loading} error={error} />
      {!loading && !error && (
        <>
          <Tiles items={statusCounts(apps)} />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {ltvAndRiskCounts(apps).map(t => (
              <div key={t.label} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="text-2xl font-bold tabular-nums">{t.count}</div>
                <div className="text-sm text-slate-500">{t.label}</div>
              </div>
            ))}
          </div>
          <Filters filterState={filterState} brokers={brokers} />
          <ApplicationsTable
            heading="All applications"
            apps={filterState.visible}
            totalCount={apps.length}
            showBroker
            emptyMessage="There are no applications yet. New applications from AL-Mobile will appear here."
            onClear={filterState.clear}
          />
        </>
      )}
    </PipelinePage>
  );
}
