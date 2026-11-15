# AL-Web sign up / login (Firebase)

## What gets stored where
| What | Where in Firebase |
|---|---|
| Email + password | **Authentication** tab (password is hashed by Firebase, nobody can read it) |
| Email + name + role (`"Broker"` / `"Underwriter"`) | **Firestore** → `users` collection → one document per user, named by their user ID (same layout as the mobile app's `"Borrower"` users) |

Borrowers from AL-Mobile can't log into the web portal: login checks the saved role.

## Your friend does this once (in their Firebase console)
1. **Build → Authentication → Sign-in method** → enable **Email/Password**.
2. **⚙ Project settings → General → Your apps** → if there's no web app, click `</>` to add one. Send you the `firebaseConfig` values.
3. **Firestore Database → Rules** → replace everything with the contents of `firestore.rules` → **Publish**. It covers both `users` and `application`, for web and mobile.

## You do this
1. Paste the config values into `firebase-config.js`.
2. If the team decides the underwriter role is spelled differently (e.g. `"Bank Underwriter"`), change `value` in `ROLES` in `firebase-config.js` and the list in `firestore.rules`.

## Running it in VS Code
The pages use JavaScript modules, so they must be opened through a local web server, not by double-clicking the file.

- **Option 1:** install the **Live Server** extension, right-click `index.html` → **Open with Live Server**.
- **Option 2:** in the VS Code terminal run `npx serve .` and open the address it prints.

## Files
| File | What it does |
|---|---|
| `firebase-config.js` | The only file to edit: Firebase keys, collection name, role → page |
| `auth.js` | All Firebase code: signUp, logIn, logOut, requireRole |
| `roleButtons.js` | Broker / Bank Underwriter button selection |
| `index.html` | Home page with Sign up / Log in |
| `signup.html`, `login.html` | The forms |
| `broker.html`, `underwriter.html` | Pipeline previews with sample data (only Log out works), only open for the right logged-in role |
| `firestore.rules` | Security Rules to give your friend |
