import useApplications from "../hooks/useApplications.js";
import { PipelinePage, Tiles, statusCounts, Filters, useFilters, ApplicationsTable, LoadState } from "../components/Pipeline.jsx";

// Only the broker's own clients (applications where brokerID = this broker)
export default function BrokerPipeline({ user }) {
  const { apps, loading, error } = useApplications(user);
  const filterState = useFilters(apps);

  return (
    <PipelinePage title="Broker Pipeline" user={user}>
      <LoadState loading={loading} error={error} />
      {!loading && !error && (
        <>
          <Tiles items={statusCounts(apps)} />
          <Filters filterState={filterState} />
          <ApplicationsTable
            heading="My clients' applications"
            apps={filterState.visible}
            totalCount={apps.length}
            emptyMessage="You have no client applications yet. Applications your clients submit in the AL-Mobile app will appear here."
            onClear={filterState.clear}
          />
        </>
      )}
    </PipelinePage>
  );
}
