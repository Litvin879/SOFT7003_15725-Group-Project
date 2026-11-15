import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from "react-router";
import "./index.css";

import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import BrokerPipeline from "./pages/BrokerPipeline.jsx";
import UnderwriterPipeline from "./pages/UnderwriterPipeline.jsx";
import LoanFile from "./pages/LoanFile.jsx";
import AiAudit from "./pages/AiAudit.jsx";
import StressTest from "./pages/StressTest.jsx";
import RequireRole from "./components/RequireRole.jsx";

// BrowserRouter gives clean addresses like /login.
// HashRouter (#/login) is only used for the hosted preview build.
const Router = import.meta.env.VITE_ROUTER === "hash" ? HashRouter : BrowserRouter;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Only open for a logged-in user with the right role */}
        <Route path="/broker" element={
          <RequireRole role="broker"><BrokerPipeline /></RequireRole>
        } />
        <Route path="/underwriter" element={
          <RequireRole role="underwriter"><UnderwriterPipeline /></RequireRole>
        } />
        <Route path="/underwriter/stress-test" element={
          <RequireRole role="underwriter"><StressTest /></RequireRole>
        } />
        <Route path="/application/:id" element={
          <RequireRole role={["broker", "underwriter"]}><LoanFile /></RequireRole>
        } />
        <Route path="/application/:id/audit" element={
          <RequireRole role={["broker", "underwriter"]}><AiAudit /></RequireRole>
        } />

        {/* Any other address goes back home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  </StrictMode>
);
