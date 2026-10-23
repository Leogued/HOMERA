import type { Db } from "../db/client";
import { nowIso, queryOne } from "../db/client";
import { PROPERTIES } from "../../content";
import { hashPasswordSync } from "../security/password";
import { newId } from "../db/client";
import { writeAudit } from "../audit";
import { notify } from "../notifications";
import { ensureVerification } from "../services/verifications";

/* ==================================================================
   HOMERA — AMORÇAGE DE LA BASE
   ------------------------------------------------------------------
   Le catalogue public (`lib/content.ts`, 38 biens) n’est plus la source
   de vérité : il sert à remplir la base au premier démarrage. Ensuite,
   c’est la base qui commande — ajouter un bien dans `content.ts` ne
   change plus rien une fois la base amorcée.

   Les comptes de démonstration sont créés ici, avec des mots de passe
   hachés côté serveur : admin/admin, prop/prop, agent/agent, user/user.

   Honnêteté des données semées : les biens marqués « vérifiés » ont un
   dossier accepté **sur pièces uniquement** (`onsite_done = 0`). Aucune
   visite de contrôle physique n’est affirmée.
   ================================================================== */

export type DemoCredential = { email: string; password: string; label: string };

export const DEMO_CREDENTIALS: DemoCredential[] = [
  { email: "admin@homera.demo", password: "admin", label: "Administration" },
  { email: "prop@homera.demo", password: "prop", label: "Propriétaire" },
  { email: "agent@homera.demo", password: "agent", label: "Agent" },
  { email: "user@homera.demo", password: "user", label: "Client" },
];

const CREATED_AT = "2026-10-03T00:00:00.000Z";
const ISO_DAY = /^(\d{2})\/(\d{2})\/(\d{4})$/;

function isoFromFrenchDate(value: string, fallback: string): string {
  const match = ISO_DAY.exec(value);
  if (!match) return fallback;
  return `${match[3]}-${match[2]}-${match[1]}T00:00:00.000Z`;
}

const DEPARTMENTS: { department: string; communes: string[] }[] = [
  { department: "Littoral", communes: ["Cotonou"] },
  { department: "Atlantique", communes: ["Abomey-Calavi", "Ouidah", "Allada", "Toffo", "Tori-Bossito"] },
  { department: "Ouémé", communes: ["Porto-Novo", "Sèmè-Podji", "Bonou", "Adjohoun", "Aguégués", "Avrankou", "Akpro-Missérété", "Dangbo"] },
  { department: "Zou", communes: ["Abomey", "Bohicon", "Covè", "Ouinhi", "Zagnanado", "Za-Kpota", "Djidja"] },
  { department: "Borgou", communes: ["Parakou", "Nikki", "Kalalé", "N’Dali", "Pèrèrè", "Sinendé", "Tchaourou", "Bembèrèkè"] },
  { department: "Mono", communes: ["Lokossa", "Grand-Popo", "Houéyogbé", "Bopa", "Comè", "Athouémé"] },
  { department: "Couffo", communes: ["Aplahoué", "Djakotomey", "Klouékanmè", "Lalo", "Toviklin", "Dogbo"] },
  { department: "Plateau", communes: ["Pobè", "Kétou", "Sakété", "Ifangni", "Adja-Ouèrè"] },
  { department: "Collines", communes: ["Savalou", "Dassa-Zoumè", "Glazoué", "Savè", "Ouèssè", "Bantè"] },
  { department: "Donga", communes: ["Djougou", "Bassila", "Copargo", "Ouaké"] },
  { department: "Atacora", communes: ["Natitingou", "Tanguiéta", "Kouandé", "Péhunco", "Kérou", "Boukombé", "Cobly", "Matéri", "Toucountouna"] },
  { department: "Alibori", communes: ["Kandi", "Malanville", "Banikoara", "Gogounou", "Ségbana", "Karimama"] },
];

function seedLocations(db: Db): void {
  const insert = db.prepare(
    "INSERT OR IGNORE INTO locations (id, country, department, commune, district, kind) VALUES (?, 'Bénin', ?, ?, ?, ?)",
  );
  for (const entry of DEPARTMENTS) {
    insert.run(newId("LOC"), entry.department, "", "", "departement");
    for (const commune of entry.communes) {
      insert.run(newId("LOC"), entry.department, commune, "", "commune");
    }
  }
  const districts = new Set(PROPERTIES.map((property) => `${property.city}||${property.district}`));
  for (const entry of districts) {
    const [city, district] = entry.split("||");
    insert.run(newId("LOC"), "", city, district, "quartier");
  }
}

type SeedAccount = {
  id: string;
  email: string;
  password: string;
  prenom: string;
  nom: string;
  telephone: string;
  roles: string[];
  profile: Record<string, string>;
  notify?: boolean;
};

const ACCOUNTS: SeedAccount[] = [
  {
    id: "HOM-DEMO-ADMIN",
    email: "admin@homera.demo",
    password: "admin",
    prenom: "Admin",
    nom: "HOMERA",
    telephone: "+229 01 97 00 00 01",
    roles: ["client", "superadmin"],
    profile: {},
  },
  {
    id: "HOM-DEMO-PROP",
    email: "prop@homera.demo",
    password: "prop",
    prenom: "Marc",
    nom: "Sènou",
    telephone: "+229 01 97 00 00 04",
    roles: ["client", "proprietaire"],
    profile: { portefeuille: "2-5", typeBien: "villa", zone: "Cotonou" },
    notify: true,
  },
  {
    id: "HOM-DEMO-OWNER2",
    email: "sofia@homera.demo",
    password: "sofia",
    prenom: "Sofia",
    nom: "Déguénon",
    telephone: "+229 01 97 00 00 05",
    roles: ["client", "proprietaire"],
    profile: { portefeuille: "1", typeBien: "terrain", zone: "Abomey-Calavi" },
  },
  {
    id: "HOM-DEMO-AGENT",
    email: "agent@homera.demo",
    password: "agent",
    prenom: "Koffi",
    nom: "Ahouansou",
    telephone: "+229 01 97 00 00 03",
    roles: ["client", "agent"],
    profile: {
      structure: "Cabinet Ahouansou Immobilier",
      identification: "RB/COT/24 B 1234",
      zoneExercice: "Cotonou",
      experience: "3-10",
    },
    notify: true,
  },
  {
    id: "HOM-DEMO-USER",
    email: "user@homera.demo",
    password: "user",
    prenom: "Aïcha",
    nom: "Client",
    telephone: "+229 01 97 00 00 02",
    roles: ["client"],
    profile: { projet: "louer", bienRecherche: "appartement", budget: "location-500" },
    notify: true,
  },
];

function seedAccounts(db: Db): void {
  const insertUser = db.prepare(
    `INSERT OR IGNORE INTO users (id, email, email_key, prenom, nom, telephone, password_hash, password_algo,
       password_salt, password_params, email_verified, notify, status, last_login_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'scrypt', ?, ?, 1, ?, 'actif', NULL, ?, ?)`,
  );
  const insertRole = db.prepare("INSERT OR IGNORE INTO user_roles (user_id, role, granted_at, granted_by) VALUES (?, ?, ?, ?)");
  const insertProfile = db.prepare("INSERT OR REPLACE INTO user_profiles (user_id, key, value) VALUES (?, ?, ?)");
  for (const account of ACCOUNTS) {
    const { hash, salt, params } = hashPasswordSync(account.password);
    insertUser.run(
      account.id,
      account.email,
      account.email.toLowerCase(),
      account.prenom,
      account.nom,
      account.telephone,
      hash,
      salt,
      params,
      account.notify ? 1 : 0,
      CREATED_AT,
      CREATED_AT,
    );
    for (const role of account.roles) insertRole.run(account.id, role, CREATED_AT, "HOM-DEMO-ADMIN");
    for (const [key, value] of Object.entries(account.profile)) insertProfile.run(account.id, key, value);
  }
  db.prepare(
    `INSERT OR IGNORE INTO agencies (id, name, identification, city, verification_status, created_at, updated_at)
     VALUES ('HOM-AGENCY-001', 'Cabinet Ahouansou Immobilier', 'RB/COT/24 B 1234', 'Cotonou', 'verifie', ?, ?)`,
  ).run(CREATED_AT, CREATED_AT);
  db.prepare(
    `INSERT OR IGNORE INTO agents (user_id, matricule, agency_id, structure, identification, zone, experience,
       verification_status, verified_at, created_at, updated_at)
     VALUES ('HOM-DEMO-AGENT', 'AG-HOM-0248', 'HOM-AGENCY-001', 'Cabinet Ahouansou Immobilier', 'RB/COT/24 B 1234',
             'Cotonou', '3-10', 'verifie', ?, ?, ?)`,
  ).run(CREATED_AT, CREATED_AT, CREATED_AT);
}

/** Le Bénin se découpe en départements et communes : une ville seule ne dit pas où l’on est. */
function departmentAndCommune(city: string): { department: string; commune: string } {
  for (const entry of DEPARTMENTS) {
    if (entry.communes.includes(city)) return { department: entry.department, commune: city };
  }
  return { department: city, commune: city };
}

function seedProperties(db: Db): void {
  const owners = ["HOM-DEMO-PROP", "HOM-DEMO-OWNER2"];
  const insert = db.prepare(
    `INSERT OR IGNORE INTO properties (id, reference, title, type, intent, price, price_period, country, department,
       commune, city, district, address, bedrooms, bathrooms, surface, rooms, floor, land_title, min_nights,
       description, conditions, furnished, availability, unavailable_until, availability_note, publication_status,
       verification_status, verified_on, owner_id, agency_id, main_photo_id, latitude, longitude, published_at,
       created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'Bénin', ?, ?, ?, ?, '', ?, ?, ?, ?, ?, ?, ?, ?, '', ?, 'disponible', NULL, '',
             ?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?)`,
  );
  const insertFeature = db.prepare("INSERT OR IGNORE INTO property_features (property_id, feature) VALUES (?, ?)");
  const insertPhoto = db.prepare(
    "INSERT OR IGNORE INTO property_photos (id, property_id, media_key, alt, position, is_main, approved, created_by, created_at) VALUES (?, ?, ?, ?, ?, 1, 1, 'HOM-DEMO-ADMIN', ?)",
  );
  const insertDocument = db.prepare(
    "INSERT OR IGNORE INTO documents (id, entity_type, entity_id, kind, filename, storage_path, status, uploaded_by, created_at) VALUES (?, 'bien', ?, ?, ?, '', 'declare', 'HOM-DEMO-PROP', ?)",
  );
  const setMain = db.prepare("UPDATE properties SET main_photo_id = ? WHERE id = ?");

  PROPERTIES.forEach((property, index) => {
    const verified = (property.verificationStatus ?? "verifie") === "verifie";
    const owner = owners[index % owners.length];
    const verifiedOn = verified ? isoFromFrenchDate(property.verifiedOn, property.publishedAt) : null;
    insert.run(
      property.id,
      property.homeraId,
      property.title,
      property.type,
      property.intent,
      property.price,
      property.pricePeriod ?? "",
      departmentAndCommune(property.city).department,
      departmentAndCommune(property.city).commune,
      property.city,
      property.district,
      property.bedrooms,
      property.bathrooms,
      property.surface,
      property.rooms ?? null,
      property.floor ?? "",
      property.landTitle ?? null,
      property.minNights ?? null,
      property.description ?? "",
      (property.features ?? []).includes("meuble") ? 1 : 0,
      verified ? "publie" : "en-verification",
      verified ? "verifie" : "en-cours",
      verifiedOn,
      owner,
      property.coordinates?.lat ?? null,
      property.coordinates?.lng ?? null,
      property.publishedAt,
      property.publishedAt,
      property.publishedAt,
    );
    for (const feature of property.features ?? []) insertFeature.run(property.id, feature);
    if (property.media) {
      const photoId = newId("PHO");
      insertPhoto.run(photoId, property.id, property.media, property.alt, 0, CREATED_AT);
      setMain.run(photoId, property.id);
    }
    insertDocument.run(newId("DOC"), property.id, "propriete", "Pièce de propriété (déclarée au pilote)", CREATED_AT);

    const verification = ensureVerification(db, property.id);
    if (verified) {
      db.prepare(
        "UPDATE verifications SET status = 'accepte', documentary_only = 1, onsite_done = 0, decided_at = ?, decided_by = 'HOM-DEMO-ADMIN', decision_note = 'Dossier accepté sur pièces (données d’amorçage).', updated_at = ? WHERE id = ?",
      ).run(verifiedOn ?? CREATED_AT, verifiedOn ?? CREATED_AT, verification.id);
      for (const stepKey of ["completude", "identite", "pieces", "coherence", "photos", "interlocuteur", "decision"]) {
        db.prepare(
          "UPDATE verification_steps SET status = 'valide', actor_id = 'HOM-DEMO-ADMIN', updated_at = ? WHERE verification_id = ? AND step_key = ?",
        ).run(verifiedOn ?? CREATED_AT, verification.id, stepKey);
      }
      db.prepare(
        "UPDATE verification_steps SET status = 'non-applicable', comment = 'Aucune visite de contrôle réalisée : vérification documentaire uniquement.', actor_id = 'HOM-DEMO-ADMIN', updated_at = ? WHERE verification_id = ? AND step_key = 'sur-place'",
      ).run(verifiedOn ?? CREATED_AT, verification.id);
    }
    traceProperty(db, property.id, owner, property.publishedAt, verifiedOn);
  });
}

/**
 * Journal d’amorçage d’un bien : les mêmes entrées que celles qu’écrit le
 * serveur en production, datées par les colonnes du bien lui-même. La page
 * « historique » publique ne lit que ce journal : sans ces entrées, un bien
 * n’aurait aucune trace à montrer.
 */
function traceProperty(
  db: Db,
  propertyId: string,
  ownerId: string,
  publishedAt: string,
  verifiedOn: string | null,
): void {
  const insert = db.prepare(
    `INSERT INTO audit_log (id, actor_id, actor_label, action, entity_type, entity_id, detail, ip, created_at)
     VALUES (?, ?, ?, ?, 'bien', ?, ?, '', ?)`,
  );
  /* L’acteur cité dans le journal doit être un compte qui existe : le second
     propriétaire semé est Sofia (HOM-DEMO-OWNER2). */
  const ownerLabel = ownerId === "HOM-DEMO-PROP" ? "prop@homera.demo" : "sofia@homera.demo";
  /* Les dates d’amorçage arrivent parfois en `YYYY-MM-DD` : le journal est
     normalisé en ISO complet pour rester triable avec les écritures
     produites par le serveur. */
  const asIso = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toISOString();
  };
  const created = isoAfter(asIso(publishedAt), -2);
  insert.run(newId("LOG"), ownerId, ownerLabel, "bien.cree", propertyId, JSON.stringify({}), created);
  insert.run(newId("LOG"), ownerId, ownerLabel, "bien.soumis", propertyId, JSON.stringify({}), isoAfter(created, 1));
  if (verifiedOn) {
    insert.run(
      newId("LOG"),
      "HOM-DEMO-ADMIN",
      "admin@homera.demo",
      "verification.valide",
      propertyId,
      JSON.stringify({ kind: "documentaire" }),
      asIso(verifiedOn),
    );
  }
  insert.run(
    newId("LOG"),
    "HOM-DEMO-ADMIN",
    "admin@homera.demo",
    "bien.publication.publie",
    propertyId,
    JSON.stringify({}),
    asIso(publishedAt),
  );
}

/** Décale une date ISO de `days` jours : les dates d’amorçage sont relatives. */
function isoAfter(iso: string, days: number): string {
  const base = new Date(iso);
  if (Number.isNaN(base.getTime())) return iso;
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString();
}

/** Mandats de démonstration : l’agent ne voit que ce qui est réellement actif. */
function seedAuthorizations(db: Db): void {
  const iso = nowIso();
  const agent = "HOM-DEMO-AGENT";
  const entries = [
    {
      property: "villa-fidjrosse",
      status: "active",
      scope: ["visite", "location"],
      proof: "Mandat de location · document pilote MA-2026-041",
      starts: "2026-08-18",
      expires: "2027-08-18",
    },
    {
      property: "duplex-ganhi",
      status: "active",
      scope: ["visite"],
      proof: "Mandat de visite · document pilote MA-2026-052",
      starts: "2026-09-02",
      expires: "2027-03-02",
    },
    {
      property: "appartement-haie-vive",
      status: "expiree",
      scope: ["visite"],
      proof: "Mandat expiré · document pilote MA-2025-118",
      starts: "2025-06-01",
      expires: "2026-06-01",
    },
  ];
  const insert = db.prepare(
    `INSERT OR IGNORE INTO authorizations (id, reference, property_id, owner_id, agent_id, agency_id, invite_email,
       invite_token_hash, scope, mandate_type, status, proof_label, starts_at, expires_at, note, decision_note,
       decided_at, decided_by, created_at, updated_at)
     VALUES (?, ?, ?, 'HOM-DEMO-PROP', ?, 'HOM-AGENCY-001', NULL, NULL, ?, 'location', ?, ?, ?, ?, '', '', ?, 'HOM-DEMO-ADMIN', ?, ?)`,
  );
  const event = db.prepare(
    "INSERT INTO authorization_events (id, authorization_id, actor_id, actor_label, action, from_status, to_status, note, created_at) VALUES (?, ?, 'HOM-DEMO-ADMIN', 'admin@homera.demo', ?, NULL, ?, ?, ?)",
  );
  entries.forEach((entry, index) => {
    const property = queryOne<{ id: string; reference: string }>("SELECT id, reference FROM properties WHERE id = ?", [
      entry.property,
    ]);
    if (!property) return;
    const id = newId("AUT");
    const reference = `MA-2026-0${41 + index}`;
    insert.run(
      id,
      reference,
      property.id,
      agent,
      JSON.stringify(entry.scope),
      entry.status,
      entry.proof,
      `${entry.starts}T00:00:00.000Z`,
      `${entry.expires}T23:59:59.000Z`,
      entry.starts,
      entry.starts,
      entry.starts,
    );
    event.run(newId("EVA"), id, "demande.creee", entry.status, entry.proof, `${entry.starts}T00:00:00.000Z`);
    if (entry.status === "active") {
      event.run(newId("EVA"), id, "accepter", "active", "Mandat accepté par l’agent", `${entry.starts}T06:00:00.000Z`);
    } else if (entry.status === "expiree") {
      event.run(newId("EVA"), id, "expiration", "expiree", "Échéance du mandat", `${entry.expires}T23:59:59.000Z`);
    }
  });
  notify(db, {
    userIds: [agent],
    type: "agent",
    title: "Mandats chargés",
    body: "Deux mandats actifs et un mandat expiré sont rattachés à votre matricule AG-HOM-0248.",
    link: "/agent/autorisations",
    entityType: "mandat",
    entityId: agent,
  });
  writeAudit(db, {
    actorId: "HOM-DEMO-ADMIN",
    actorLabel: "admin@homera.demo",
    action: "amorcage.mandats",
    entityType: "mandat",
    entityId: agent,
    detail: { mandats: entries.length },
  });
  void iso;
}

/** Quelques créneaux et visites pour que les espaces aient de vrais objets. */
function seedVisits(db: Db): void {
  const iso = nowIso();
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  const inThreeDays = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
  const villa = queryOne<{ id: string; owner_id: string | null }>("SELECT id, owner_id FROM properties WHERE id = 'villa-fidjrosse'");
  if (!villa) return;
  const slotId = newId("SLT");
  db.prepare(
    "INSERT OR IGNORE INTO visit_slots (id, property_id, starts_at, ends_at, capacity, booked, status, note, created_by, created_at) VALUES (?, ?, ?, ?, 1, 0, 'ouvert', 'Visite accompagnée par l’agent mandaté', 'HOM-DEMO-PROP', ?)",
  ).run(slotId, villa.id, `${tomorrow}T10:00:00.000Z`, `${tomorrow}T11:00:00.000Z`, CREATED_AT);
  db.prepare(
    "INSERT OR IGNORE INTO visit_slots (id, property_id, starts_at, ends_at, capacity, booked, status, note, created_by, created_at) VALUES (?, ?, ?, ?, 1, 0, 'ouvert', '', 'HOM-DEMO-PROP', ?)",
  ).run(newId("SLT"), villa.id, `${inThreeDays}T15:00:00.000Z`, `${inThreeDays}T16:00:00.000Z`, CREATED_AT);

  const visitId = newId("VIS");
  db.prepare(
    `INSERT OR IGNORE INTO visits (id, reference, property_id, client_id, owner_id, agent_id, slot_id, requested_date,
        requested_time, duration_min, status, message, cancel_reason, decided_at, decided_by, completed_at, created_at, updated_at)
     VALUES (?, 'VIS-0001', ?, 'HOM-DEMO-USER', ?, 'HOM-DEMO-AGENT', ?, ?, '10:00', 45, 'demandee',
             'Je souhaite visiter avec mon conjoint.', '', NULL, NULL, NULL, ?, ?)`,
  ).run(visitId, villa.id, villa.owner_id, slotId, tomorrow, CREATED_AT, CREATED_AT);
  db.prepare(
    "INSERT INTO visit_events (id, visit_id, actor_id, actor_label, action, from_status, to_status, note, created_at) VALUES (?, ?, 'HOM-DEMO-USER', 'user@homera.demo', 'demande', NULL, 'demandee', ?, ?)",
  ).run(newId("EVV"), visitId, `${tomorrow} 10:00`, CREATED_AT);
  db.prepare("UPDATE visit_slots SET booked = 1 WHERE id = ?").run(slotId);
  notify(db, {
    userIds: [villa.owner_id, "HOM-DEMO-AGENT"],
    type: "visite",
    title: "Demande de visite à traiter",
    body: `VIS-0001 · Villa 4 chambres & jardin tropical — ${tomorrow} à 10:00.`,
    link: "/proprietaire/visites",
    entityType: "visite",
    entityId: visitId,
  });
  void iso;
}

/* Vitrine payante : 2 emplacements de démonstration actifs, 1 expiré
   (prouve le filtrage). Aucun annonceur réel tant que le paiement
   n'est pas branché. */
function seedSpotlight(db: Db): void {
  const ids = PROPERTIES.map((property) => property.id);
  if (ids.length < 3 || !ids[0] || !ids[1] || !ids[2]) return;
  const insert = db.prepare(
    "INSERT OR IGNORE INTO spotlight_slots (slot, property_id, since, until, note) VALUES (?, ?, ?, ?, ?)",
  );
  insert.run(1, ids[0], "2026-01-05", "2027-12-31", "Emplacement de démonstration");
  insert.run(2, ids[1], "2026-01-05", null, "Emplacement de démonstration");
  insert.run(5, ids[2], "2025-01-05", "2025-02-05", "Emplacement expiré (démo)");
}

export function seedDatabase(db: Db): boolean {
  const existing = queryOne<{ count: number }>("SELECT COUNT(*) AS count FROM properties");
  if (existing && existing.count > 0) return false;

  db.transaction(() => {
    seedLocations(db);
    seedAccounts(db);
    seedProperties(db);
    seedSpotlight(db);
    seedAuthorizations(db);
    seedVisits(db);
    writeAudit(db, {
      actorId: "HOM-DEMO-ADMIN",
      actorLabel: "admin@homera.demo",
      action: "base.amorcage",
      entityType: "système",
      entityId: "homera",
      detail: { biens: PROPERTIES.length, comptes: ACCOUNTS.length },
    });
  })();
  return true;
}
