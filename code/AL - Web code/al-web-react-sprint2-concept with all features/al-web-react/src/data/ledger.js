// ledger.js
// ------------------------------------------------------------
// Talks to the AL-Ledger backend when an underwriter clicks Approve.
//
// Set the backend's address in a .env file in the project folder:
//   VITE_LEDGER_API_URL=http://localhost:3001
//
// Request AL-Web sends (agreed with AL-Ledger):
//   POST {VITE_LEDGER_API_URL}/api/applications/{applicationId}/approve
//   Authorization: Bearer <the underwriter's Firebase ID token>
//   (no body: the application ID is in the URL)
//
// Reply AL-Web expects:
//   200 { "status": "Underwriter Approved",
//         "loanNoteReference": "...",
//         "loanNoteTransactionHash": "0x..." }
//   4xx/5xx { "error": "Message to show on the page" }
//
// The backend checks the user is allowed to approve (using the
// token), creates the loan note on Hardhat, and saves the approval
// status and transaction hash in Firestore. The loan file listens to
// Firestore, so it updates by itself once that's saved.
// ------------------------------------------------------------
import { auth } from "../auth.js";

const LEDGER_API_URL = import.meta.env.VITE_LEDGER_API_URL?.replace(/\/+$/, "");

// Change here if AL-Ledger moves the endpoint
const approveUrl = applicationId =>
  `${LEDGER_API_URL}/api/applications/${encodeURIComponent(applicationId)}/approve`;

export const ledgerConnected = Boolean(LEDGER_API_URL);

const MESSAGES = {
  401: "Your login has expired. Log out, log in again and retry.",
  403: "You're not allowed to approve this application.",
  404: "AL-Ledger couldn't find this application.",
  409: "This application has already been approved."
};

// Sends the application ID to AL-Ledger.
// Returns { status, loanNoteReference, txHash } or throws an Error
// with a message to show.
export async function approveApplication(applicationId) {
  if (!LEDGER_API_URL) {
    throw new Error("The approval service isn't connected. Add VITE_LEDGER_API_URL to the .env file and restart npm run dev.");
  }

  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("You're not logged in. Log in again and retry.");

  let response;
  try {
    response = await fetch(approveUrl(applicationId), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
    });
  } catch {
    throw new Error("Couldn't reach the approval service. Check that the AL-Ledger backend is running.");
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || body.message || MESSAGES[response.status] || `Approval failed (error ${response.status}). Try again.`);
  }
  return {
    status: body.status ?? "Underwriter Approved",
    loanNoteReference: body.loanNoteReference ?? null,
    txHash: body.loanNoteTransactionHash ?? null
  };
}
