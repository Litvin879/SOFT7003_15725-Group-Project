// storage.js
// ------------------------------------------------------------
// The ONLY file that knows where data lives.
// Every storage option has the same two functions:
//   save(text)  -> stores one entry
//   getAll()    -> returns all entries [{ text, createdAt }]
// To switch database, change the last line of this file.
// ------------------------------------------------------------

// Option 1: browser localStorage (works immediately, no setup).
// Data is saved in THIS browser only.
const localStorageDB = {
  async save(text) {
    const entries = JSON.parse(localStorage.getItem("entries") || "[]");
    entries.push({ text: text, createdAt: new Date().toISOString() });
    localStorage.setItem("entries", JSON.stringify(entries));
  },

  async getAll() {
    return JSON.parse(localStorage.getItem("entries") || "[]");
  }
};

// Option 2: Firebase Firestore (real online database).
// To use it:
//   1. Paste your config from Firebase console > Project settings.
//   2. Uncomment the two Firebase <script> tags in index.html and view.html.
//   3. Change the last line of this file to: const storage = firestoreDB;
const firebaseConfig = {
  apiKey: "PASTE_HERE",
  authDomain: "PASTE_HERE",
  projectId: "PASTE_HERE"
};

const firestoreDB = {
  db() {
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    return firebase.firestore();
  },

  async save(text) {
    await this.db().collection("entries").add({
      text: text,
      createdAt: new Date().toISOString()
    });
  },

  async getAll() {
    const snapshot = await this.db().collection("entries").orderBy("createdAt").get();
    return snapshot.docs.map(doc => doc.data());
  }
};

// ---- Choose which storage to use (change this line only) ----
const storage = localStorageDB;
