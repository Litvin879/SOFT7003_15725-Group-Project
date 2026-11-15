import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { signUp, friendlyError } from "../auth.js";
import AuthCard, { RoleToggle, Field, ErrorMessage, SubmitButton } from "../components/AuthCard.jsx";

export default function Signup() {
  const navigate = useNavigate();
  const [role, setRole] = useState(null);
  const [name, setName] = useState("");
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
      const page = await signUp(name.trim(), email.trim(), password, role);
      navigate(page);
    } catch (err) {
      setError(friendlyError(err));
      setBusy(false);
    }
  }

  return (
    <AuthCard
      title="Create your account"
      subtitle="For mortgage brokers and bank underwriters."
      footer={<>Already have an account? <Link to="/login" className="font-medium text-blue-700 hover:underline">Log in</Link></>}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <RoleToggle value={role} onChange={setRole} />
        <Field label="Full name" id="name" type="text" required value={name} onChange={e => setName(e.target.value)} />
        <Field label="Email" id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} />
        <Field label="Password" id="password" type="password" minLength={6} required value={password} onChange={e => setPassword(e.target.value)} />
        <ErrorMessage>{error}</ErrorMessage>
        <SubmitButton busy={busy}>Create account</SubmitButton>
      </form>
    </AuthCard>
  );
}
