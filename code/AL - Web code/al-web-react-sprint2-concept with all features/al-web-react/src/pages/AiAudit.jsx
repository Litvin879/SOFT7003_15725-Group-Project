import { useParams } from "react-router";
import useApplication from "../hooks/useApplication.js";
import ApplicationFrame from "../components/ApplicationFrame.jsx";
import { AGENTS, agreement } from "../data/aiEngine.js";

// AI Audit & Deliberation Console: how the AI committee reached its
// recommendation for one application. Read-only.
export default function AiAudit({ user }) {
  const { id } = useParams();
  const { loading, error, app } = useApplication(id, user);

  return (
    <ApplicationFrame user={user} id={id} loading={loading} error={error} app={app} tab="audit">
      {app && <Deliberation ai={app.ai} />}
    </ApplicationFrame>
  );
}

const decisionStyle = {
  "Approve": "border-emerald-200 bg-emerald-50 text-emerald-900",
  "Conditionally Approve": "border-amber-200 bg-amber-50 text-amber-900",
  "Decline": "border-red-200 bg-red-50 text-red-900"
};
const verdictPill = {
  "Approve": "bg-emerald-100 text-emerald-800",
  "Conditionally Approve": "bg-amber-100 text-amber-800",
  "Decline": "bg-red-100 text-red-800"
};

function Verdict({ value }) {
  if (!value) return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">No verdict</span>;
  return <span className={"rounded-full px-2 py-0.5 text-xs font-medium " + verdictPill[value]}>{value}</span>;
}

function Deliberation({ ai }) {
  if (!ai?.agents && !ai?.recommendation) {
    return (
      <p id="no-deliberation" className="rounded-lg border border-slate-200 bg-white px-4 py-10 text-center text-slate-500">
        The AI committee hasn't reviewed this application yet. Its reasoning and recommendation will appear here once the AI Engine has run.
      </p>
    );
  }

  const agree = agreement(ai);
  const byKey = Object.fromEntries((ai.agents ?? []).map(a => [a.key, a]));

  return (
    <>
      {/* Final decision and how much the agents agreed */}
      <section id="decision" className={"rounded-lg border px-4 py-4 " + (decisionStyle[ai.recommendation] ?? "border-slate-200 bg-white")}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium opacity-80">Final recommendation</p>
            <p id="final-decision" className="text-2xl font-bold">{ai.recommendation ?? "Pending"}</p>
          </div>
          {agree.percent != null && (
            <div className="min-w-48">
              <p className="text-sm font-medium opacity-80">Agent agreement</p>
              <p id="agreement" className="font-semibold tabular-nums">
                {agree.total ? `${agree.agreeing} of ${agree.total} agents agree` : "Consensus"} · {agree.percent}%
              </p>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-white/70" role="img" aria-label={`${agree.percent}% agreement`}>
                <div className="h-full rounded-full bg-current opacity-60" style={{ width: `${agree.percent}%` }} />
              </div>
            </div>
          )}
        </div>
        {ai.creditMemo && (
          <div className="mt-4 border-t border-current/10 pt-3">
            <p className="text-sm font-medium opacity-80">Credit memo</p>
            <p id="credit-memo" className="mt-1 whitespace-pre-line text-sm">{ai.creditMemo}</p>
          </div>
        )}
      </section>

      {/* Each agent's reasoning, read-only */}
      <section>
        <h2 className="mb-3 font-semibold">Agent reasoning <span className="text-sm font-normal text-slate-500">(read-only)</span></h2>
        <div className="grid gap-4 md:grid-cols-2">
          {AGENTS.map(({ key, name }) => {
            const agent = byKey[key];
            return (
              <article key={key} id={`agent-${key}`} className="flex min-w-0 flex-col rounded-lg border border-slate-200 bg-white">
                <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
                  <h3 className="font-semibold">{name} Agent</h3>
                  <div className="flex items-center gap-2">
                    {agent?.confidence != null && <span className="text-xs text-slate-500 tabular-nums">{agent.confidence}% confident</span>}
                    <Verdict value={agent?.verdict} />
                  </div>
                </header>
                <div className="space-y-3 px-4 py-3 text-sm">
                  {agent ? (
                    <>
                      {agent.keyFindings.length > 0 && (
                        <ul className="list-disc space-y-1 pl-5 text-slate-700">
                          {agent.keyFindings.map((f, i) => <li key={i}>{f}</li>)}
                        </ul>
                      )}
                      <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-md bg-slate-50 p-3 font-mono text-xs leading-relaxed text-slate-800">
                        {agent.reasoning || "No reasoning text was recorded."}
                      </pre>
                      {agent.createdAt && (
                        <p className="text-xs text-slate-500">
                          Logged {agent.createdAt.toLocaleString("en-IE", { dateStyle: "medium", timeStyle: "short" })}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-slate-500">No reasoning from this agent yet.</p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}
