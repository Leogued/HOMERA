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
import {
  ACCOUNTS_EVENT,
  SESSION_EVENT,
  clearSession,
  createAccountRecord,
  findAccountByEmail,
  findAccountById,
  hashPassword,
  issueReset,
  issueVerification,
  normalizeEmail,
  publicAccount,
  readAccounts,
  readSession,
  replaceAccount,
  storageWritable,
  verifyPassword,
  withAddedRole,
  writeAccounts,
  writeSession,
  type AccountRecord,
  type PendingCode,
  type PublicAccount,
} from "@/lib/accounts";
import {
  codeState,
  textValue,
  validateEmailOnly,
  validateNewPassword,
  validateRoleUpgrade,
  validateSignIn,
  validateSignUp,
  validateCode,
  MAX_CODE_ATTEMPTS,
  attemptsLeft,
  type AccountRole,
  type FormValues,
} from "@/lib/auth";

/* ==================================================================
   HOMERA — CONTEXTE DE COMPTE
   ------------------------------------------------------------------
   Un seul endroit connaît l’état du compte : les pages, l’en-tête et
   les formulaires le lisent ici. Le stockage vit dans le navigateur
   (lib/accounts.ts), donc rien n’est lu avant le montage — `ready`
   vaut false au premier rendu et les commandes s’affichent dans leur
   état neutre plutôt que dans un état inventé.

   Aucune action ne ment sur son résultat : chaque appel rend une issue
   explicite (`ok` + données, ou message + champs fautifs) que le
   formulaire affiche tel quel.
   ================================================================== */

export type AuthOutcome<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; fields?: Record<string, string> };

export type AuthContextValue = {
  /** Le stockage a été lu : l’état affiché est réel. */
  ready: boolean;
  account: PublicAccount | null;
  /** Tous les rôles détenus — le socle client est inclus par construction. */
  roles: AccountRole[];
  /** Nombre de comptes conservés dans ce navigateur (annoncé dans les écrans du pilote). */
  accountsCount: number;
  /** Dernier code émis — affiché par les écrans du pilote, aucun e-mail n’étant envoyé. */
  pendingCode: PendingCode | null;
  signUp: (input: {
    role: AccountRole;
    values: FormValues;
  }) => Promise<AuthOutcome<{ account: PublicAccount }>>;
  /** Ajouter un rôle à un compte connecté, sans reperdre identité ni mot de passe. */
  addRole: (input: {
    role: AccountRole;
    values: FormValues;
  }) => Promise<AuthOutcome<{ account: PublicAccount }>>;
  signIn: (input: {
    email: string;
    password: string;
    remember: boolean;
  }) => Promise<AuthOutcome<{ needsVerification: boolean }>>;
  signOut: () => void;
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
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [account, setAccount] = useState<PublicAccount | null>(null);
  const [pendingCode, setPendingCode] = useState<PendingCode | null>(null);
  const [ready, setReady] = useState(false);

  /* --- Lecture initiale, puis synchronisation entre onglets --- */
  useEffect(() => {
    const sync = () => {
      const stored = readAccounts();
      setAccounts(stored);
      const session = readSession();
      const current = session ? findAccountById(stored, session.accountId) : undefined;
      setAccount(current ? publicAccount(current) : null);
      if (!current) clearSession();
    };
    sync();
    // Le stockage vit dans le navigateur : il ne peut être lu qu’après le montage.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(true);

    const onAccounts = (event: Event) => {
      const detail = (event as CustomEvent<AccountRecord[]>).detail;
      if (Array.isArray(detail)) {
        setAccounts(detail);
        const session = readSession();
        const current = session ? findAccountById(detail, session.accountId) : undefined;
        setAccount(current ? publicAccount(current) : null);
        return;
      }
      sync();
    };
    const onSession = () => {
      const session = readSession();
      const current = session ? findAccountById(readAccounts(), session.accountId) : undefined;
      setAccount(current ? publicAccount(current) : null);
    };
    const onStorage = (event: StorageEvent) => {
      // Toutes les clés de l’application commencent par « homera. » :
      // les autres onglets, et eux seuls, sont concernés.
      if (event.key && !event.key.startsWith("homera.")) return;
      sync();
    };

    window.addEventListener(ACCOUNTS_EVENT, onAccounts);
    window.addEventListener(SESSION_EVENT, onSession);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(ACCOUNTS_EVENT, onAccounts);
      window.removeEventListener(SESSION_EVENT, onSession);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  /** Relit le stockage et met l’état de l’interface en accord avec lui. */
  const reconcile = useCallback(() => {
    const stored = readAccounts();
    setAccounts(stored);
    const session = readSession();
    const current = session ? findAccountById(stored, session.accountId) : undefined;
    setAccount(current ? publicAccount(current) : null);
  }, []);

  const currentRecord = useCallback(
    (): AccountRecord | null => {
      const session = readSession();
      if (!session) return null;
      return findAccountById(readAccounts(), session.accountId) ?? null;
    },
    [],
  );

  /* ------------------------------------------------------------------
     INSCRIPTION
     ------------------------------------------------------------------ */

  const signUp = useCallback<AuthContextValue["signUp"]>(
    async ({ role, values }) => {
      const validation = validateSignUp(role, values);
      if (!validation.ok) {
        return {
          ok: false,
          message: validation.form ?? "Quelques informations restent à corriger.",
          fields: validation.fields,
        };
      }
      if (!storageWritable()) {
        return {
          ok: false,
          message:
            "Ce navigateur refuse le stockage local (navigation privée stricte ou réglage de confidentialité). Le pilote HOMERA y conserve les comptes : autorisez le stockage, puis réessayez.",
        };
      }

      const stored = readAccounts();
      const email = textValue(values, "email");
      if (findAccountByEmail(stored, email)) {
        return {
          ok: false,
          message: "Un compte est déjà enregistré dans ce navigateur avec cette adresse.",
          fields: { email: "Cette adresse possède déjà un compte ici." },
        };
      }

      const record = await createAccountRecord({
        role,
        values,
        takenIds: stored.map((entry) => entry.id),
      });
      const next = [...stored, record];
      writeAccounts(next);
      // Le stockage peut refuser d’écrire (quota, réglage) : on le vérifie
      // plutôt que d’annoncer un compte qui n’existe nulle part.
      if (!findAccountById(readAccounts(), record.id)) {
        return {
          ok: false,
          message:
            "Ce navigateur n’a pas conservé le compte : le stockage local est plein ou bloqué. Rien n’a été créé — libérez de l’espace, puis réessayez.",
        };
      }
      writeSession(
        { accountId: record.id, startedAt: Date.now(), lastSeenAt: Date.now(), remember: true },
        true,
      );
      setAccounts(next);
      setAccount(publicAccount(record));
      setPendingCode(
        record.verification
          ? {
              purpose: "verification",
              email: record.email,
              code: record.verification.code,
              expiresAt: record.verification.expiresAt,
            }
          : null,
      );
      return { ok: true, data: { account: publicAccount(record) } };
    },
    [],
  );

  /* ------------------------------------------------------------------
     AJOUT D’UN RÔLE
     ------------------------------------------------------------------
     Un compte ne se limite pas à son rôle d’inscription : un client qui
     possède un bien devient propriétaire, un agent cherche aussi parfois
     pour lui-même. L’ajout ne redemande ni identité, ni mot de passe —
     seulement ce que le nouveau rôle exige (et ses consentements).
     ------------------------------------------------------------------ */

  const addRole = useCallback<AuthContextValue["addRole"]>(
    async ({ role, values }) => {
      const record = currentRecord();
      if (!record) {
        return {
          ok: false,
          message: "Aucun compte n’est connecté : reconnectez-vous pour ajouter ce rôle.",
        };
      }
      if (record.roles.includes(role)) {
        return { ok: false, message: `Ce compte détient déjà le rôle « ${role} ».` };
      }

      const validation = validateRoleUpgrade(role, values);
      if (!validation.ok) {
        return {
          ok: false,
          message: validation.form ?? "Quelques informations restent à compléter.",
          fields: validation.fields,
        };
      }

      const next = withAddedRole(record, role, values);
      writeAccounts(replaceAccount(readAccounts(), next));
      if (!findAccountById(readAccounts(), record.id)?.roles.includes(role)) {
        return {
          ok: false,
          message:
            "Ce navigateur n’a pas conservé l’ajout : le stockage local est plein ou bloqué. Rien n’a été modifié.",
        };
      }
      reconcile();
      return { ok: true, data: { account: publicAccount(next) } };
    },
    [currentRecord, reconcile],
  );

  /* ------------------------------------------------------------------
     CONNEXION / DÉCONNEXION
     ------------------------------------------------------------------ */

  const signIn = useCallback<AuthContextValue["signIn"]>(async ({ email, password, remember }) => {
    const validation = validateSignIn({ email, motDePasse: password });
    if (!validation.ok) {
      return { ok: false, message: validation.form ?? "Vérifiez les informations saisies.", fields: validation.fields };
    }

    const stored = readAccounts();
    const record = findAccountByEmail(stored, email);
    if (!record) {
      return {
        ok: false,
        message:
          "Aucun compte n’est enregistré dans ce navigateur avec cette adresse. Les comptes du pilote ne sont pas encore partagés entre appareils : créez le compte ici, ou vérifiez l’adresse saisie.",
        fields: { email: "Adresse inconnue dans ce navigateur." },
      };
    }

    const valid = await verifyPassword(record.password, password);
    if (!valid) {
      return {
        ok: false,
        message: "Le mot de passe ne correspond pas à ce compte.",
        fields: { motDePasse: "Mot de passe incorrect." },
      };
    }

    writeSession({ accountId: record.id, startedAt: Date.now(), lastSeenAt: Date.now(), remember }, remember);
    setAccount(publicAccount(record));
    if (!record.emailVerified && record.verification) {
      setPendingCode({
        purpose: "verification",
        email: record.email,
        code: record.verification.code,
        expiresAt: record.verification.expiresAt,
      });
    } else {
      setPendingCode(null);
    }
    return { ok: true, data: { needsVerification: !record.emailVerified } };
  }, []);

  const signOut = useCallback(() => {
    clearSession();
    setAccount(null);
    setPendingCode(null);
  }, []);

  /* ------------------------------------------------------------------
     VÉRIFICATION DE L’ADRESSE
     ------------------------------------------------------------------ */

  const verifyEmail = useCallback<AuthContextValue["verifyEmail"]>(
    async (code) => {
      const record = currentRecord();
      if (!record) {
        return { ok: false, message: "Aucun compte n’est connecté : reconnectez-vous pour confirmer l’adresse." };
      }
      const problem = validateCode(code);
      if (problem) return { ok: false, message: problem, fields: { code: problem } };

      const state = codeState(record.verification, Date.now());
      if (state === "absent") {
        return { ok: false, message: "Aucun code n’est en attente : demandez-en un nouveau." };
      }
      if (state === "expired") {
        return { ok: false, message: "Ce code a expiré. Demandez un nouveau code pour confirmer l’adresse." };
      }
      if (state === "locked") {
        return {
          ok: false,
          message: `Le nombre d’essais est atteint (${MAX_CODE_ATTEMPTS}). Demandez un nouveau code.`,
        };
      }

      const now = Date.now();
      const cleaned = code.replace(/\s/g, "");
      if (cleaned !== record.verification?.code) {
        const attempts = (record.verification?.attempts ?? 0) + 1;
        const left = attemptsLeft({ code: "", expiresAt: now, attempts });
        const next: AccountRecord = {
          ...record,
          verification: record.verification ? { ...record.verification, attempts } : null,
          updatedAt: new Date().toISOString(),
        };
        writeAccounts(replaceAccount(readAccounts(), next));
        reconcile();
        return {
          ok: false,
          message:
            left > 0
              ? `Ce code ne correspond pas. Il reste ${left} essai${left > 1 ? "s" : ""}.`
              : "Trop d’essais : demandez un nouveau code.",
          fields: { code: "Code incorrect." },
        };
      }

      const next: AccountRecord = {
        ...record,
        emailVerified: true,
        verification: null,
        updatedAt: new Date().toISOString(),
      };
      writeAccounts(replaceAccount(readAccounts(), next));
      reconcile();
      setPendingCode(null);
      return { ok: true, data: null };
    },
    [currentRecord, reconcile],
  );

  const resendVerification = useCallback<AuthContextValue["resendVerification"]>(async () => {
    const record = currentRecord();
    if (!record) {
      return { ok: false, message: "Aucun compte n’est connecté : reconnectez-vous d’abord." };
    }
    if (record.emailVerified) {
      return { ok: false, message: "Cette adresse est déjà confirmée." };
    }
    const verification = issueVerification();
    const next: AccountRecord = { ...record, verification, updatedAt: new Date().toISOString() };
    writeAccounts(replaceAccount(readAccounts(), next));
    reconcile();
    setPendingCode({
      purpose: "verification",
      email: record.email,
      code: verification.code,
      expiresAt: verification.expiresAt,
    });
    return { ok: true, data: { code: verification.code } };
  }, [currentRecord, reconcile]);

  const changeEmail = useCallback<AuthContextValue["changeEmail"]>(
    async (email) => {
      const record = currentRecord();
      if (!record) {
        return { ok: false, message: "Aucun compte n’est connecté : reconnectez-vous d’abord." };
      }
      const problem = validateEmailOnly(email);
      if (problem) return { ok: false, message: problem, fields: { email: problem } };

      const stored = readAccounts();
      const existing = findAccountByEmail(stored, email);
      if (existing && existing.id !== record.id) {
        return {
          ok: false,
          message: "Cette adresse est déjà utilisée par un autre compte de ce navigateur.",
          fields: { email: "Adresse déjà prise dans ce navigateur." },
        };
      }

      const verification = issueVerification();
      const next: AccountRecord = {
        ...record,
        email: email.trim(),
        emailKey: normalizeEmail(email),
        emailVerified: false,
        verification,
        updatedAt: new Date().toISOString(),
      };
      writeAccounts(replaceAccount(stored, next));
      reconcile();
      setPendingCode({
        purpose: "verification",
        email: next.email,
        code: verification.code,
        expiresAt: verification.expiresAt,
      });
      return { ok: true, data: { code: verification.code } };
    },
    [currentRecord, reconcile],
  );

  /* ------------------------------------------------------------------
     MOT DE PASSE OUBLIÉ
     ------------------------------------------------------------------ */

  const requestPasswordReset = useCallback<AuthContextValue["requestPasswordReset"]>(async (email) => {
    const problem = validateEmailOnly(email);
    if (problem) return { ok: false, message: problem, fields: { email: problem } };

    const stored = readAccounts();
    const record = findAccountByEmail(stored, email);
    if (!record) {
      return {
        ok: false,
        message:
          "Aucun compte n’est enregistré dans ce navigateur avec cette adresse. Rien ne peut donc être réinitialisé ici.",
        fields: { email: "Adresse inconnue dans ce navigateur." },
      };
    }

    const reset = issueReset();
    const next: AccountRecord = { ...record, reset, updatedAt: new Date().toISOString() };
    writeAccounts(replaceAccount(stored, next));
    reconcile();
    setPendingCode({
      purpose: "reset",
      email: record.email,
      code: reset.code,
      expiresAt: reset.expiresAt,
      token: reset.token,
    });
    return { ok: true, data: { token: reset.token, code: reset.code } };
  }, [reconcile]);

  const resetPassword = useCallback<AuthContextValue["resetPassword"]>(
    async ({ token, code, password, confirmation }) => {
      const stored = readAccounts();
      const now = Date.now();
      const reference = code?.replace(/\s/g, "") ?? "";

      const record = token
        ? stored.find((entry) => entry.reset?.token === token)
        : stored.find((entry) => reference !== "" && entry.reset?.code === reference);

      if (!record || !record.reset) {
        return {
          ok: false,
          message: token
            ? "Ce lien de réinitialisation n’est plus valable dans ce navigateur — il a peut-être déjà servi. Demandez un nouveau lien depuis « Mot de passe oublié »."
            : "Ce code ne correspond à aucun compte de ce navigateur. Vérifiez les six chiffres, ou demandez un nouveau lien depuis « Mot de passe oublié ».",
        };
      }

      const state = codeState(record.reset, now);
      if (state === "expired") {
        return {
          ok: false,
          message: token
            ? "Ce lien a expiré. Demandez-en un nouveau pour choisir un mot de passe."
            : "Ce code a expiré. Demandez-en un nouveau pour choisir un mot de passe.",
        };
      }
      if (state === "locked") {
        return {
          ok: false,
          message: `Trop d’essais (${MAX_CODE_ATTEMPTS}). Demandez un nouveau ${
            token ? "lien" : "code"
          } pour choisir un mot de passe.`,
        };
      }

      const profileContext = { prenom: record.prenom, nom: record.nom, email: record.email };
      const validation = validateNewPassword(password, confirmation, profileContext);
      if (!validation.ok) {
        return { ok: false, message: validation.form ?? "Le mot de passe reste à corriger.", fields: validation.fields };
      }

      const fingerprint = await hashPassword(password);
      const next: AccountRecord = {
        ...record,
        password: fingerprint,
        reset: null,
        verification: record.emailVerified ? null : record.verification,
        updatedAt: new Date().toISOString(),
      };
      writeAccounts(replaceAccount(stored, next));
      reconcile();
      setPendingCode(null);
      return { ok: true, data: { email: record.email } };
    },
    [reconcile],
  );

  const clearPendingCode = useCallback(() => setPendingCode(null), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      account,
      roles: account?.roles ?? [],
      accountsCount: accounts.length,
      pendingCode,
      signUp,
      addRole,
      signIn,
      signOut,
      verifyEmail,
      resendVerification,
      changeEmail,
      requestPasswordReset,
      resetPassword,
      clearPendingCode,
    }),
    [
      ready,
      account,
      accounts.length,
      pendingCode,
      signUp,
      addRole,
      signIn,
      signOut,
      verifyEmail,
      resendVerification,
      changeEmail,
      requestPasswordReset,
      resetPassword,
      clearPendingCode,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Hors fournisseur (carte isolée, test), l’état reste inerte plutôt que cassé. */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context) return context;
  return {
    ready: false,
    account: null,
    roles: [],
    accountsCount: 0,
    pendingCode: null,
    signUp: async () => ({ ok: false, message: "Le contexte de compte n’est pas disponible sur cette page." }),
    addRole: async () => ({ ok: false, message: "Le contexte de compte n’est pas disponible sur cette page." }),
    signIn: async () => ({ ok: false, message: "Le contexte de compte n’est pas disponible sur cette page." }),
    signOut: () => {},
    verifyEmail: async () => ({ ok: false, message: "Le contexte de compte n’est pas disponible sur cette page." }),
    resendVerification: async () => ({
      ok: false,
      message: "Le contexte de compte n’est pas disponible sur cette page.",
    }),
    changeEmail: async () => ({ ok: false, message: "Le contexte de compte n’est pas disponible sur cette page." }),
    requestPasswordReset: async () => ({
      ok: false,
      message: "Le contexte de compte n’est pas disponible sur cette page.",
    }),
    resetPassword: async () => ({ ok: false, message: "Le contexte de compte n’est pas disponible sur cette page." }),
    clearPendingCode: () => {},
  };
}
