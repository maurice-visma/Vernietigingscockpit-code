import type { ReactNode } from "react";

import { useAuth } from "./authContext";

export default function RequireAuth({ children }: { children: ReactNode }) {
  const auth = useAuth();

  if (auth.mode !== "keycloak") {
    return children;
  }

  if (auth.status === "loading") {
    return <AuthStatePanel title="Aanmelden controleren" />;
  }

  if (!auth.keycloakConfigured) {
    return (
      <AuthStatePanel
        title="Keycloak configuratie ontbreekt"
        detail="Zet VITE_KEYCLOAK_ISSUER en VITE_KEYCLOAK_CLIENT_ID, of gebruik VITE_AUTH_MODE=dev voor lokale ontwikkeling."
      />
    );
  }

  if (auth.status !== "authenticated") {
    return (
      <AuthStatePanel
        title="Inloggen vereist"
        detail="Meld aan met Keycloak om de vernietigingscockpit te gebruiken."
        actionLabel="Inloggen met Keycloak"
        onAction={() => void auth.login()}
      />
    );
  }

  return children;
}

function AuthStatePanel({
  title,
  detail,
  actionLabel,
  onAction,
}: {
  title: string;
  detail?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-950">{title}</h1>
        {detail ? <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p> : null}
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="mt-5 rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
          >
            {actionLabel}
          </button>
        ) : null}
      </section>
    </div>
  );
}
