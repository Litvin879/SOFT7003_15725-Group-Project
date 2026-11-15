import { useState } from "react";
import { approveApplication, ledgerConnected } from "../data/ledger.js";
import { euro } from "../lib/lending.js";

// Statuses where the application has already been approved
const APPROVED_STATUSES = ["Underwriter Approved", "Funded", "Closed"];

// Underwriter-only panel on the loan file.
// Approve -> confirm -> send the application ID to AL-Ledger ->
// show the transaction hash, or the error if it failed.
export default function ApprovalPanel({ app }) {
  const [step, setStep] = useState("idle"); // idle | confirming | sending
  const [error, setError] = useState("");
  const [result, setResult] = useState(null); // { status, loanNoteReference, txHash } from AL-Ledger

  const alreadyApproved = APPROVED_STATUSES.includes(app.status) || Boolean(app.txHash);
  const txHash = app.txHash ?? result?.txHash ?? null;
  const reference = app.loanNoteReference ?? result?.loanNoteReference ?? null;

  async function handleApprove() {
    setStep("sending");
    setError("");
    try {
      setResult(await approveApplication(app.id));
    } catch (err) {
      setError(err.message);
    }
    setStep("idle");
  }

  // ---- Approved (from Firestore, or straight from AL-Ledger's reply) ----
  if (alreadyApproved || result) {
    return (
      <section id="approval" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
        <h2 className="font-semibold text-emerald-900">Approved</h2>
        <p className="mt-1 text-sm text-emerald-900">
          {alreadyApproved
            ? "This application has been approved and its loan note created on the ledger."
            : "AL-Ledger has created the loan note. The status will update here once it's saved in Firebase."}
        </p>
        {reference && (
          <p className="mt-2 text-sm text-emerald-900">
            Loan note reference:{" "}
            <code id="loan-note-ref" className="break-all rounded bg-white/70 px-1.5 py-0.5 font-mono text-xs">{reference}</code>
          </p>
        )}
        {txHash && (
          <p className="mt-1 text-sm text-emerald-900">
            Transaction hash:{" "}
            <code id="tx-hash" className="break-all rounded bg-white/70 px-1.5 py-0.5 font-mono text-xs">{txHash}</code>
          </p>
        )}
      </section>
    );
  }

  // ---- Not approved yet ----
  return (
    <section id="approval" className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold">Underwriter decision</h2>
          <p className="text-sm text-slate-500">
            Approving sends this application to AL-Ledger, which creates the loan note on the blockchain. It can't be undone.
          </p>
        </div>

        {step === "idle" && (
          <button id="approve" onClick={() => setStep("confirming")} disabled={!ledgerConnected}
            className="rounded-md bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">
            {error ? "Try again" : "Approve"}
          </button>
        )}

        {step === "sending" && (
          <button disabled className="cursor-wait rounded-md bg-emerald-700 px-4 py-2 font-medium text-white opacity-60">
            Approving…
          </button>
        )}
      </div>

      {step === "confirming" && (
        <div id="confirm" className="mt-3 flex flex-wrap items-center gap-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-sm text-amber-900">
            Approve {app.borrowerName}'s application{app.loanAmount ? ` for ${euro(app.loanAmount)}` : ""}?
            {app.ai?.recommendation === "Decline" && " The AI recommendation is Decline."}
          </p>
          <div className="flex gap-2">
            <button id="confirm-approve" onClick={handleApprove}
              className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800">
              Yes, approve
            </button>
            <button onClick={() => setStep("idle")}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-100">
              Cancel
            </button>
          </div>
        </div>
      )}

      {!ledgerConnected && (
        <p className="mt-2 text-sm text-slate-500">
          The approval service isn't connected. Add <code className="font-mono text-xs">VITE_LEDGER_API_URL</code> to the .env file.
        </p>
      )}

      {error && (
        <p id="approve-error" role="alert" className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Approval failed: {error}
        </p>
      )}
    </section>
  );
}
