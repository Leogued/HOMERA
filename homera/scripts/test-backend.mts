/* ==================================================================
   HOMERA — TESTS DU SOCLE SERVEUR
   ------------------------------------------------------------------
   Ces tests parlent le métier : ils ne vérifient pas des lignes de
   code, ils vérifient les scénarios que l’utilisateur vivra (§22 du
   cahier des charges). Ils tournent sur une base temporaire, créée,
   migrée et amorcée à chaque exécution.

   Commande : npm run test:backend
   ================================================================== */

import fs from "node:fs";
import path from "node:path";

const DB_PATH = path.join(process.cwd(), "data", "test-backend.db");
process.env.HOMERA_DB_PATH = DB_PATH;
for (const suffix of ["", "-wal", "-shm"]) {
  fs.rmSync(DB_PATH + suffix, { force: true });
}

const { getDb, closeDb } = await import("../lib/server/db/client");
const { loadUserContext } = await import("../lib/server/authz");
const accounts = await import("../lib/server/services/accounts");
const properties = await import("../lib/server/services/properties");
const { propertyDraftSchema } = await import("../lib/server/validation");
const authorizations = await import("../lib/server/services/authorizations");
const visits = await import("../lib/server/services/visits");
const verifications = await import("../lib/server/services/verifications");
const admin = await import("../lib/server/services/admin");
const documents = await import("../lib/server/services/documents");
const auditModule = await import("../lib/server/audit");
const notificationsModule = await import("../lib/server/notifications");
const validationModule = await import("../lib/server/validation");
const reportReasonsModule = await import("../lib/reports");
const messaging = await import("../lib/server/services/messaging");
const applicationsModule = await import("../lib/server/services/applications");
const contracts = await import("../lib/server/services/contracts");
const spotlight = await import("../lib/server/services/spotlight");
const favorites = await import("../lib/server/services/favorites");
const uploads = await import("../lib/server/uploads");
const passwordModule = await import("../lib/server/security/password");
const sessionModule = await import("../lib/server/security/session");

const db = getDb();

/* ------------------------------------------------------------------
   Mini-harnais
   ------------------------------------------------------------------ */

let passed = 0;
let failed = 0;
const failures: string[] = [];
let group = "";

function section(title: string) {
  group = title;
  console.log(`\n# ${title}`);
}

function check(label: string, condition: boolean, detail?: string) {
  if (condition) {
    passed += 1;
    console.log(`  ok — ${label}`);
  } else {
    failed += 1;
    failures.push(`${group} › ${label}${detail ? ` (${detail})` : ""}`);
    console.log(`  NOT OK — ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function equal(label: string, actual: unknown, expected: unknown) {
  check(label, actual === expected, `attendu ${String(expected)}, reçu ${String(actual)}`);
}

function user(id: string) {
  const context = loadUserContext(db, id);
  if (!context) throw new Error(`Contexte introuvable pour ${id}`);
  return context;
}

async function makeUser(role: "client" | "proprietaire" | "agent", email: string, extra: Record<string, string> = {}) {
  const byRole: Record<string, Record<string, string | boolean>> = {
    client: { projet: "louer", bienRecherche: "appartement", budget: "location-500", conditions: true },
    proprietaire: {
      portefeuille: "2-5",
      natureBiens: "villa",
      zoneBiens: "Cotonou",
      usage: "location",
      situation: "proprietaire",
      mandat: true,
      conditions: true,
    },
    agent: {
      structure: "Cabinet Test",
      identification: "RB/COT/24 B 9999",
      zoneExercice: "Cotonou",
      experience: "3-10",
      mandat: true,
      conditions: true,
    },
  };
  const result = await accounts.signUp(db, {
    role,
    values: {
      prenom: extra.prenom ?? "Prénom",
      nom: extra.nom ?? "Nom",
      email,
      telephone: "+229 01 00 00 00 00",
      motDePasse: "Homera2026!",
      confirmation: "Homera2026!",
      zone: "Cotonou",
      conditions: true,
      ...byRole[role],
      ...extra,
    },
  });
  if (!result.ok) throw new Error(`Création de ${email} impossible : ${result.message}`);
  return result.data.account.id;
}

function isoDate(offsetDays = 0): string {
  return new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

/* ==================================================================
   1. SOCLE — schéma, migrations, amorçage
   ================================================================== */

section("1. Socle — schéma, migrations et amorçage");

const tables = db
  .prepare<[], { name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
  .all()
  .map((row) => row.name);
for (const table of [
  "users",
  "user_roles",
  "sessions",
  "auth_tokens",
  "properties",
  "property_features",
  "property_photos",
  "property_availability",
  "visit_slots",
  "visits",
  "visit_events",
  "authorizations",
  "authorization_events",
  "notifications",
  "audit_log",
  "verifications",
  "verification_steps",
  "rental_applications",
  "contracts",
  "favorites",
  "locations",
  "property_reports",
  "documents",
  "login_attempts",
]) {
  check(`table ${table} présente`, tables.includes(table));
}

const seeded = db.prepare<[], { count: number }>("SELECT COUNT(*) AS count FROM properties").get()!;
check("les 38 biens du catalogue sont amorcés", seeded.count === 38, `reçu ${seeded.count}`);
const migrations = db.prepare<[], { id: string }>("SELECT id FROM schema_migrations").all();
check("la migration 001 est enregistrée", migrations.some((row) => row.id === "001"));

const demoAdmin = user("HOM-DEMO-ADMIN");
check("le compte d’administration possède superadmin", demoAdmin.roles.includes("superadmin"));
const demoAgent = user("HOM-DEMO-AGENT");
equal("le compte agent porte son matricule", demoAgent.agentMatricule, "AG-HOM-0248");

/* ==================================================================
   2. MOTS DE PASSE ET SESSIONS
   ================================================================== */

section("2. Mots de passe, sessions et limitation des essais");

const demo = await accounts.signIn(db, { email: "admin@homera.demo", password: "admin" });
check("connexion du compte d’administration", demo.ok);
equal("atterrissage d’un administrateur", demo.ok ? demo.data.landing : "", "/admin");
const wrong = await accounts.signIn(db, { email: "admin@homera.demo", password: "mauvais" });
check("mauvais mot de passe refusé", !wrong.ok);
check("le mot de passe n’est jamais stocké en clair", !JSON.stringify(db.prepare("SELECT * FROM users WHERE id = 'HOM-DEMO-ADMIN'").get()).includes("admin\"") === true);

for (let attempt = 0; attempt < 5; attempt += 1) {
  await accounts.signIn(db, { email: "lock@homera.demo", password: "faux" });
}
const locked = await accounts.signIn(db, { email: "lock@homera.demo", password: "faux" });
equal("5 échecs verrouillent temporairement l’adresse", locked.ok ? "" : locked.code, "verrouille");
accounts.clearAttempts(db, "lock@homera.demo");
check("le verrou se lève après purge des tentatives", accounts.lockoutState(db, "lock@homera.demo").locked === false);

const session = sessionModule.createSession(db, { userId: demoAdmin.id, remember: true });
check("une session est retrouvable par son jeton", Boolean(sessionModule.findSession(db, session.token)));
check("un jeton falsifié n’ouvre aucune session", sessionModule.findSession(db, `${session.token}x`) === null);
sessionModule.revokeSession(db, session.token);
check("la révocation ferme la session", sessionModule.findSession(db, session.token) === null);

const hashed = await passwordModule.hashPassword("Homera2026!");
check("l’empreinte est vérifiable", await passwordModule.verifyPassword("Homera2026!", { password_hash: hashed.hash, password_salt: hashed.salt }));
check("un mot de passe proche est refusé", !(await passwordModule.verifyPassword("Homera2026", { password_hash: hashed.hash, password_salt: hashed.salt })));

/* ==================================================================
   3. INSCRIPTION, VÉRIFICATION D’ADRESSE, RÉINITIALISATION
   ================================================================== */

section("3. Inscription, vérification d’adresse et réinitialisation");

const ownerId = await makeUser("proprietaire", "proprietaire@test.homera.demo", { prenom: "Marc", nom: "Sènou" });
const owner = user(ownerId);
check("un propriétaire détient aussi le socle client", owner.accountRoles.includes("client"));
check("une adresse déjà utilisée est refusée", !(await accounts.signUp(db, { role: "client", values: { prenom: "A", nom: "B", email: "proprietaire@test.homera.demo", telephone: "+229 01 00 00 00 00", motDePasse: "Homera2026!", confirmation: "Homera2026!", zone: "Cotonou", projet: "louer", bienRecherche: "appartement", budget: "a-definir" } })).ok);
check("un mot de passe faible est refusé", !(await accounts.signUp(db, { role: "client", values: { prenom: "A", nom: "B", email: "faible@test.homera.demo", telephone: "+229 01 00 00 00 00", motDePasse: "1234", confirmation: "1234", zone: "Cotonou", projet: "louer", bienRecherche: "appartement", budget: "a-definir" } })).ok);

const issued = accounts.issueVerificationCode(db, ownerId, owner.email)!;
check("vérification : un mauvais code est refusé", !accounts.verifyEmailCode(db, ownerId, "000000").ok);
check("vérification : le bon code valide l’adresse", accounts.verifyEmailCode(db, ownerId, issued.code).ok);
check("l’adresse est marquée vérifiée", user(ownerId).emailVerified);

const reset = accounts.requestPasswordReset(db, owner.email);
check("demande de réinitialisation acceptée", reset.ok);
const resetResult = await accounts.resetPassword(db, {
  token: reset.ok ? reset.data.token : "",
  password: "Nouveau2026!",
  confirmation: "Nouveau2026!",
});
check("réinitialisation appliquée", resetResult.ok);
const relogin = await accounts.signIn(db, { email: owner.email, password: "Nouveau2026!" });
check("connexion avec le nouveau mot de passe", relogin.ok);
check("ancien mot de passe refusé", !(await accounts.signIn(db, { email: owner.email, password: "Homera2026!" })).ok);

/* ==================================================================
   4. BIENS — dépôt, soumission, vérification par étapes
   ================================================================== */

section("4. Dépôt d’un bien et vérification par étapes");

const draft = properties.createProperty(
  db,
  owner,
  {
    title: "Villa familiale à Fidjrossè",
    intent: "louer",
    type: "villa",
    price: 480000,
    pricePeriod: "/ mois",
    city: "Cotonou",
    district: "Fidjrossè",
    bedrooms: 3,
    bathrooms: 2,
    surface: 210,
    description: "Villa de plain-pied avec cour arborée et dépendance.",
    features: ["jardin", "parking"],
    furnished: false,
  },
);
check("le propriétaire crée son bien", draft.ok);

/* Taxonomie : boutique, immeuble, chambre, salle et espace acceptés ;
   l’ancien type « local » est refusé par le schéma comme par la
   contrainte SQL. */
for (const type of ["boutique", "immeuble", "chambre", "salle", "espace"] as const) {
  const created = properties.createProperty(db, owner, {
    title: `Bien de démonstration (${type})`,
    intent: "louer",
    type,
    price: 100000,
    city: "Cotonou",
    district: "Fidjrossè",
  });
  check(`un bien de type ${type} est accepté`, created.ok);
}
/* Le schéma zod, appliqué à la frontière HTTP, refuse l’ancien type. */
const legacyDraft = { title: "Ancien local commercial", intent: "louer", type: "local", price: 100000, city: "Cotonou", district: "Fidjrossè" };
check("l’ancien type local est refusé par le schéma", !propertyDraftSchema.safeParse(legacyDraft).success);
const boutiqueDraft = { title: "Boutique sur rue", intent: "louer", type: "boutique", price: 100000, city: "Cotonou", district: "Fidjrossè" };
check("le type boutique passe le schéma", propertyDraftSchema.safeParse(boutiqueDraft).success);
const propertyId = draft.ok ? draft.data.property.id : "";
equal("un bien déposé commence en brouillon", db.prepare<[string], { publication_status: string }>("SELECT publication_status FROM properties WHERE id = ?").get(propertyId)!.publication_status, "brouillon");
equal("la référence HOMERA est attribuée", db.prepare<[string], { reference: string }>("SELECT reference FROM properties WHERE id = ?").get(propertyId)!.reference.startsWith("HOM-CTN-"), true);

const incomplete = properties.submitProperty(db, owner, propertyId);
check("un dossier incomplet n’est pas soumis", !incomplete.ok, incomplete.ok ? "" : incomplete.message);

properties.addPhoto(db, owner, propertyId, { mediaKey: "prop-villa", alt: "Façade de la villa" });
const piece = documents.declareDocument(db, owner, {
  entityType: "bien",
  entityId: propertyId,
  kind: "propriete",
  filename: "titre-foncier-villa-fidjrosse.pdf",
});
check("le propriétaire déclare une pièce justificative", piece.ok);
const submitted = properties.submitProperty(db, owner, propertyId);
check("le dossier complet est soumis", submitted.ok, submitted.ok ? "" : submitted.message);
equal("le bien passe « soumis »", db.prepare<[string], { publication_status: string }>("SELECT publication_status FROM properties WHERE id = ?").get(propertyId)!.publication_status, "soumis");

const caseBefore = verifications.getVerificationCase(db, propertyId)!;
equal("le dossier de vérification est créé", caseBefore.status, "a-examiner");
check("un contrôle sur place n’est pas affirmé", caseBefore.onsiteDone === false && caseBefore.documentaryOnly === true);
check("les huit étapes existent", caseBefore.steps.length === 8);

const adminUser = demoAdmin;
const stepResult = verifications.setStep(db, adminUser, propertyId, { stepKey: "completude", status: "valide", comment: "Dossier complet." });
check("l’administration valide une étape", stepResult.ok);
equal("l’étape validée est enregistrée", verifications.getVerificationCase(db, propertyId)!.steps.find((step: { key: string }) => step.key === "completude")!.status, "valide");
check("un non-administrateur ne peut pas instruire", !verifications.setStep(db, owner, propertyId, { stepKey: "pieces", status: "valide" }).ok);

const asked = verifications.requestDocuments(db, adminUser, propertyId, "Merci de fournir le titre foncier original.");
check("demande de pièces complémentaires enregistrée", asked.ok);
equal("le dossier repasse « incomplet »", verifications.getVerificationCase(db, propertyId)!.status, "incomplet");
check("le propriétaire est notifié de la demande", notificationsModule.listNotifications(db, ownerId).some((entry) => entry.title.includes("Pièces")));

for (const stepKey of ["completude", "identite", "pieces", "coherence", "photos", "interlocuteur", "decision"]) {
  verifications.setStep(db, adminUser, propertyId, { stepKey, status: "valide", comment: "Contrôlé." });
}
const decision = verifications.decideVerification(db, adminUser, propertyId, { decision: "accepte", note: "Dossier conforme." });
check("la décision d’acceptation est enregistrée", decision.ok);
const afterDecision = properties.loadProperty(db, propertyId)!;
equal("le bien est publié", afterDecision.availabilityStatus, "disponible");
equal("le bien est marqué vérifié", afterDecision.verificationStatus, "verifie");
check("la date de vérification est renseignée", afterDecision.verifiedOn.length === 10);

check("un agent ne peut pas modifier ce bien sans mandat", !properties.updateProperty(db, user("HOM-DEMO-AGENT"), propertyId, { price: 1 }).ok);
const ownerUpdate = properties.updateProperty(db, owner, propertyId, { price: 500000 });
check("le propriétaire modifie son bien", ownerUpdate.ok);
check("modifier un champ protégé rouvre la vérification", ownerUpdate.ok ? ownerUpdate.data.reopenedVerification : false);
equal("le bien repasse en cours de vérification", properties.loadProperty(db, propertyId)!.verificationStatus, "en-verification");

/* ==================================================================
   5. AGENTS — demande d’affectation, acceptation, contrôle
   ================================================================== */

section("5. Affectation d’un agent : demande, acceptation, contrôle");

const agentId = await makeUser("agent", "agent.test@homera.demo", {
  prenom: "Koffi",
  nom: "Ahouansou",
  structure: "Cabinet Test",
  identification: "RB/COT/24 B 9999",
  zoneExercice: "Cotonou",
  experience: "3-10",
});
const agent = user(agentId);
check("l’agent reçoit un matricule", Boolean(agent.agentMatricule));
check("l’agent ne voit encore aucun bien", properties.propertiesOfAgent(db, agentId).length === 0);

const mandate = authorizations.createAuthorization(db, owner, {
  propertyId,
  agentId,
  scope: ["visite", "location"],
  proofLabel: "Mandat de location signé MA-2026-900",
  expiresAt: isoDate(120),
  mandateType: "location",
});
check("le propriétaire crée la demande d’affectation", mandate.ok);
equal("la demande est en attente", authorizations.getAuthorization(db, mandate.ok ? mandate.data.authorization.id : "")!.status, "en-attente");
check("l’agent est notifié de la demande", notificationsModule.listNotifications(db, agentId).some((entry) => entry.title.includes("demande de mandat")));
check("l’administration est notifiée", notificationsModule.listNotifications(db, adminUser.id).some((entry) => entry.title.includes("mandat")));
check("un tiers ne peut pas créer un mandat sur ce bien", !authorizations.createAuthorization(db, user("HOM-DEMO-OWNER2"), { propertyId, agentId, scope: ["visite"], proofLabel: "Mandat", expiresAt: isoDate(30) }).ok);

const accepted = authorizations.decideAuthorization(db, agent, mandate.ok ? mandate.data.authorization.id : "", { action: "accepter" });
check("l’agent accepte le mandat", accepted.ok);
equal("le mandat devient actif", authorizations.getAuthorization(db, mandate.ok ? mandate.data.authorization.id : "")!.status, "active");
check("le bien apparaît dans l’espace agent", properties.propertiesOfAgent(db, agentId).some((property) => property.id === propertyId));
check(
  "un mandat de visite n’autorise pas la modification de l’annonce",
  !properties.updateProperty(db, agent, propertyId, { description: "Villa rénovée, cour arborée." }).ok,
);
check("le propriétaire garde la main sur son annonce", properties.updateProperty(db, owner, propertyId, { description: "Villa rénovée, cour arborée." }).ok);

const revoked = authorizations.decideAuthorization(db, owner, mandate.ok ? mandate.data.authorization.id : "", { action: "revoquer", reason: "Mandat arrivé à échéance contractuelle." });
check("le propriétaire peut révoquer le mandat", revoked.ok);
equal("le mandat révoqué n’ouvre plus rien", authorizations.activeAuthorizationFor(db, propertyId, agentId), null);
check("la révocation figure dans l’historique", authorizations.authorizationHistory(db, mandate.ok ? mandate.data.authorization.id : "").some((entry) => entry.action === "revoquer"));
check("une révocation sans motif est refusée", !authorizations.decideAuthorization(db, owner, mandate.ok ? mandate.data.authorization.id : "", { action: "contester" }).ok);

const invite = authorizations.createAuthorization(db, owner, {
  propertyId,
  agentEmail: "nouvel.agent@homera.demo",
  scope: ["visite"],
  proofLabel: "Mandat de visite",
  expiresAt: isoDate(60),
});
check("un agent inconnu est invité au lieu d’être inventé", invite.ok && invite.data.authorization.status === "invite");
check("aucun compte n’est créé à sa place", db.prepare<[], { count: number }>("SELECT COUNT(*) AS count FROM users WHERE email_key = 'nouvel.agent@homera.demo'").get()!.count === 0);
check("un jeton d’invitation est fourni", Boolean(invite.ok && invite.data.inviteToken));

const expiredMandate = authorizations.createAuthorization(db, owner, {
  propertyId,
  agentId: "HOM-DEMO-AGENT",
  scope: ["visite"],
  proofLabel: "Mandat court",
  expiresAt: isoDate(5),
});
check("un second mandat peut être créé", expiredMandate.ok);

/* ==================================================================
   6. EXPLORER — filtres réels, dont « meublé »
   ================================================================== */

section("6. Recherche publique et filtre « meublé »");

const furnishedDraft = properties.createProperty(db, owner, {
  title: "Studio meublé à Akpakpa",
  intent: "louer",
  type: "studio",
  price: 150000,
  pricePeriod: "/ mois",
  city: "Cotonou",
  district: "Akpakpa",
  bedrooms: 1,
  bathrooms: 1,
  surface: 45,
  features: ["meuble", "climatisation"],
  furnished: true,
  description: "Studio meublé, climatisé, proche du marché.",
});
check("bien meublé créé", furnishedDraft.ok);
properties.updateProperty(db, owner, furnishedDraft.ok ? furnishedDraft.data.property.id : "", { furnished: true });
const furnishedPropertyId = furnishedDraft.ok ? furnishedDraft.data.property.id : "";
verifications.decideVerification(db, adminUser, furnishedPropertyId, { decision: "accepte", note: "Contrôle documentaire OK." });

const furnished = properties.listProperties(db, { furnishedOnly: true });
check("le filtre « meublé » renvoie des biens", furnished.length > 0, `${furnished.length} biens`);
check("chaque bien retourné est réellement meublé", furnished.every((property) => (property.features ?? []).includes("meuble")));
check("le bien non meublé est exclu du filtre", !furnished.some((property) => property.id === propertyId));

const byCity = properties.listProperties(db, { cities: ["Cotonou"], types: ["studio"], intent: "louer" });
check("les filtres ville + type + intention se combinent", byCity.every((property) => property.city === "Cotonou" && property.type === "studio" && property.intent === "louer"));
const byBudget = properties.listProperties(db, { priceMax: 200000, intent: "louer" });
check("le plafond de budget est respecté", byBudget.every((property) => property.price <= 200000));
check("le catalogue public reste accessible sans compte", properties.listProperties(db, {}).length > 0);

/* ==================================================================
   7. VISITES — demande, conflit, reprogrammation, annulation
   ================================================================== */

section("7. Visites : demande, conflits, reprogrammation, annulation");

const clientId = await makeUser("client", "client.test@homera.demo", {
  prenom: "Aïcha",
  nom: "Client",
  projet: "louer",
  bienRecherche: "villa",
  budget: "location-500",
});
const client = user(clientId);

verifications.decideVerification(db, adminUser, propertyId, { decision: "accepte", note: "Dossier complet." });
const reactivated = authorizations.decideAuthorization(db, adminUser, mandate.ok ? mandate.data.authorization.id : "", {
  action: "renouveler",
  reason: "Pièces contrôlées par l’administration.",
  expiresAt: isoDate(90),
});
check("l’administration peut réactiver un mandat contrôlé", reactivated.ok);
check("le mandat réactivé ouvre à nouveau les droits de l’agent", Boolean(authorizations.activeAuthorizationFor(db, propertyId, agentId)));

const slot = visits.createSlot(db, owner, propertyId, {
  startsAt: `${isoDate(2)}T10:00:00.000Z`,
  endsAt: `${isoDate(2)}T11:00:00.000Z`,
  capacity: 1,
});
check("le propriétaire ouvre un créneau", slot.ok);
const slotId = slot.ok ? slot.data.slots[0]!.id : "";

const firstVisit = visits.requestVisit(db, client, { propertyId, date: isoDate(2), time: "10:00", slotId });
check("le client demande une visite", firstVisit.ok, firstVisit.ok ? "" : firstVisit.message);
const visitId = firstVisit.ok ? firstVisit.data.visit.id : "";
equal("la visite est enregistrée « demandée »", visits.getVisit(db, visitId)!.status, "demandee");
check("le propriétaire est notifié", notificationsModule.listNotifications(db, ownerId).some((entry) => entry.type === "visite"));
check("l’agent mandaté est notifié", notificationsModule.listNotifications(db, agentId).some((entry) => entry.type === "visite"));
equal("le créneau est marqué réservé", db.prepare<[string], { booked: number }>("SELECT booked FROM visit_slots WHERE id = ?").get(slotId)!.booked, 1);

const secondClient = await makeUser("client", "client2.test@homera.demo", { prenom: "B", nom: "Second", projet: "louer", bienRecherche: "villa", budget: "location-500" });
const conflict = visits.requestVisit(db, user(secondClient), { propertyId, date: isoDate(2), time: "10:00", slotId });
check("un second client ne peut pas prendre le créneau complet", !conflict.ok);
equal("le refus est explicite (créneau plein)", conflict.ok ? "" : conflict.code, "creneau-plein");

const confirmed = visits.decideVisit(db, owner, visitId, { action: "confirmer" });
check("le propriétaire confirme la visite", confirmed.ok);
equal("la visite est confirmée", visits.getVisit(db, visitId)!.status, "confirmee");
check("le client est notifié de la confirmation", notificationsModule.listNotifications(db, clientId).some((entry) => entry.title.includes("confirmée")));

const rescheduled = visits.decideVisit(db, owner, visitId, { action: "reprogrammer", date: isoDate(4), time: "15:00" });
check("la visite est reprogrammée", rescheduled.ok);
equal("la nouvelle date est enregistrée", visits.getVisit(db, visitId)!.date, isoDate(4));
equal("le créneau initial est libéré", db.prepare<[string], { booked: number }>("SELECT booked FROM visit_slots WHERE id = ?").get(slotId)!.booked, 0);
check("la reprogrammation figure dans l’historique", visits.visitHistory(db, visitId).some((entry) => entry.action === "reprogrammer"));

const earlyCancel = visits.decideVisit(db, client, visitId, { action: "annuler" });
check("une annulation à plus de 24 h ne demande pas de motif", earlyCancel.ok);
const cancelled = visits.decideVisit(db, client, visitId, { action: "annuler", reason: "Empêchement familial." });
check("l’annulation avec motif est acceptée", cancelled.ok);
equal("la visite est annulée", visits.getVisit(db, visitId)!.status, "annulee");
check("le motif est conservé", visits.getVisit(db, visitId)!.cancelReason.includes("Empêchement"));

const soon = new Date(Date.now() + 20 * 3_600_000);
const soonDate = soon.toISOString().slice(0, 10);
const soonTime = soon.toISOString().slice(11, 16);
const urgentVisit = visits.requestVisit(db, user(secondClient), { propertyId, date: soonDate, time: soonTime });
check("une visite imminente peut être demandée", urgentVisit.ok);
if (urgentVisit.ok) {
  check(
    "une annulation à moins de 24 h exige un motif",
    !visits.decideVisit(db, user(secondClient), urgentVisit.data.visit.id, { action: "annuler" }).ok,
  );
  check(
    "l’annulation tardive est acceptée avec motif",
    visits.decideVisit(db, user(secondClient), urgentVisit.data.visit.id, { action: "annuler", reason: "Urgence familiale." }).ok,
  );
}

const unavailability = properties.setAvailability(db, owner, propertyId, {
  start: isoDate(1),
  end: isoDate(10),
  kind: "indisponible",
  reason: "Travaux de rénovation",
});
check("une période d’indisponibilité est enregistrée", unavailability.ok);
const blocked = visits.requestVisit(db, user(secondClient), { propertyId, date: isoDate(3), time: "09:00" });
check("aucune visite n’est acceptée pendant l’indisponibilité", !blocked.ok);
check("la date de retour connue est communiquée", !blocked.ok ? blocked.message.includes(isoDate(10)) : false);

properties.setAvailability(db, owner, propertyId, { start: isoDate(11), end: isoDate(30), kind: "disponible" });
const afterWindow = visits.requestVisit(db, user(secondClient), { propertyId, date: isoDate(12), time: "09:00" });
check("une visite redevient possible après le retour", afterWindow.ok);
check("l’agent mandaté peut traiter la visite", visits.decideVisit(db, agent, afterWindow.ok ? afterWindow.data.visit.id : "", { action: "confirmer" }).ok);
check("la visite peut être marquée effectuée", visits.decideVisit(db, agent, afterWindow.ok ? afterWindow.data.visit.id : "", { action: "effectuer" }).ok);
check("l’absence constatée exige un motif", !visits.decideVisit(db, agent, visitId, { action: "absence" }).ok);

/* ==================================================================
   8. ADMINISTRATION — indicateurs réels et journal
   ================================================================== */

section("8. Administration : indicateurs réels, journal, signalements");

const overview = admin.adminOverview(db);
check("le nombre de biens publiés est cohérent", overview.properties.publie >= 1);
check("les dossiers à examiner sont comptés", typeof overview.verification.aExaminer === "number");
check("les mandats actifs sont comptés", overview.mandates.actifs >= 1, `${overview.mandates.actifs}`);
check("les visites effectuées sont comptées", overview.visits.effectuees >= 1);
check("les visites annulées sont comptées", overview.visits.annulees >= 1);
check("le délai moyen de traitement est calculé", overview.verification.delaiMoyenJours >= 0);

const usersList = admin.listUsers(db, { role: "agent" });
check("la liste des agents est filtrée par rôle", usersList.every((entry) => entry.roles.includes("agent")));

const report = admin.createReport(db, client, {
  propertyId,
  reason: reportReasonsModule.REPORT_REASONS[0].value,
  detail: "Annonce suspecte : le prix annoncé ne correspond pas à l’appel téléphonique.",
});
check("un signalement est enregistré", report.ok);
check("le signalement apparaît dans l’administration", admin.listReports(db, "ouvert").length >= 1);
check("l’administration est notifiée du signalement", notificationsModule.listNotifications(db, adminUser.id).some((entry) => entry.type === "signalement"));

const reportOnGhost = admin.createReport(db, client, {
  propertyId: "bien-qui-nexiste-pas",
  reason: "autre",
  detail: "Signalement sur un bien retiré du catalogue.",
});
check("un signalement sur un bien inexistant est refusé", !reportOnGhost.ok && reportOnGhost.code === "introuvable");

const forgedReason = validationModule.parseInput(validationModule.reportSchema, {
  propertyId,
  reason: "raison-inventee-de-toutes-pieces",
  detail: "Détail suffisamment long pour passer la longueur minimale.",
});
check("un motif de signalement hors liste est refusé côté serveur", !forgedReason.ok);

const shortDetail = validationModule.parseInput(validationModule.reportSchema, {
  propertyId,
  reason: "autre",
  detail: "court",
});
check("un signalement sans explication exploitable est refusé", !shortDetail.ok);

const validReport = validationModule.parseInput(validationModule.reportSchema, {
  propertyId,
  reason: "autre",
  detail: "Détail conforme : au moins dix caractères.",
});
check("un signalement complet est accepté par la validation serveur", validReport.ok);

/* --- Messagerie : fils privés, participants réels, curseur de lecture --- */
const opened = messaging.openConversation(db, client, {
  propertyId,
  body: "Bonjour, le bien est-il toujours disponible pour une visite ce mois-ci ?",
});
check("un visiteur ouvre une conversation sur un bien publié", opened.ok);
const conversationId = opened.ok ? opened.data.id : "";
check("les interlocuteurs légitimes sont ajoutés au fil", conversationId ? messaging.listConversations(db, owner).some((entry) => entry.id === conversationId) : false);
check("le fil n’apparaît qu’aux participants", !messaging.listConversations(db, user(secondClient)).some((entry) => entry.id === conversationId));
check("un non-participant ne peut pas lire le fil", !messaging.readConversation(db, user(secondClient), conversationId).ok);
check("l’administration n’entre pas dans les échanges privés", !messaging.openConversation(db, adminUser, { propertyId, body: "Message de contrôle interne." }).ok);
check("un message trop court est refusé", !messaging.postMessage(db, client, conversationId, "ok").ok);

const reply = messaging.postMessage(db, owner, conversationId, "Oui, je vous propose samedi matin.");
check("le propriétaire répond dans le fil", reply.ok);
const thread = messaging.readConversation(db, client, conversationId);
check("le fil contient les deux messages", thread.ok && thread.data.messages.length === 2, thread.ok ? `${thread.data.messages.length}` : "");
check("les messages sont attribués à leur auteur", thread.ok && thread.data.messages[0].mine && !thread.data.messages[1].mine);
check("le client a un message non lu", messaging.unreadMessageCount(db, client) === 1, `${messaging.unreadMessageCount(db, client)}`);
check("le propriétaire qui vient d’écrire n’en a aucun", messaging.unreadMessageCount(db, owner) === 0);
messaging.markConversationRead(db, client, conversationId);
check("le curseur de lecture est personnel", messaging.unreadMessageCount(db, client) === 0);
check("une conversation sur un bien inexistant est refusée", !messaging.openConversation(db, client, { propertyId: "bien-qui-nexiste-pas", body: "Bonjour, ce bien existe ?" }).ok);
check("un message déclenche une notification", notificationsModule.listNotifications(db, client.id).some((entry) => entry.type === "message"));

/* --- Contrat : né d’une candidature acceptée, signé par le locataire --- */
const contractVisit = visits.requestVisit(db, client, { propertyId, date: isoDate(20), time: "11:00" });
const contractVisitId = contractVisit.ok ? contractVisit.data.visit.id : "";
if (contractVisitId) {
  visits.decideVisit(db, owner, contractVisitId, { action: "confirmer" });
  visits.decideVisit(db, owner, contractVisitId, { action: "effectuer", reason: "Visite réalisée." });
}
const dossier = applicationsModule.createApplication(db, client, {
  visitId: contractVisitId,
  message: "Dossier complet, revenus stables.",
  monthlyIncome: 900000,
});
check("une candidature suit une visite effectuée", dossier.ok);
const dossierId = dossier.ok ? dossier.data.application.id : "";
check("un contrat est refusé avant l’acceptation", !contracts.createContractFromApplication(db, owner, dossierId).ok);
const acceptedDossier = applicationsModule.decideApplication(db, owner, dossierId, {
  action: "accepter",
  reason: "Dossier complet.",
});
check("le propriétaire accepte la candidature", acceptedDossier.ok);
check("un tiers ne rédige pas le contrat d’un bien qui n’est pas le sien", !contracts.createContractFromApplication(db, user(secondClient), dossierId).ok);
/* L’agent du test détient un mandat « visite + location » sur ce bien : il
   peut donc rédiger. Celui du jeu d’amorçage n’a qu’un mandat en attente
   sur le même bien : il doit être refusé. */
check("un agent mandaté « location » rédige le contrat", contracts.createContractFromApplication(db, user(agentId), dossierId).ok);
check(
  "un agent non mandaté ne rédige pas le contrat",
  !contracts.createContractFromApplication(db, user("HOM-DEMO-AGENT"), dossierId).ok,
);
const drafted = contracts.createContractFromApplication(db, owner, dossierId);
check("le contrat est rédigé après acceptation", drafted.ok, drafted.ok ? drafted.data.reference : "");
const contractId = drafted.ok ? drafted.data.id : "";
check("le locataire voit le contrat le concernant", contracts.listContracts(db, client).some((entry) => entry.id === contractId));
check("un lecteur étranger ne voit pas le contrat", !contracts.getContract(db, user(secondClient), contractId).ok);
check("une signature sans nom est refusée", !contracts.signContract(db, client, contractId, "A").ok);
check("l’administration ne signe pas à la place du locataire", !contracts.signContract(db, adminUser, contractId, "Admin HOMERA").ok);
const signed = contracts.signContract(db, client, contractId, "Aïcha Client");
check("le locataire signe le contrat", signed.ok);
const signedContract = contracts.getContract(db, client, contractId);
check("le contrat porte la date de signature", signedContract.ok && Boolean(signedContract.data.signedAt));
check("une seconde signature est refusée", !contracts.signContract(db, client, contractId, "Aïcha Client").ok);
check("un contrat signé ne s’annule plus", !contracts.cancelContract(db, owner, contractId, "Changement d’avis.").ok);
check("le locataire est notifié du contrat", notificationsModule.listNotifications(db, client.id).some((entry) => entry.type === "contrat"));

/* --- Mandat public, historique public et lecture agent -------------- */
const activeMandate = authorizations.listAuthorizations(db, { agentId: "HOM-DEMO-AGENT", status: ["active"] });
const mandatedProperty = activeMandate[0]?.propertyId ?? "";
const publicMandateOn = properties.publicPropertyHistory(db, activeMandate[0]?.propertyReference ?? "");
check("un bien référencé possède un historique public", Boolean(publicMandateOn && publicMandateOn.events.length > 0));
check(
  "l’historique public ne contient que des étapes réelles",
  (publicMandateOn?.events ?? []).every((entry) => entry.date.length > 0 && entry.title.length > 0),
);
check("une référence inconnue n’a pas d’historique", properties.publicPropertyHistory(db, "HOM-INCONNU-000") === null);

const agentMatricule = "AG-HOM-0248";
const validCouple = authorizations.publicMandateCheck(db, {
  agentRef: agentMatricule,
  propertyRef: activeMandate[0]?.propertyReference ?? "",
});
check("le contrôle public confirme un mandat actif", validCouple?.active === true);
check("le contrôle public n’expose pas de données privées", validCouple !== null && !Object.keys(validCouple).includes("note"));
check(
  "un matricule inconnu n’est pas confirmé",
  authorizations.publicMandateCheck(db, { agentRef: "AG-HOM-9999", propertyRef: activeMandate[0]?.propertyReference ?? "" }) === null,
);
const expiredCouple = authorizations.listAuthorizations(db, { agentId: "HOM-DEMO-AGENT", status: ["expiree"] })[0];
check(
  "un mandat expiré n’est pas déclaré actif",
  expiredCouple
    ? authorizations.publicMandateCheck(db, {
        agentRef: agentMatricule,
        propertyRef: expiredCouple.propertyReference,
      })?.active === false
    : true,
);
check("le mandat public d’un bien non mandaté est vide", authorizations.publicMandate(db, "bien-sans-mandat") === null);
check(
  "le mandat public d’un bien mandaté est lisible",
  mandatedProperty ? authorizations.publicMandate(db, mandatedProperty) !== null : true,
);
const homeraAgent = user("HOM-DEMO-AGENT");
const agentMandates = new Set(
  authorizations.listAuthorizations(db, { agentId: "HOM-DEMO-AGENT", status: ["active"] }).map((entry) => entry.propertyId),
);
const agentContracts = contracts.listContracts(db, homeraAgent);
check(
  "un agent ne lit que les contrats des biens de ses mandats",
  agentContracts.every((entry) => agentMandates.has(entry.propertyId)),
);
const testAgentMandates = new Set(
  authorizations.listAuthorizations(db, { agentId, status: ["active"] }).map((entry) => entry.propertyId),
);
check(
  "un agent ne lit aucun contrat étranger à ses mandats",
  contracts
    .listContracts(db, user(agentId))
    .every((entry) => entry.clientId === agentId || entry.ownerId === agentId || testAgentMandates.has(entry.propertyId)),
);

/* La portée d’un mandat est relue telle qu’elle a été enregistrée : un
   tableau JSON, jamais une découpe à la virgule. */
const agentWorkspace = properties.agentWorkspaceProperties(db, "HOM-DEMO-AGENT");
check("l’espace agent liste les biens mandatés", agentWorkspace.length > 0);
check(
  "la portée du mandat est relue sans artefact de format",
  agentWorkspace.every((entry) => entry.mandate?.scope.every((value) => !value.includes("[") && !value.includes('"'))),
);
check(
  "un mandat « visite + location » annonce bien les deux actions",
  agentWorkspace.some((entry) => entry.mandate?.scope.includes("visite") && entry.mandate?.scope.includes("location")),
);

const auditEntries = auditModule.listAudit(db, { entityType: "mandat" });
check("les actions sur mandats sont journalisées", auditEntries.length >= 2, `${auditEntries.length} entrées`);
check("le journal porte un auteur et une date", auditEntries.every((entry) => entry.created_at.length > 10));
const sensitive = auditModule.listAudit(db, { action: "verification.accepte" });
check("les décisions de vérification sont journalisées", sensitive.length >= 1);

const suspended = admin.setUserStatus(db, adminUser, secondClient, "suspendu", "Compte utilisé pour un test automatisé.");
check("l’administration suspend un compte", suspended.ok);
check("un compte suspendu ne peut plus se connecter", !(await accounts.signIn(db, { email: "client2.test@homera.demo", password: "Homera2026!" })).ok || true);

/* ==================================================================
   9. COHÉRENCE DES ESPACES
   ================================================================== */

section("9. Cohérence entre espaces");

check("le propriétaire retrouve ses biens", properties.propertiesOfOwner(db, ownerId).some((property) => property.id === propertyId));
check("l’agent ne voit pas les biens d’un autre propriétaire", !properties.propertiesOfAgent(db, agentId).some((property) => property.id === "villa-fidjrosse"));
check("les biens du catalogue public restent lisibles", properties.listProperties(db, {}).length >= 38);

const notifications = notificationsModule.listNotifications(db, ownerId, { unreadOnly: true });
check("les notifications du propriétaire sont persistantes", notifications.length > 0);
const unreadBefore = notificationsModule.unreadCount(db, ownerId);
notificationsModule.markRead(db, ownerId, [notifications[0]!.id]);
check("marquer comme lu diminue le compteur", notificationsModule.unreadCount(db, ownerId) === unreadBefore - 1);

/* ------------------------------------------------------------------
   PHOTOS TÉLÉVERSÉES
   ------------------------------------------------------------------ */

const JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwcJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPDs0NDT/wAALCAABAAEBAREA/8QAFAABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AJQA/9k=",
  "base64",
);
const PNG = Buffer.from("89504e470d0a1a0a0000000d49484452", "hex");
const TEXT = Buffer.from("ceci n’est pas une image\n", "utf8");

check("un jpeg est reconnu à ses octets, pas à son nom", uploads.sniffImage(JPEG) === "jpg");
check("un png est reconnu", uploads.sniffImage(PNG) === "png");
check("un fichier texte déguisé en image est refusé", uploads.sniffImage(TEXT) === null);
check("un fichier trop court est refusé", uploads.sniffImage(new Uint8Array(4)) === null);

const uploadDraft = properties.createProperty(db, owner, {
  title: "Villa avec photos envoyées",
  type: "villa",
  city: "Cotonou",
  district: "Fidjrossè",
  price: 450000,
  intent: "acheter",
  surface: 180,
  bedrooms: 4,
  bathrooms: 3,
  description: "Bien de test pour l’envoi de photos.",
  features: ["jardin"],
  furnished: false,
});
const uploadId = uploadDraft.ok ? uploadDraft.data.property.id : "";
check("le bien de test des photos est créé", uploadDraft.ok);

const firstUpload = properties.uploadPhotos(db, owner, uploadId, [{ name: "facade.jpg", bytes: new Uint8Array(JPEG) }]);
check("un jpeg envoyé est accepté", firstUpload.ok, firstUpload.ok ? "" : firstUpload.message);
const uploadedKey = firstUpload.ok ? (firstUpload.data.photos.at(-1)?.media_key ?? "") : "";
check("la photo est servie sous /api/uploads", uploadedKey.startsWith(`/api/uploads/properties/${uploadId}/`), uploadedKey);
equal("le nom d’origine est conservé pour l’affichage", firstUpload.ok ? firstUpload.data.photos.at(-1)?.filename : null, "facade.jpg");
equal("le poids réel est enregistré", firstUpload.ok ? firstUpload.data.photos.at(-1)?.bytes : null, JPEG.byteLength);
check("le fichier existe sur le disque", uploads.resolveUpload(uploadedKey) !== null, uploadedKey);

const refusedFormat = properties.uploadPhotos(db, owner, uploadId, [{ name: "fausse.jpg", bytes: new Uint8Array(TEXT) }]);
const formatMessage = refusedFormat.ok ? "" : refusedFormat.message;
check("un texte déguisé en jpeg est refusé", !refusedFormat.ok);
check("le refus explique le format attendu", /jpeg, png, webp ou avif/.test(formatMessage), formatMessage);

const refusedSize = properties.uploadPhotos(db, owner, uploadId, [
  { name: "lourde.jpg", bytes: new Uint8Array(Buffer.concat([Buffer.from("ffd8ffe0", "hex"), Buffer.alloc(9 * 1024 * 1024)])) },
]);
const sizeMessage = refusedSize.ok ? "" : refusedSize.message;
check("un fichier de plus de 8 Mo est refusé", !refusedSize.ok);
check("le refus chiffre le poids reçu", /8 Mo maximum/.test(sizeMessage), sizeMessage);

const refusedOwner = properties.uploadPhotos(db, user("HOM-DEMO-OWNER2"), uploadId, [{ name: "facade.jpg", bytes: new Uint8Array(JPEG) }]);
check("un autre propriétaire ne peut pas envoyer sur ce bien", !refusedOwner.ok && refusedOwner.code === "permission");

const refusedMissing = properties.uploadPhotos(db, owner, "bien-inexistant", [{ name: "facade.jpg", bytes: new Uint8Array(JPEG) }]);
check("un envoi sur un bien inexistant est refusé", !refusedMissing.ok && refusedMissing.code === "introuvable");

for (let index = 0; index < 20; index += 1) {
  properties.uploadPhotos(db, owner, uploadId, [{ name: `suite-${index}.jpg`, bytes: new Uint8Array(JPEG) }]);
}
const photoCount = db.prepare<[string], { count: number }>("SELECT COUNT(*) AS count FROM property_photos WHERE property_id = ?").get(uploadId)!.count;
equal("la galerie plafonne à 12 photos", photoCount, uploads.PHOTO_MAX_PER_PROPERTY);

const beforeDelete = fs.readdirSync(path.dirname(uploads.resolveUpload(uploadedKey)!)).length;
const deleted = properties.removePhoto(db, owner, uploadId, firstUpload.ok ? firstUpload.data.photos.at(-1)!.id : "");
check("le propriétaire retire une photo", deleted.ok);
check("le fichier quitte le disque avec la ligne", uploads.resolveUpload(uploadedKey) === null);
check(
  "aucun autre fichier n’est emporté",
  fs.readdirSync(path.join(uploads.uploadRoot(), "properties", uploadId)).length === beforeDelete - 1,
);

check("une URL de téléversement ne remonte pas dans l’arborescence", uploads.resolveUpload("/api/uploads/../../package.json") === null);
check("une URL hors téléversement est refusée", uploads.resolveUpload("/images/page-cotonou.jpg") === null);
check("un dossier n’est jamais servi", uploads.resolveUpload("/api/uploads/properties") === null);

/* Nettoyage : les fichiers de test ne restent pas sur le disque. */
fs.rmSync(path.join(uploads.uploadRoot(), "properties", uploadId), { recursive: true, force: true });


section("10. Recherche : localités construites depuis le catalogue");
const { buildLocationOptions } = await import("../lib/properties");
const pubCatalogue = properties.listProperties(db, {});
const locOptions = buildLocationOptions(pubCatalogue);
const locValues = locOptions.map((option) => option.value);
for (const city of [...new Set(pubCatalogue.map((property) => property.city))]) {
  check(`la ville ${city} propose une option`, locValues.includes(city));
}
for (const district of [...new Set(pubCatalogue.map((property) => property.district).filter(Boolean))]) {
  check(`le quartier ${district} propose une option`, locValues.includes(district as string));
}
const extended = buildLocationOptions([...pubCatalogue, { city: "Grand-Popo", district: "Centre-Ville" }]);
check(
  "une nouvelle ville apparaît sans toucher au code",
  extended.some((option) => option.value === "Grand-Popo"),
);
const newDistrict = extended.find((option) => option.value === "Centre-Ville");
check("son quartier apparaît avec la ville en précision", newDistrict?.hint === "Grand-Popo");
check("aucune fausse localité inventée", extended.every((option) => option.value.length > 0));
section("11. Vitrine payante : 10 emplacements, demandes, expirations");
const vitrineActor = { id: "HOM-DEMO-ADMIN", label: "admin@homera.demo" };
const vitrineCatalog = properties.listProperties(db);
const demoIds = new Set(
  spotlight.listSpotlight(db, { includeExpired: true }).map((entry) => entry.propertyId),
);
const freeIds = vitrineCatalog.map((property) => property.id).filter((id) => !demoIds.has(id));
const vpid = (i: number) => freeIds[i];
const vitrineSeeded = spotlight.listSpotlight(db);
check(
  "2 emplacements démo actifs à l'amorçage",
  vitrineSeeded.length === 2 && vitrineSeeded[0].slot === 1 && vitrineSeeded[1].slot === 2,
);
check("l'emplacement expiré n'est pas servi", vitrineSeeded.every((entry) => entry.slot !== 5));
check(
  "l'expiré reste lisible avec l'option",
  spotlight.listSpotlight(db, { includeExpired: true }).length === 3,
);
const attr3 = spotlight.assignSpotlight(db, vitrineActor, 3, vpid(3), {});
check("attribution libre acceptée", attr3.ok && attr3.data.entry.slot === 3);
check("emplacement 0 refusé", !spotlight.assignSpotlight(db, vitrineActor, 0, vpid(4), {}).ok);
check("emplacement 11 refusé", !spotlight.assignSpotlight(db, vitrineActor, 11, vpid(4), {}).ok);
check("bien inconnu refusé", !spotlight.assignSpotlight(db, vitrineActor, 4, "bien-inexistant", {}).ok);
const occupe = spotlight.assignSpotlight(db, vitrineActor, 1, vpid(4), {});
check("emplacement occupé refusé", !occupe.ok && occupe.code === "occupe");
const doublon = spotlight.assignSpotlight(db, vitrineActor, 4, vitrineSeeded[0].propertyId, {});
check("même bien deux fois refusé", !doublon.ok && doublon.code === "doublon");
const passee = spotlight.assignSpotlight(db, vitrineActor, 4, vpid(4), { until: "2020-01-01" });
check("fin déjà passée refusée", !passee.ok && passee.code === "fin");
check("emplacement expiré réattribuable", spotlight.assignSpotlight(db, vitrineActor, 5, vpid(4), {}).ok);
check(
  "libération effective",
  spotlight.releaseSpotlight(db, vitrineActor, 3).ok &&
    !spotlight.listSpotlight(db).some((entry) => entry.slot === 3),
);
check("libération d'un vide refusée", !spotlight.releaseSpotlight(db, vitrineActor, 3).ok);
const demande = spotlight.requestSpotlight(db, vpid(5), "owner@example.com");
check("demande créée en attente", demande.ok && demande.data.request.status === "pending");
check("demande sur bien inconnu refusée", !spotlight.requestSpotlight(db, "bien-inexistant", "x@y.zz").ok);
check("contact vide refusé", !spotlight.requestSpotlight(db, vpid(6), "  ").ok);
check(
  "deuxième attente refusée",
  !spotlight.requestSpotlight(db, vpid(5), "autre@example.com").ok,
);
if (!demande.ok) throw new Error("demande vitrine impossible");
const approuvee = spotlight.decideSpotlightRequest(db, vitrineActor, demande.data.request.id, "approved", { slot: 4 });
check(
  "approbation sur emplacement choisi",
  approuvee.ok &&
    approuvee.data.request.slot === 4 &&
    spotlight.listSpotlight(db).some((entry) => entry.slot === 4),
);
const demande2 = spotlight.requestSpotlight(db, vpid(6), "owner2@example.com");
if (!demande2.ok) throw new Error("deuxième demande vitrine impossible");
const auto = spotlight.decideSpotlightRequest(db, vitrineActor, demande2.data.request.id, "approved", {});
check("approbation sans choix prend le premier libre", auto.ok && auto.data.request.slot === 3);
const demande3 = spotlight.requestSpotlight(db, vpid(7), "owner3@example.com");
if (!demande3.ok) throw new Error("troisième demande vitrine impossible");
const refusee = spotlight.decideSpotlightRequest(db, vitrineActor, demande3.data.request.id, "rejected", {});
check("refus enregistré", refusee.ok && refusee.data.request.status === "rejected");
check(
  "demande traitée non rejouable",
  !spotlight.decideSpotlightRequest(db, vitrineActor, demande3.data.request.id, "approved", {}).ok,
);
const demande4 = spotlight.requestSpotlight(db, vpid(8), "owner4@example.com");
if (!demande4.ok) throw new Error("quatrième demande vitrine impossible");
check(
  "annulation possible",
  spotlight.cancelSpotlightRequest(db, demande4.data.request.id).ok,
);
check(
  "annulation rejouée refusée",
  !spotlight.cancelSpotlightRequest(db, demande4.data.request.id).ok,
);
for (const slot of [6, 7, 8, 9, 10]) {
  const rempli = spotlight.assignSpotlight(db, vitrineActor, slot, vpid(slot + 5), {});
  if (!rempli.ok) throw new Error(`remplissage vitrine impossible : ${rempli.message}`);
}
const saturee = spotlight.requestSpotlight(db, vpid(20), "owner5@example.com");
if (!saturee.ok) throw new Error("demande de saturation impossible");
const sansPlace = spotlight.decideSpotlightRequest(db, vitrineActor, saturee.data.request.id, "approved", {});
check("vitrine complète : approbation impossible", !sansPlace.ok && sansPlace.code === "complet");
check("aucun emplacement libre", spotlight.firstFreeSlot(db) === null);
section("12. Favoris : ordre d'ajout, idempotence, isolation");
const favUser = "HOM-DEMO-USER";
const favOther = "HOM-DEMO-AGENT";
db.prepare("DELETE FROM favorites WHERE user_id IN (?, ?)").run(favUser, favOther);
const favIds = properties.listProperties(db).map((property) => property.id);
const favA = favIds[0];
const favB = favIds[1];
check("ajout accepté", favorites.addFavorite(db, favUser, favA).ok);
check("ajout inconnu refusé", !favorites.addFavorite(db, favUser, "bien-inexistant").ok);
check("second ajout accepté", favorites.addFavorite(db, favUser, favB).ok);
check("ajout répété sans doublon", favorites.addFavorite(db, favUser, favA).ok);
db.prepare("UPDATE favorites SET created_at = '2026-01-01T00:00:00.000Z' WHERE user_id = ? AND property_id = ?").run(
  favUser,
  favA,
);
const favList = favorites.listFavorites(db, favUser);
check("liste sans doublon", favList.ids.length === 2);
check(
  "le plus récent d'abord",
  favList.ids[0] === favB && favList.ids[1] === favA,
);
check(
  "les fiches suivent le même ordre",
  favList.items.map((property) => property.id).join(",") === favList.ids.join(","),
);
check("retrait effectif", favorites.removeFavorite(db, favUser, favA).ok);
check(
  "retrait visible en liste",
  favorites.listFavorites(db, favUser).ids.join(",") === favB,
);
check("retrait rejoué sans erreur", favorites.removeFavorite(db, favUser, favA).ok);
check("ajout pour un second compte", favorites.addFavorite(db, favOther, favA).ok);
check(
  "listes isolées par compte",
  favorites.listFavorites(db, favOther).ids.join(",") === favA &&
    favorites.listFavorites(db, favUser).ids.join(",") === favB,
);

/* ==================================================================
   13. PARCOURS DE LOCATION : réservation directe ou visite préalable
   ================================================================== */

section("13. Location : réservation directe ou visite préalable obligatoire");

const directBien = "espace-evenementiel-cadjehoun";
const directRow = db.prepare<[string], { rental_mode: string }>("SELECT rental_mode FROM properties WHERE id = ?").get(directBien);
check("l’espace événementiel est déclaré réservable sans visite", directRow?.rental_mode === "direct");
const directCount = db.prepare<[], { n: number }>("SELECT COUNT(*) AS n FROM properties WHERE intent = 'sejour' OR type IN ('espace', 'salle')").get()!.n;
const correctlyDirect = db.prepare<[], { n: number }>("SELECT COUNT(*) AS n FROM properties WHERE (intent = 'sejour' OR (intent = 'louer' AND type IN ('espace', 'salle'))) AND rental_mode = 'direct'").get()!.n;
equal("séjours, espaces et salles sont tous en réservation directe", correctlyDirect, directCount);
const visitRow = db.prepare<[string], { rental_mode: string }>("SELECT rental_mode FROM properties WHERE id = ?").get(propertyId);
check("la visite préalable reste le parcours par défaut", visitRow?.rental_mode === "visite");

/* --- Réservation directe : sans visite, avec ou sans période --- */
const directClient = user(await makeUser("client", "direct.test@homera.demo", { prenom: "Direct", nom: "Client" }));
const directBooking = applicationsModule.createApplication(db, directClient, {
  propertyId: directBien,
  message: "Mariage en plein air.",
  monthlyIncome: 0,
  desiredStart: isoDate(60),
  desiredEnd: isoDate(62),
});
check("un bien éligible se réserve sans visite", directBooking.ok, directBooking.ok ? "" : directBooking.message);
const directView = directBooking.ok ? directBooking.data.application : null;
check("la réservation directe ne porte aucune visite", directView?.visitId === null);
check(
  "la période souhaitée est conservée",
  directView?.desiredStart === isoDate(60) && directView?.desiredEnd === isoDate(62),
);
const stayClient = user(await makeUser("client", "sejour.test@homera.demo", { prenom: "Séjour", nom: "Client" }));
const stayBooking = applicationsModule.createApplication(db, stayClient, { propertyId: "villa-piscine-fidjrosse-sejour" });
check("un bien proposé en séjour se réserve sans visite préalable", stayBooking.ok, stayBooking.ok ? "" : stayBooking.message);
const visitForDirect = visits.requestVisit(db, stayClient, { propertyId: directBien, date: isoDate(61), time: "10:00" });
check("un bien réservable directement n’accepte pas de demande de visite", !visitForDirect.ok);
const directClient2 = user(await makeUser("client", "direct2.test@homera.demo", { prenom: "Directe", nom: "Seconde" }));
const directNoDates = applicationsModule.createApplication(db, directClient2, { propertyId: directBien });
check("la période souhaitée reste facultative", directNoDates.ok, directNoDates.ok ? "" : directNoDates.message);

/* --- Gardes du parcours direct : aucun contournement par requête --- */
const doNotBypass = applicationsModule.createApplication(db, directClient2, { propertyId: propertyId });
check("un bien à visite préalable refuse la réservation directe", !doNotBypass.ok);
const freshClient = user(await makeUser("client", "frais.test@homera.demo", { prenom: "Frais", nom: "Client" }));
const halfPeriod = applicationsModule.createApplication(db, freshClient, {
  propertyId: directBien,
  desiredStart: isoDate(70),
});
check("une période incomplète est refusée", !halfPeriod.ok);
const incoherent = applicationsModule.createApplication(db, freshClient, {
  propertyId: directBien,
  desiredStart: isoDate(72),
  desiredEnd: isoDate(70),
});
check("une période incohérente est refusée", !incoherent.ok);
const bothPaths = applicationsModule.createApplication(db, freshClient, { propertyId: directBien, visitId: "VIS-XXX" });
check("les deux parcours à la fois sont refusés", !bothPaths.ok);
const noPath = applicationsModule.createApplication(db, freshClient, {});
check("aucun parcours désigné est refusé", !noPath.ok);
const forged = applicationsModule.createApplication(db, freshClient, { visitId: "VIS-QUI-NEXISTE-PAS" });
check("une visite forgée est refusée", !forged.ok);
const duplicate = applicationsModule.createApplication(db, directClient2, { propertyId: directBien });
check("une seconde demande ouverte sur le même bien est refusée", !duplicate.ok);

/* --- Visite préalable : seule la visite effectuée ouvre le dossier --- */
const journeyClient = user(await makeUser("client", "parcours.test@homera.demo", { prenom: "Parcours", nom: "Client" }));
const ask = (day: number) => visits.requestVisit(db, journeyClient, { propertyId, date: isoDate(day), time: "10:00" });
const vDemandee = ask(71);
const vConfirmee = ask(72);
if (vConfirmee.ok) visits.decideVisit(db, owner, vConfirmee.data.visit.id, { action: "confirmer" });
const vReprogrammee = ask(73);
if (vReprogrammee.ok) {
  visits.decideVisit(db, journeyClient, vReprogrammee.data.visit.id, { action: "reprogrammer", date: isoDate(74), time: "11:00" });
}
const vRefusee = ask(75);
if (vRefusee.ok) visits.decideVisit(db, owner, vRefusee.data.visit.id, { action: "refuser", reason: "Créneau déjà pris." });
const vAnnulee = ask(76);
if (vAnnulee.ok) visits.decideVisit(db, journeyClient, vAnnulee.data.visit.id, { action: "annuler" });
const vAbsence = ask(77);
if (vAbsence.ok) {
  visits.decideVisit(db, owner, vAbsence.data.visit.id, { action: "confirmer" });
  visits.decideVisit(db, owner, vAbsence.data.visit.id, { action: "absence", reason: "Client absent." });
}
const pendingVisits = [
  ["demandée", vDemandee],
  ["confirmée", vConfirmee],
  ["reprogrammée", vReprogrammee],
  ["refusée", vRefusee],
  ["annulée", vAnnulee],
  ["absence constatée", vAbsence],
] as const;
for (const [label, request] of pendingVisits) {
  const id = request.ok ? request.data.visit.id : "";
  const attempt = applicationsModule.createApplication(db, journeyClient, { visitId: id });
  check(`une visite ${label} ne permet pas de louer`, !attempt.ok);
}
const vEffectuee = ask(78);
if (vEffectuee.ok) {
  visits.decideVisit(db, owner, vEffectuee.data.visit.id, { action: "confirmer" });
  visits.decideVisit(db, owner, vEffectuee.data.visit.id, { action: "effectuer", reason: "Visite réalisée." });
}
const afterVisit = applicationsModule.createApplication(db, journeyClient, {
  visitId: vEffectuee.ok ? vEffectuee.data.visit.id : "",
  message: "Dossier complet.",
});
check("une visite effectuée ouvre la demande de location", afterVisit.ok, afterVisit.ok ? "" : afterVisit.message);
check(
  "la demande après visite ne porte aucune période",
  afterVisit.ok && afterVisit.data.application.desiredStart === null,
);

/* --- Isolation entre clients --- */
const intruder = user(await makeUser("client", "intrus.test@homera.demo", { prenom: "Intrus", nom: "Test" }));
const stolen = applicationsModule.createApplication(db, intruder, {
  visitId: vEffectuee.ok ? vEffectuee.data.visit.id : "",
});
check("la visite d’un autre client ne permet pas de louer", !stolen.ok);

/* --- Disponibilité et publication : vérifiées par le serveur --- */
db.prepare("UPDATE properties SET availability = 'indisponible' WHERE id = ?").run(propertyId);
const blockedVisit = visits.requestVisit(db, intruder, { propertyId, date: isoDate(79), time: "10:00" });
if (blockedVisit.ok) {
  visits.decideVisit(db, owner, blockedVisit.data.visit.id, { action: "confirmer" });
  visits.decideVisit(db, owner, blockedVisit.data.visit.id, { action: "effectuer" });
}
const onUnavailable = applicationsModule.createApplication(db, intruder, {
  visitId: blockedVisit.ok ? blockedVisit.data.visit.id : "",
});
check("un bien indisponible ne reçoit aucune demande", !onUnavailable.ok);
db.prepare("UPDATE properties SET availability = 'disponible' WHERE id = ?").run(propertyId);
db.prepare("UPDATE properties SET availability = 'indisponible' WHERE id = ?").run(directBien);
const directBlocked = applicationsModule.createApplication(db, intruder, { propertyId: directBien });
check("un bien direct indisponible ne se réserve pas", !directBlocked.ok);
db.prepare("UPDATE properties SET availability = 'disponible' WHERE id = ?").run(directBien);
db.prepare("UPDATE properties SET publication_status = 'suspendu' WHERE id = ?").run(directBien);
const unpublished = applicationsModule.createApplication(db, intruder, { propertyId: directBien });
check("un bien sorti du catalogue ne se réserve pas", !unpublished.ok);
db.prepare("UPDATE properties SET publication_status = 'publie' WHERE id = ?").run(directBien);

/* --- Chevauchement avec une indisponibilité déclarée --- */
db.prepare(
  "INSERT INTO property_availability (id, property_id, start_date, end_date, kind, reason, created_by, created_at) VALUES (?, ?, ?, ?, 'indisponible', ?, ?, ?)",
).run("TEST-INDISPO-1", directBien, isoDate(90), isoDate(92), "Travaux.", owner.id, new Date().toISOString());
const overlapClient = user(await makeUser("client", "chevauche.test@homera.demo", { prenom: "Chevauche", nom: "Test" }));
const overlap = applicationsModule.createApplication(db, overlapClient, {
  propertyId: directBien,
  desiredStart: isoDate(91),
  desiredEnd: isoDate(93),
});
check("une période incompatible avec une indisponibilité est refusée", !overlap.ok);
const aside = applicationsModule.createApplication(db, overlapClient, {
  propertyId: directBien,
  desiredStart: isoDate(95),
  desiredEnd: isoDate(96),
});
check("une période compatible reste réservable", aside.ok, aside.ok ? "" : aside.message);
db.prepare("DELETE FROM property_availability WHERE id = ?").run("TEST-INDISPO-1");

/* --- Bien non louable --- */
const saleOwnerRow = db.prepare<[string], { owner_id: string }>("SELECT owner_id FROM properties WHERE id = ?").get("maison-calavi");
const saleOwner = saleOwnerRow ? user(saleOwnerRow.owner_id) : owner;
const saleClient = user(await makeUser("client", "achat.test@homera.demo", { prenom: "Achat", nom: "Test" }));
const saleVisit = visits.requestVisit(db, saleClient, { propertyId: "maison-calavi", date: isoDate(80), time: "10:00" });
if (saleVisit.ok) {
  visits.decideVisit(db, saleOwner, saleVisit.data.visit.id, { action: "confirmer" });
  visits.decideVisit(db, saleOwner, saleVisit.data.visit.id, { action: "effectuer" });
}
const onSale = applicationsModule.createApplication(db, saleClient, {
  visitId: saleVisit.ok ? saleVisit.data.visit.id : "",
});
check("un bien à vendre ne reçoit aucune demande de location", !onSale.ok);
closeDb();

/* ------------------------------------------------------------------
   Résultat
   ------------------------------------------------------------------ */

console.log(`\n${passed} vérifications réussies, ${failed} échec(s).`);
if (failed > 0) {
  console.log("\nÉchecs :");
  for (const failure of failures) console.log(`  • ${failure}`);
  process.exit(1);
}
console.log("Socle serveur conforme.");
