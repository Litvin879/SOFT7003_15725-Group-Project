// auth.js
// ------------------------------------------------------------
// Everything that talks to Firebase lives here. The pages only
// call these functions:
//   signUp(name, email, password, role) -> page to open
//   logIn(email, password, role)        -> page to open
//   logOut()
//   checkRole(role, callback)           -> used by RequireRole
//
// Where things are stored:
//   email + password    -> Firebase Authentication
//                          (Firebase hashes the password)
//   email + name + role -> Firestore: users / {user id}
// ------------------------------------------------------------
import { initializeApp } from "firebase/app";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, connectAuthEmulator
} from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { firebaseConfig, USERS_COLLECTION, ROLES } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Testing only: set VITE_AUTH_EMULATOR=http://127.0.0.1:9099 to use
// Firebase's local login emulator instead of the real project.
if (import.meta.env.VITE_AUTH_EMULATOR) {
  connectAuthEmulator(auth, import.meta.env.VITE_AUTH_EMULATOR, { disableWarnings: true });
}

// "Broker", "broker", " Broker " all count as the same role
const same = (a, b) => String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();

// True if the user's saved Firestore role is the given web role
async function hasRole(uid, role) {
  const snapshot = await getDoc(doc(db, USERS_COLLECTION, uid));
  return snapshot.exists() && same(snapshot.data().role, ROLES[role].value);
}

// ---- SIGN UP ----
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
// The role saved in Firestore must match the button pressed
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

// ---- CHECK A PAGE'S ROLE ----
// roles: "broker", "underwriter", or a list of both.
// Calls back with { email, uid, role } if the user is logged in with
// one of those roles, or null if not. Returns a function that stops listening.
export function checkRole(roles, callback) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  return onAuthStateChanged(auth, async user => {
    if (!user) return callback(null);
    for (const role of allowed) {
      if (await hasRole(user.uid, role)) return callback({ email: user.email, uid: user.uid, role });
    }
    callback(null);
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
