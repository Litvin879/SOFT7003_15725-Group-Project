import { cloneElement, useEffect, useState } from "react";
import { Navigate } from "react-router";
import { checkRole } from "../auth.js";

// Wraps a page so only a logged-in user with the given role(s) sees it.
// role can be "broker", "underwriter" or ["broker", "underwriter"].
// Anyone else is sent to /login. The page is given `user`:
// { email, uid, role }.
export default function RequireRole({ role, children }) {
  const [user, setUser] = useState(undefined); // undefined = still checking
  const key = [role].flat().join(",");

  useEffect(() => checkRole(key.split(","), setUser), [key]);

  if (user === undefined) {
    return <p className="p-8 text-center text-slate-500">Checking your account…</p>;
  }
  if (user === null) {
    return <Navigate to="/login" replace />;
  }
  return cloneElement(children, { user });
}
