"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { PendingCode, PublicAccount } from "@/lib/accounts";
import type { AccountRole, FormValues } from "@/lib/auth";
import type { ApiResult, PilotCode, SessionResponse } from "@/lib/server/contracts";
import { DEMO_LOGIN_CREDENTIALS } from "@/lib/demo-accounts";

/* ==================================================================
   HOMERA — CONTEXTE DE COMPTE (branché sur le serveur)
   ------------------------------------------------------------------
   Le compte vit sur le serveur : la session est un cookie `httpOnly`
   que le navigateur ne peut pas lire ni falsifier, les rôles sont
   décidés en base, et chaque action passe par l’API HOMERA.

   Ce que ce fichier garantit, et qui n’a pas changé :
   • aucun état inventé : `ready` ne passe à vrai qu’après la réponse
     du serveur ; avant, les commandes s’affichent dans leur état neutre ;
   • aucune action qui mente : chaque appel rend une issue explicite
     (`ok` + données, ou message + champs fautifs) affichée telle quelle ;
   • une seule source : l’interface ne recompose jamais une décision
     d’accès, elle affiche celle que le serveur a prise.

   Codes à l’écran : le pilote n’envoie pas encore d’e-mails
   transactionnels. Le code de vérification est donc affiché au lieu
   d’être expédié — et le contrat le dit (`emailSent: false`).
   ================================================================== */

export type AuthOutcome<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; fields?: Record<string, string> };

export type AuthContextValue = {
  /** Le serveur a répondu : l’état affiché est réel. */
  ready: boolean;
  account: PublicAccount | null;
  /** Tous les rôles métiers détenus — le socle client est inclus par construction. */
  roles: AccountRole[];
  /** Comptes de démonstration disponibles sur ce serveur pilote. */
  accountsCount: number;
  /** Dernier code émis — affiché faute d’e-mail, jamais présenté comme envoyé. */
  pendingCode: PendingCode | null;
  /** Espaces réellement ouverts au compte (décidé côté serveur). */
  workspaces: SessionResponse["workspaces"];
  /** Destination d’atterrissage après connexion. */
  landing: string;
  unreadNotifications: number;
  signUp: (input: {
    role: AccountRole;
    values: FormValues;
  }) => Promise<AuthOutcome<{ account: PublicAccount }>>;
  addRole: (input: {
    role: AccountRole;
    values: FormValues;
  }) => Promise<AuthOutcome<{ account: PublicAccount }>>;
  signIn: (input: {
    email: string;
    password: string;
    remember: boolean;
  }) => Promise<AuthOutcome<{ needsVerification: boolean; landing: string }>>;
  signOut: () => Promise<void>;
  verifyEmail: (code: string) => Promise<AuthOutcome<null>>;
  resendVerification: () => Promise<AuthOutcome<{ code: string }>>;
  changeEmail: (email: string) => Promise<AuthOutcome<{ code: string }>>;
  requestPasswordReset: (email: string) => Promise<AuthOutcome<{ token: string; code: string }>>;
  resetPassword: (input: {
    token?: string;
    code?: string;
    password: string;
    confirmation: string;
  }) => Promise<AuthOutcome<{ email: string }>>;
  clearPendingCode: () => void;
  /** Recharge l’état depuis le serveur (après une action extérieure au contexte). */
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const EMPTY_SESSION: SessionResponse = {
  authenticated: false,
  account: null,
  workspaces: [],
  landing: "/client",
  unreadNotifications: 0,
};

/** Appel uniforme : jamais d’exception, toujours une issue explicite. */
async function call<T>(url: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => null)) as ApiResult<T> | null;
    if (!payload) {
      return {
        ok: false,
        message: "Le serveur n’a pas répondu correctement. Réessayez dans un instant.",
      };
    }
    return payload;
  } catch {
    return {
      ok: false,
      message:
        "La connexion au serveur HOMERA a échoué. Vérifiez votre réseau, puis réessayez.",
    };
  }
}

const post = <T,>(url: string, body: unknown) =>
  call<T>(url, { method: "POST", body: JSON.stringify(body ?? {}) });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<SessionResponse>(EMPTY_SESSION);
  const [pendingCode, setPendingCode] = useState<PendingCode | null>(null);

  const refresh = useCallback(async () => {
    const result = await call<SessionResponse>("/api/auth/session");
    setSession(result.ok ? result.data : EMPTY_SESSION);
    setReady(true);
  }, []);

  // La session vient du serveur : on ne synchronise l’état qu’après la réponse,
  // jamais de façon synchrone dans le corps de l’effet.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await call<SessionResponse>("/api/auth/session");
      if (cancelled) return;
      setSession(result.ok ? result.data : EMPTY_SESSION);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ------------------------------------------------------------------
     INSCRIPTION ET CONNEXION
     ------------------------------------------------------------------ */

  const signUp = useCallback<AuthContextValue["signUp"]>(
    async ({ role, values }) => {
      const result = await post<{
        account: PublicAccount;
        code: string;
        codeExpiresAt: number;
        emailSent: boolean;
        landing: string;
      }>("/api/auth/signup", { role, values, remember: true });
      if (!result.ok) return { ok: false, message: result.message, fields: result.fields };
      setPendingCode({
        purpose: "verification",
        email: result.data.account.email,
        code: result.data.code,
        expiresAt: result.data.codeExpiresAt,
      });
      setSession((current) => ({ ...current, account: result.data.account, authenticated: true, landing: result.data.landing }));
      return { ok: true, data: { account: result.data.account } };
    },
    [],
  );

  const signIn = useCallback<AuthContextValue["signIn"]>(
    async ({ email, password, remember }) => {
      const result = await post<{
        account: PublicAccount;
        needsVerification: boolean;
        landing: string;
      }>("/api/auth/signin", { email, password, remember });
      if (!result.ok) return { ok: false, message: result.message, fields: result.fields };
      await refresh();
      return {
        ok: true,
        data: { needsVerification: result.data.needsVerification, landing: result.data.landing },
      };
    },
    [refresh],
  );

  const signOut = useCallback(async () => {
    await post<{ signedOut: boolean }>("/api/auth/signout", {});
    setPendingCode(null);
    setSession(EMPTY_SESSION);
  }, []);

  const addRole = useCallback<AuthContextValue["addRole"]>(
    async ({ role, values }) => {
      const result = await post<{ account: PublicAccount }>("/api/auth/roles", { role, values });
      if (!result.ok) return { ok: false, message: result.message, fields: result.fields };
      await refresh();
      return { ok: true, data: { account: result.data.account } };
    },
    [refresh],
  );

  /* ------------------------------------------------------------------
     VÉRIFICATION DE L’ADRESSE
     ------------------------------------------------------------------ */

  const verifyEmail = useCallback<AuthContextValue["verifyEmail"]>(
    async (code) => {
      const result = await post<{ account: PublicAccount }>("/api/auth/verify-email", { code });
      if (!result.ok) return { ok: false, message: result.message, fields: result.fields };
      setPendingCode(null);
      await refresh();
      return { ok: true, data: null };
    },
    [refresh],
  );

  const resendVerification = useCallback<AuthContextValue["resendVerification"]>(async () => {
    const result = await post<{ code: string; expiresAt: number }>("/api/auth/verify-email", {
      action: "renvoyer",
    });
    if (!result.ok) return { ok: false, message: result.message, fields: result.fields };
    setPendingCode({
      purpose: "verification",
      email: session.account?.email ?? "",
      code: result.data.code,
      expiresAt: result.data.expiresAt,
    });
    return { ok: true, data: { code: result.data.code } };
  }, [session.account?.email]);

  const changeEmail = useCallback<AuthContextValue["changeEmail"]>(
    async (email) => {
      const result = await post<{ account: PublicAccount; code: string; expiresAt: number }>("/api/me", {
        email,
      });
      if (!result.ok) return { ok: false, message: result.message, fields: result.fields };
      setPendingCode({
        purpose: "verification",
        email,
        code: result.data.code,
        expiresAt: result.data.expiresAt,
      });
      await refresh();
      return { ok: true, data: { code: result.data.code } };
    },
    [refresh],
  );

  /* ------------------------------------------------------------------
     MOT DE PASSE OUBLIÉ
     ------------------------------------------------------------------ */

  const requestPasswordReset = useCallback<AuthContextValue["requestPasswordReset"]>(async (email) => {
    const result = await post<{ email: string; code: string; token: string; expiresAt: number; known: boolean }>(
      "/api/auth/password/forgot",
      { email },
    );
    if (!result.ok) return { ok: false, message: result.message, fields: result.fields };
    if (!result.data.known) {
      return {
        ok: false,
        message:
          "Aucun compte HOMERA n’utilise cette adresse. Vérifiez la saisie ou créez un compte.",
        fields: { email: "Adresse inconnue." },
      };
    }
    setPendingCode({
      purpose: "reset",
      email: result.data.email,
      code: result.data.code,
      expiresAt: result.data.expiresAt,
      token: result.data.token,
    } satisfies PilotCode);
    return { ok: true, data: { token: result.data.token, code: result.data.code } };
  }, []);

  const resetPassword = useCallback<AuthContextValue["resetPassword"]>(async (input) => {
    const result = await post<{ email: string }>("/api/auth/password/reset", input);
    if (!result.ok) return { ok: false, message: result.message, fields: result.fields };
    setPendingCode(null);
    return { ok: true, data: { email: result.data.email } };
  }, []);

  const clearPendingCode = useCallback(() => setPendingCode(null), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      account: session.account,
      roles: session.account?.roles ?? [],
      accountsCount: DEMO_LOGIN_CREDENTIALS.length,
      pendingCode,
      workspaces: session.workspaces,
      landing: session.landing,
      unreadNotifications: session.unreadNotifications,
      signUp,
      signIn,
      signOut,
      addRole,
      verifyEmail,
      resendVerification,
      changeEmail,
      requestPasswordReset,
      resetPassword,
      clearPendingCode,
      refresh,
    }),
    [
      ready,
      session,
      pendingCode,
      signUp,
      signIn,
      signOut,
      addRole,
      verifyEmail,
      resendVerification,
      changeEmail,
      requestPasswordReset,
      resetPassword,
      clearPendingCode,
      refresh,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth doit être utilisé à l’intérieur de <AuthProvider>.");
  return context;
}
