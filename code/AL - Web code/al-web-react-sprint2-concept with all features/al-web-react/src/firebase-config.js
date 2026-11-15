// firebase-config.js
// ------------------------------------------------------------
// The ONLY file you edit to connect to the Agentic Lender Firebase.
//
// Where to find these values:
//   Firebase console > ⚙ Project settings > General > Your apps
//   (it must be a WEB app, the </> icon, not the Android app)
// ------------------------------------------------------------

export const firebaseConfig = {
  apiKey: "AIzaSyD_ZAWsAhlcu1Z_jOxrDTmUooxbX2YbpR4",
  authDomain: "agentic-lender-668fa.firebaseapp.com",
  projectId: "agentic-lender-668fa",
  storageBucket: "agentic-lender-668fa.firebasestorage.app",
  messagingSenderId: "333912556534",
  appId: "1:333912556534:web:54ed7c417c33add1d6fdd7"
};

// Firestore collection shared with AL-Mobile.
// Each document is named by the user's ID and has: email, name, role
export const USERS_COLLECTION = "users";

// Firestore collection holding mortgage applications (written by AL-Mobile)
export const APPLICATIONS_COLLECTION = "application";

// The two web roles.
//   value -> exactly what is saved in the "role" field
//            (matches the mobile app's style: "Broker", "Borrower")
//   label -> what error messages call it
//   page  -> where the user goes after sign up / login
export const ROLES = {
  broker:      { value: "Broker",      label: "broker",           page: "/broker" },
  underwriter: { value: "Underwriter", label: "bank underwriter", page: "/underwriter" }
};
