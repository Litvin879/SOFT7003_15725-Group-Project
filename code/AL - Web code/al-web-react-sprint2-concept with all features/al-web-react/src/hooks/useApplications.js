import { useEffect, useState } from "react";
import { watchApplications } from "../data/applications.js";

// Live list of applications for the logged-in user.
// Updates by itself when an application is added or changed in Firestore.
export default function useApplications(user) {
  const [state, setState] = useState({ apps: [], loading: true, error: null });

  useEffect(() => {
    if (!user) return;
    return watchApplications(
      user,
      apps => setState({ apps, loading: false, error: null }),
      error => setState({ apps: [], loading: false, error })
    );
  }, [user?.uid, user?.role]);

  return state;
}
