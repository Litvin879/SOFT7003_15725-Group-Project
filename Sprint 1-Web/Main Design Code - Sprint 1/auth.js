// auth.js
// ------------------------------------------------------------
// Everything that talks to Firebase lives here. The pages only
// call these four functions:
//   signUp(name, email, password, role)
//   logIn(email, password, role)
//   logOut()
//   requireRole(role)   -> protects broker.html / underwriter.html
//
// Where things are stored:
//   email + password    -> Firebase Authentication
//                          (Firebase hashes the password; nobody,
//                           not even you, can read it back)
//   email + name + role -> Firestore: users / {user id}
//                          (same layout as the mobile app's users)
// ------------------------------------------------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { firebaseConfig, USERS_COLLECTION, ROLES } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// "Broker", "broker", " Broker " all count as the same role
const same = (a, b) => String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();

// True if the user's saved Firestore role is the given web role
async function hasRole(uid, role) {
  const snapshot = await getDoc(doc(db, USERS_COLLECTION, uid));
  return snapshot.exists() && same(snapshot.data().role, ROLES[role].value);
}

// ---- SIGN UP ----
// 1. Create the account in Firebase Authentication
// 2. Save email, name and role in Firestore
export async function signUp(name, email, password, role) {
  if (!ROLES[role]) throw new Error("Choose Broker or Bank Underwriter.");
  if (!name) throw new Error("Enter your full name.");

  const cred = await createUserWithEmailAndPassword(auth, email, password);

  try {
    await setDoc(doc(db, USERS_COLLECTION, cred.user.uid), {
      email: cred.user.email,
      name: name,
      role: ROLES[role].value,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    // Couldn't save the role (usually Security Rules), so undo the
    // account. Otherwise it would exist with no role.
    await cred.user.delete();
    throw err;
  }

  return ROLES[role].page;
}

// ---- LOG IN ----
// 1. Check email + password with Firebase Authentication
// 2. Check the role saved in Firestore matches the button pressed
//    (so a Borrower from the mobile app can't log into the web portal)
export async function logIn(email, password, role) {
  if (!ROLES[role]) throw new Error("Choose Broker or Bank Underwriter.");

  const cred = await signInWithEmailAndPassword(auth, email, password);

  if (!(await hasRole(cred.user.uid, role))) {
    await signOut(auth);
    throw new Error(`This account is not registered as a ${ROLES[role].label}.`);
  }

  return ROLES[role].page;
}

export function logOut() {
  return signOut(auth);
}

// ---- PROTECT A PAGE ----
// Sends the visitor to login.html unless they are logged in
// with the given role. Resolves with the user's email.
export function requireRole(role) {
  return new Promise(resolve => {
    const stop = onAuthStateChanged(auth, async user => {
      stop();
      if (user && (await hasRole(user.uid, role))) {
        resolve(user.email);
      } else {
        window.location.href = "login.html";
      }
    });
  });
}

// Turns Firebase error codes into plain English
export function friendlyError(err) {
  const messages = {
    "auth/email-already-in-use": "That email is already registered.",
    "auth/invalid-email": "That email address isn't valid.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/invalid-credential": "Wrong email or password.",
    "auth/wrong-password": "Wrong email or password.",
    "auth/user-not-found": "Wrong email or password.",
    "auth/too-many-requests": "Too many attempts. Wait a minute and try again.",
    "auth/operation-not-allowed": "Email/Password sign-in isn't enabled in this Firebase project.",
    "auth/network-request-failed": "Can't reach Firebase. Check your internet connection.",
    "permission-denied": "Firestore Security Rules blocked this. See README."
  };
  return messages[err.code] || err.message;
}
