import { Link } from "react-router";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-blue-700 text-lg font-bold text-white">AL</span>
        <h1 className="mt-4 text-4xl font-bold tracking-tight">Agentic Lender</h1>
        <p className="mt-3 text-lg text-slate-600">
          The web portal for mortgage brokers and bank underwriters.
        </p>

        <div className="mt-8 grid gap-4 text-left sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold">Brokers</h2>
            <p className="mt-1 text-sm text-slate-600">Follow your clients' mortgage applications through the pipeline.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold">Bank underwriters</h2>
            <p className="mt-1 text-sm text-slate-600">Oversee every application and sign off on decisions.</p>
          </div>
        </div>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/signup" className="rounded-md bg-slate-900 px-6 py-2.5 font-medium text-white hover:bg-slate-800">
            Sign up
          </Link>
          <Link to="/login" className="rounded-md border border-slate-300 bg-white px-6 py-2.5 font-medium hover:bg-slate-100">
            Log in
          </Link>
        </div>

        <p className="mt-6 text-sm text-slate-500">Borrowers use the Agentic Lender mobile app.</p>
      </div>
    </main>
  );
}
