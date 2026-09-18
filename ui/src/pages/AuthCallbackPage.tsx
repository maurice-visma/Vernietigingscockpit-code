import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../shared/auth/authContext";
import { completeLoginCallback } from "../shared/auth/keycloakAuth";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    completeLoginCallback(new URL(window.location.href))
      .then((returnTo) => {
        if (cancelled) {
          return;
        }
        auth.refreshSession();
        navigate(returnTo || "/dashboard", { replace: true });
      })
      .catch((callbackError: unknown) => {
        if (!cancelled) {
          setError(callbackError instanceof Error ? callbackError.message : "Aanmelden is mislukt.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [auth, navigate]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <section className="w-full max-w-md rounded-lg border border-red-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-red-900">Aanmelden mislukt</h1>
          <p className="mt-2 text-sm leading-6 text-red-700">{error}</p>
        </section>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-950">Aanmelden afronden</h1>
      </section>
    </div>
  );
}
