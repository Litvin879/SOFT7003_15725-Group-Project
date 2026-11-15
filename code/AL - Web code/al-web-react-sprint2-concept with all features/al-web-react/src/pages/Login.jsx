import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { logIn, friendlyError } from "../auth.js";
import AuthCard, { RoleToggle, Field, ErrorMessage, SubmitButton } from "../components/AuthCard.jsx";

export default function Login() {
  const navigate = useNavigate();
  const [role, setRole] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (!role) return setError("Choose Broker or Bank Underwriter.");

    setBusy(true);
    try {
      // Firebase checks the password, then the saved role must match
      const page = await logIn(email.trim(), password, role);
      navigate(page);
    } catch (err) {
      setError(friendlyError(err));
      setBusy(false);
    }
  }

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Log in to your AL-Web account."
      footer={<>No account yet? <Link to="/signup" className="font-medium text-blue-700 hover:underline">Sign up</Link></>}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <RoleToggle value={role} onChange={setRole} />
        <Field label="Email" id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} />
        <Field label="Password" id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)} />
        <ErrorMessage>{error}</ErrorMessage>
        <SubmitButton busy={busy}>Log in</SubmitButton>
      </form>
    </AuthCard>
  );
}
