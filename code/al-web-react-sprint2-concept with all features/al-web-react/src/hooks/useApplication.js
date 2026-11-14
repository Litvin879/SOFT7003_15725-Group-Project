import { useEffect, useState } from "react";
import { watchApplication, withAssessment } from "../data/applications.js";
import { aiEngineApiEnabled, fetchAssessment } from "../data/aiEngine.js";

// One application, live from Firestore, for the loan file and AI audit pages.
// Returns { loading, error, app }. If an AI Engine API is set up, its
// results are added on top of what's in Firestore.
export default function useApplication(id, user) {
  const [state, setState] = useState({ loading: true, error: null, app: null });
  const [fromApi, setFromApi] = useState({ assessment: null, error: null });

  useEffect(() => watchApplication(
    id, user,
    app => setState({ loading: false, error: null, app }),
    error => setState({ loading: false, error, app: null })
  ), [id, user.uid]);

  useEffect(() => {
    if (!aiEngineApiEnabled) return;
    let cancelled = false;
    fetchAssessment(id).then(
      assessment => !cancelled && setFromApi({ assessment, error: null }),
      err => !cancelled && setFromApi({ assessment: null, error: err.message })
    );
    return () => { cancelled = true; };
  }, [id]);

  let app = state.app;
  if (app && fromApi.assessment) app = withAssessment(app, fromApi.assessment);
  if (app && fromApi.error) app = { ...app, aiError: fromApi.error };
  return { loading: state.loading, error: state.error, app };
}
