import type { ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "./authContext";
import {
  canAccessCapability,
  type Capability,
} from "./roleAccess";

export default function RequireCapability({
  capability,
  children,
}: {
  capability: Capability;
  children: ReactNode;
}) {
  const auth = useAuth();
  const navigate = useNavigate();

  if (auth.user && canAccessCapability(auth.user.roles, capability)) {
    return children;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <section
        className="w-full max-w-lg rounded-lg border border-red-200 bg-white p-6 shadow-sm"
        aria-labelledby="access-denied-title"
      >
        <ShieldAlert className="h-7 w-7 text-red-700" aria-hidden="true" />
        <h1 id="access-denied-title" className="mt-4 text-xl font-semibold text-slate-950">
          Geen toegang
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Uw Keycloak-rol geeft geen toegang tot deze processtap.
        </p>
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="mt-5 rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
        >
          Naar dashboard
        </button>
      </section>
    </main>
  );
}
