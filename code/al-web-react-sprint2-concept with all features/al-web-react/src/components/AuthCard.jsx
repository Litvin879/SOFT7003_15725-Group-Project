import { Link } from "react-router";

// Shared look for the sign-up and login pages
export default function AuthCard({ title, subtitle, children, footer }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-10">
      <Link to="/" className="mb-6 flex items-center gap-2 font-semibold text-slate-700 hover:text-slate-900">
        <span className="grid h-8 w-8 place-items-center rounded-md bg-blue-700 text-sm font-bold text-white">AL</span>
        Agentic Lender
      </Link>

      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>

      <p className="mt-6 text-sm text-slate-600">{footer}</p>
    </main>
  );
}

// Broker / Bank Underwriter choice
export function RoleToggle({ value, onChange }) {
  const options = [
    { role: "broker", label: "Broker" },
    { role: "underwriter", label: "Bank Underwriter" }
  ];
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-slate-700">I am a</legend>
      <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
        {options.map(o => (
          <button
            key={o.role}
            type="button"
            data-role={o.role}
            aria-pressed={value === o.role}
            onClick={() => onChange(o.role)}
            className={
              "rounded-md px-3 py-2 text-sm font-medium transition " +
              (value === o.role ? "bg-blue-700 text-white shadow-sm" : "text-slate-600 hover:bg-white")
            }
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

// Labelled text input
export function Field({ label, ...inputProps }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        {...inputProps}
        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

export function ErrorMessage({ children }) {
  if (!children) return null;
  return (
    <p id="error" role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {children}
    </p>
  );
}

export function SubmitButton({ busy, children }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="w-full rounded-md bg-slate-900 px-4 py-2.5 font-medium text-white hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60"
    >
      {busy ? "Please wait…" : children}
    </button>
  );
}
