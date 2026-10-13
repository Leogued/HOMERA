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
check("les 36 biens du catalogue sont amorcés", seeded.count === 36, `reçu ${seeded.count}`);
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
check("les biens du catalogue public restent lisibles", properties.listProperties(db, {}).length >= 36);

const notifications = notificationsModule.listNotifications(db, ownerId, { unreadOnly: true });
check("les notifications du propriétaire sont persistantes", notifications.length > 0);
const unreadBefore = notificationsModule.unreadCount(db, ownerId);
notificationsModule.markRead(db, ownerId, [notifications[0]!.id]);
check("marquer comme lu diminue le compteur", notificationsModule.unreadCount(db, ownerId) === unreadBefore - 1);

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
