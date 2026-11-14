# AL-Web data contract

What AL-Web reads from Firestore, so AL-Mobile, the AI Engine and AL-Web agree on field names.
All field names are set in one place: `FIELDS` in `src/data/applications.js`.

## `application/{applicationId}` (written by AL-Mobile)
| Field | Type | Used for | In the data today? |
|---|---|---|---|
| `borrowerID` | string (user ID) | Borrower name | Yes |
| `brokerID` | string (user ID) | Broker sees only their clients | Yes |
| `status` | string: `Applied`, `AI Deliberated`, `Underwriter Approved`, `Funded`, `Closed` | Status column, counts, filter | Yes |
| `financialDetails.annualIncome` | number (€ a year) | DTI | Yes |
| `financialDetails.deposit` | number (€) | Loan amount if `loanAmount` is missing | Yes |
| `financialDetails.existingDebt` | number (€ **a month** — to confirm) | DTI | Yes |
| `financialDetails.mortgageTermYears` | number | Repayment estimate | Yes |
| `financialDetails.interestRate` | number (% a year) | Repayment, stress test | **No — assumed 4% until added** |
| `propertyDetails.propertyType`, `county`, `bedrooms` | string / string / number | Property column, loan file | Yes |
| `propertyDetails.askingPrice` | number (€) | LTV, asking price vs ML valuation | **No — please add** |
| `loanAmount` | number (€) | Loan column, LTV | No (worked out as asking price − deposit) |
| `createdAt` | Firestore timestamp | Submitted column, newest first | **No — please add** |

## `application/{applicationId}.aiAssessment` (written by the AI Engine)
| Field | Type | Used for |
|---|---|---|
| `ltv` | number (%) | LTV and LTV band |
| `riskTier` | `Low`, `Medium` or `High` | Risk tier column and filter |
| `mlValuation` | number (€) | Asking price vs ML valuation |
| `monthlyRepayment` | number (€) | DTI breakdown |
| `dti` | number (%) | Shown beside AL-Web's own DTI |
| `recommendation` | `Approve`, `Conditionally Approve` or `Decline` | Loan file, AI audit final decision |
| `consensus` | number, 0–100 or 0–1 | AI audit agreement (worked out from agent verdicts if missing) |
| `creditMemo` | string | AI audit |
| `agents` | list, see below | AI audit agent reasoning |

### `aiAssessment.agents` (AI audit console, assumed shape)
One entry per agent. AL-Web also accepts an object keyed by agent name instead of a list.

| Field | Type | Notes |
|---|---|---|
| `agent` | `Affordability`, `Valuation`, `Market & Macro`, `Underwriting Strategist` | Matched loosely, so "Affordability Agent" or `market_macro` also work |
| `verdict` | `Approve`, `Conditionally Approve`, `Decline` | Any case; `APPROVED`, `reject` etc. are understood |
| `confidence` | number, 0–1 or 0–100 | Optional |
| `reasoning` | string | The agent's full reasoning log, shown read-only |
| `keyFindings` | list of strings | Optional, shown as bullet points |
| `createdAt` | timestamp or ISO string | Optional |

Until these exist, AL-Web shows "Pending" for risk tier, works out LTV from the asking price,
estimates the repayment at 4%, and the AI audit says the committee hasn't reviewed the application yet.

## Stress test assumptions (agree with the team)
- Active applications: every status except `Closed`.
- Repayments use a standard repayment mortgage over the full term at `financialDetails.interestRate`
  (4% when missing), then again at that rate plus the rise (+100 to +300 bps).
- "At risk" means DTI above 40% (`AFFORDABILITY_DTI_LIMIT` in `src/lib/lending.js`).
- Applications missing loan amount, term or income are listed as "Not tested".

## Optional: AI Engine HTTP API
Instead of (or as well as) writing `aiAssessment`, the AI Engine can serve:

```
GET /applications/{applicationId}/assessment
Authorization: Bearer <Firebase ID token>
→ 200 { "ltv": 88.2, "riskTier": "High", "mlValuation": 290000, "monthlyRepayment": 1222, "dti": 41.5, "recommendation": "Decline" }
→ 404 if there's no assessment yet
```

Turn it on in AL-Web by creating a `.env` file with `VITE_AI_ENGINE_URL=http://localhost:5000`
(the API must allow requests from the AL-Web address, i.e. CORS).

## `users/{uid}`
| Field | Type | Used for |
|---|---|---|
| `name` | string | Borrower and broker names in the pipeline |
| `email` | string | Fallback when there's no name |
| `role` | `Borrower`, `Broker` or `Underwriter` | Access |

## AL-Ledger: Approve button (agreed with AL-Ledger)
When an underwriter confirms Approve on the loan file, AL-Web sends:

```
POST {VITE_LEDGER_API_URL}/api/applications/{applicationId}/approve
Authorization: Bearer <underwriter's Firebase ID token>
(no body: the application ID is the Firestore document ID in the URL)
```

AL-Ledger replies:
```
200 { "status": "Underwriter Approved", "loanNoteReference": "...", "loanNoteTransactionHash": "0x..." }
4xx / 5xx { "error": "Message to show on the page" }
```
Without an `error` text AL-Web shows: 401 login expired, 403 not allowed, 404 not found, 409 already approved.

AL-Ledger's backend:
- checks the token (Firebase Admin SDK `verifyIdToken`) and that `users/{uid}.role` is `"Underwriter"`
- creates the loan note on Hardhat
- saves on `application/{applicationId}`: `status: "Underwriter Approved"`, `loanNoteReference`, `loanNoteTransactionHash` (names to confirm)
- should refuse a second approval of the same application (409), because a browser can retry a request
- must allow requests from the AL-Web address (CORS), e.g. http://localhost:5173, including the `Authorization` header

The loan file listens to Firestore, so it shows "Approved", the loan note reference and the transaction hash
as soon as AL-Ledger saves them. Field names are in `FIELDS` in `src/data/applications.js`.
