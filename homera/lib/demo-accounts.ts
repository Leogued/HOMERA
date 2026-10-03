import type { AccountRecord } from "@/lib/accounts";

/** Comptes de test publics du prototype — ne jamais réutiliser ces secrets en production. */
export const DEMO_LOGIN_CREDENTIALS = [
  { username: "admin", password: "admin", email: "admin@homera.demo", label: "Administration" },
  { username: "user", password: "user", email: "user@homera.demo", label: "Client" },
  { username: "agent", password: "agent", email: "agent@homera.demo", label: "Agent" },
  { username: "prop", password: "prop", email: "prop@homera.demo", label: "Propriétaire" },
] as const;

const CREATED_AT = "2026-10-03T00:00:00.000Z";
const DEMO_ACCOUNTS: AccountRecord[] = [
  {
    id: "HOM-DEMO-ADMIN",
    role: "client",
    roles: ["client"],
    prenom: "Admin",
    nom: "HOMERA",
    email: "admin@homera.demo",
    emailKey: "admin@homera.demo",
    telephone: "+229 01 97 00 00 01",
    profile: { demoRole: "admin" },
    password: {
      kdf: "webcrypto-pbkdf2",
      salt: "40c91ac705c17dcd2e62193f94ec2fdd",
      hash: "8004d7c3fede1b3565e9ff43e099034d9df33a29e82d5333691c9e8d5de9b956",
      iterations: 150000,
    },
    emailVerified: true,
    verification: null,
    reset: null,
    notify: false,
    consentAt: CREATED_AT,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  },
  {
    id: "HOM-DEMO-USER",
    role: "client",
    roles: ["client"],
    prenom: "Aïcha",
    nom: "Client",
    email: "user@homera.demo",
    emailKey: "user@homera.demo",
    telephone: "+229 01 97 00 00 02",
    profile: { projet: "louer", bienRecherche: "appartement", budget: "location-500" },
    password: {
      kdf: "webcrypto-pbkdf2",
      salt: "82a874108f644ae71501aed87c74a4ea",
      hash: "25cd43d5134613f7f158ba58dde200766181ca803995c6afe25f0f232b67629d",
      iterations: 150000,
    },
    emailVerified: true,
    verification: null,
    reset: null,
    notify: true,
    consentAt: CREATED_AT,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  },
  {
    id: "HOM-DEMO-AGENT",
    role: "agent",
    roles: ["agent"],
    prenom: "Koffi",
    nom: "Ahouansou",
    email: "agent@homera.demo",
    emailKey: "agent@homera.demo",
    telephone: "+229 01 97 00 00 03",
    profile: {
      structure: "Cabinet Ahouansou Immobilier",
      identification: "RB/COT/24 B 1234",
      zoneExercice: "Cotonou",
      experience: "3-10",
    },
    password: {
      kdf: "webcrypto-pbkdf2",
      salt: "c97ca823dc5415d1221ce6fd31289550",
      hash: "2af17e575f1c0098db10ac7962ef6a2c98aab56600c95962cd020ce29a00388d",
      iterations: 150000,
    },
    emailVerified: true,
    verification: null,
    reset: null,
    notify: true,
    consentAt: CREATED_AT,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  },
  {
    id: "HOM-DEMO-PROPRIETAIRE",
    role: "proprietaire",
    roles: ["proprietaire"],
    prenom: "Awa",
    nom: "Dossou",
    email: "prop@homera.demo",
    emailKey: "prop@homera.demo",
    telephone: "+229 01 97 00 00 04",
    profile: {
      portefeuille: "2-5",
      natureBiens: "villa",
      zoneBiens: "Cotonou",
      usage: "location",
      situation: "residence",
    },
    password: {
      kdf: "webcrypto-pbkdf2",
      salt: "7a5ccdcc06218f3501efbe8a5c472181",
      hash: "bba915a8e39ed77a6351742f5b2d3c45327ee8a01fb6819b4635928d3bdf4b06",
      iterations: 150000,
    },
    emailVerified: true,
    verification: null,
    reset: null,
    notify: true,
    consentAt: CREATED_AT,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  },
];

const CREDENTIALS_BY_USERNAME = new Map<string, string>(
  DEMO_LOGIN_CREDENTIALS.map((entry) => [entry.username, entry.email]),
);

/** Résout les identifiants courts de démonstration; les autres saisies restent des e-mails. */
export function demoEmailForUsername(identifier: string): string | null {
  return CREDENTIALS_BY_USERNAME.get(identifier.trim().toLocaleLowerCase("fr-FR")) ?? null;
}

/** Ajoute les comptes manquants sans remplacer les comptes déjà créés dans le navigateur. */
export function ensureDemoAccounts(accounts: AccountRecord[]): AccountRecord[] {
  const knownEmails = new Set(accounts.map((account) => account.emailKey.toLocaleLowerCase("fr-FR")));
  const missing = DEMO_ACCOUNTS.filter((account) => !knownEmails.has(account.emailKey));
  if (missing.length === 0) return accounts;
  return [...accounts, ...missing.map((account) => ({
    ...account,
    roles: [...account.roles],
    profile: { ...account.profile },
    password: { ...account.password },
  }))];
}
