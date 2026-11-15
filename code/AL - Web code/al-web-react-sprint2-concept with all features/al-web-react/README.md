# AL-Web (React + React Router + Tailwind CSS)

Broker and underwriter portal for Agentic Lender, connected to the team's Firebase project.

## Run it in VS Code
You need Node.js (LTS) installed. Open this folder in VS Code, then in the terminal:

```
npm install
npm run dev
```

Open the address it prints (usually http://localhost:5173). Stop it with Ctrl+C.

### Settings (.env)
Copy `.env.example` to `.env` and set `VITE_LEDGER_API_URL` to the AL-Ledger backend address (needed for the Approve button). Restart `npm run dev` after changing `.env`.

## Pages (React Router)
| Address | Page | Who can open it |
|---|---|---|
| `/` | Home | Anyone |
| `/signup` | Sign up | Anyone |
| `/login` | Log in | Anyone |
| `/broker` | Broker Pipeline | Logged-in Broker only |
| `/underwriter` | Underwriter Pipeline | Logged-in Underwriter only |
| `/underwriter/stress-test` | Stress-testing simulator | Logged-in Underwriter only |
| `/application/:id` | Loan file | The broker of that client, or any Underwriter |
| `/application/:id/audit` | AI audit console | The broker of that client, or any Underwriter |

Routes are set in `src/main.jsx`. `RequireRole` sends anyone without the right role to `/login`.

## Files
| File | What it does |
|---|---|
| `src/firebase-config.js` | Firebase keys, collection name, roles and their pages |
| `src/auth.js` | All Firebase code: signUp, logIn, logOut, checkRole |
| `src/main.jsx` | React Router routes |
| `src/components/RequireRole.jsx` | Protects the pipeline pages |
| `src/components/AuthCard.jsx` | Sign-up / login card, role toggle, inputs |
| `src/components/Pipeline.jsx` | Pipeline header, count tiles, working filters, table, empty messages |
| `src/pages/*.jsx` | Home, Signup, Login, BrokerPipeline, UnderwriterPipeline, LoanFile, AiAudit, StressTest |
| `src/components/ApplicationFrame.jsx` | Shared heading and Loan file / AI audit tabs for one application |
| `src/hooks/useApplication.js` | One application, live from Firestore |
| `src/data/applications.js` | Reads applications from Firestore (broker: own clients, underwriter: all); `FIELDS` holds every field name |
| `src/data/ledger.js` | Sends the application ID to the AL-Ledger backend when Approve is clicked |
| `src/components/ApprovalPanel.jsx` | Underwriter's Approve button: confirm, sending, approved (transaction hash) or error |
| `src/data/aiEngine.js` | Receives AI Engine results (Firestore `aiAssessment` or an HTTP API) |
| `src/hooks/useApplications.js` | Live list of applications for a page |
| `src/lib/lending.js` | LTV, LTV band, repayment, DTI, valuation and stress-test calculations |
| `DATA-CONTRACT.md` | Field names AL-Web expects from AL-Mobile and the AI Engine |
| `src/index.css` | Loads Tailwind CSS |
| `firestore.rules` | Security Rules for the Firebase project |

## Where data is stored
- Email + password: Firebase Authentication (password hashed by Firebase)
- Email + name + role (`"Broker"` / `"Underwriter"`): Firestore `users/{user id}`

## Testing without touching the real project (optional)
Set `VITE_AUTH_EMULATOR=http://127.0.0.1:9099` to use Firebase's local login emulator instead.
