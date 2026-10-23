/* ==================================================================
   HOMERA — MIGRATIONS DE LA BASE
   ------------------------------------------------------------------
   Le schéma vit dans le code, versionné, appliqué au premier accès.
   Règles tenues partout :

   • aucune migration destructive : pas de DROP, pas de suppression de
     colonne sans procédure explicite et sauvegarde ;
   • chaque migration est idempotente (`IF NOT EXISTS`) et rejouable ;
   • les identifiants sont des TEXT lisibles (HOM-CTN-000421, VIS-…) ;
   • les dates sont des chaînes ISO 8601 UTC — jamais d’heure locale ;
   • le schéma reste portable vers PostgreSQL : pas de fonction SQLite
     exotique, types simples, contraintes explicites.

   La table `schema_migrations` garde la trace de ce qui a été appliqué.
   ================================================================== */

export type Migration = {
  id: string;
  name: string;
  /**
   * Script SQL exécuté d’un bloc : SQLite sait enchaîner les
   * instructions, et le découpage manuel risquerait de couper une
   * contrainte ou un commentaire au mauvais endroit.
   */
  sql: string;
};

/* ------------------------------------------------------------------
   001 — SOCLE : identité, biens, mandats, visites, journal
   ------------------------------------------------------------------ */

const M001 = `
/* ---------- Identité ---------- */

CREATE TABLE IF NOT EXISTS users (
  id                TEXT PRIMARY KEY,
  email             TEXT NOT NULL,
  email_key         TEXT NOT NULL UNIQUE,
  prenom            TEXT NOT NULL DEFAULT '',
  nom               TEXT NOT NULL DEFAULT '',
  telephone         TEXT NOT NULL DEFAULT '',
  password_hash     TEXT NOT NULL,
  password_algo     TEXT NOT NULL DEFAULT 'scrypt',
  password_salt     TEXT NOT NULL,
  password_params   TEXT NOT NULL DEFAULT '{"N":16384,"r":8,"p":1,"keylen":64}',
  email_verified    INTEGER NOT NULL DEFAULT 0,
  notify            INTEGER NOT NULL DEFAULT 1,
  status            TEXT NOT NULL DEFAULT 'actif'
                    CHECK (status IN ('actif', 'suspendu', 'supprime')),
  last_login_at     TEXT,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);

/* Les rôles sont cumulables et ne sont JAMAIS déduits d’un profil :
   c’est cette table, côté serveur, qui fait foi. */
CREATE TABLE IF NOT EXISTS user_roles (
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL
              CHECK (role IN ('client', 'proprietaire', 'agent', 'admin', 'superadmin')),
  granted_at  TEXT NOT NULL,
  granted_by  TEXT,
  PRIMARY KEY (user_id, role)
);

/* Champs propres au rôle (projet, structure, zone…) — équivalent serveur
   de 'profile: Record<string, string>' consommé par l’interface. */
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key      TEXT NOT NULL,
  value    TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (user_id, key)
);

CREATE TABLE IF NOT EXISTS sessions (
  id           TEXT PRIMARY KEY,
  token_hash   TEXT NOT NULL UNIQUE,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TEXT NOT NULL,
  expires_at   TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  user_agent   TEXT NOT NULL DEFAULT '',
  ip           TEXT NOT NULL DEFAULT '',
  revoked_at   TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

/* Codes de vérification et jetons de réinitialisation : on ne stocke
   jamais le code en clair, seulement son empreinte. */
CREATE TABLE IF NOT EXISTS auth_tokens (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose     TEXT NOT NULL CHECK (purpose IN ('verification', 'reset')),
  code_hash   TEXT,
  token_hash  TEXT,
  expires_at  TEXT NOT NULL,
  attempts    INTEGER NOT NULL DEFAULT 0,
  consumed_at TEXT,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_user ON auth_tokens(user_id, purpose);

/* Tentatives de connexion : la limitation du débit survit au redémarrage. */
CREATE TABLE IF NOT EXISTS login_attempts (
  id         TEXT PRIMARY KEY,
  email_key  TEXT NOT NULL,
  ip         TEXT NOT NULL DEFAULT '',
  success    INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_login_attempts_key ON login_attempts(email_key, created_at);

/* ---------- Structures professionnelles ---------- */

CREATE TABLE IF NOT EXISTS agencies (
  id                  TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  identification      TEXT NOT NULL DEFAULT '',
  city                TEXT NOT NULL DEFAULT '',
  verification_status TEXT NOT NULL DEFAULT 'non-verifie'
                      CHECK (verification_status IN ('non-verifie', 'en-cours', 'verifie', 'suspendu')),
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS agents (
  user_id             TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  matricule           TEXT NOT NULL UNIQUE,
  agency_id           TEXT REFERENCES agencies(id) ON DELETE SET NULL,
  structure           TEXT NOT NULL DEFAULT '',
  identification      TEXT NOT NULL DEFAULT '',
  zone                TEXT NOT NULL DEFAULT '',
  experience          TEXT NOT NULL DEFAULT '',
  verification_status TEXT NOT NULL DEFAULT 'non-verifie'
                      CHECK (verification_status IN ('non-verifie', 'en-cours', 'verifie', 'suspendu')),
  verified_at         TEXT,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
);

/* ---------- Biens ---------- */

CREATE TABLE IF NOT EXISTS properties (
  id                  TEXT PRIMARY KEY,
  reference           TEXT NOT NULL UNIQUE,
  title               TEXT NOT NULL,
  type                TEXT NOT NULL
                      CHECK (type IN ('villa', 'appartement', 'studio', 'chambre', 'immeuble', 'terrain', 'boutique', 'salle', 'espace')),
  intent              TEXT NOT NULL CHECK (intent IN ('acheter', 'louer', 'sejour')),
  price               INTEGER NOT NULL DEFAULT 0,
  price_period        TEXT NOT NULL DEFAULT '',
  country             TEXT NOT NULL DEFAULT 'Bénin',
  department          TEXT NOT NULL DEFAULT '',
  commune             TEXT NOT NULL DEFAULT '',
  city                TEXT NOT NULL DEFAULT '',
  district            TEXT NOT NULL DEFAULT '',
  address             TEXT NOT NULL DEFAULT '',
  bedrooms            INTEGER NOT NULL DEFAULT 0,
  bathrooms           INTEGER NOT NULL DEFAULT 0,
  surface             INTEGER NOT NULL DEFAULT 0,
  rooms               INTEGER,
  floor               TEXT NOT NULL DEFAULT '',
  land_title          TEXT,
  min_nights          INTEGER,
  description         TEXT NOT NULL DEFAULT '',
  conditions          TEXT NOT NULL DEFAULT '',
  furnished           INTEGER NOT NULL DEFAULT 0,
  availability        TEXT NOT NULL DEFAULT 'disponible'
                      CHECK (availability IN ('disponible', 'indisponible', 'suspendu')),
  unavailable_until   TEXT,
  availability_note   TEXT NOT NULL DEFAULT '',
  publication_status  TEXT NOT NULL DEFAULT 'publie'
                      CHECK (publication_status IN ('brouillon', 'soumis', 'en-verification', 'publie', 'suspendu', 'loue', 'vendu', 'archive')),
  verification_status TEXT NOT NULL DEFAULT 'non-verifie'
                      CHECK (verification_status IN ('non-verifie', 'en-cours', 'verifie', 'refuse', 'suspendu')),
  verified_on         TEXT,
  owner_id            TEXT REFERENCES users(id) ON DELETE SET NULL,
  agency_id           TEXT REFERENCES agencies(id) ON DELETE SET NULL,
  main_photo_id       TEXT,
  latitude            REAL,
  longitude           REAL,
  published_at        TEXT,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(publication_status, verification_status);
CREATE INDEX IF NOT EXISTS idx_properties_owner ON properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_properties_intent ON properties(intent, type);

CREATE TABLE IF NOT EXISTS property_features (
  property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  feature     TEXT NOT NULL,
  PRIMARY KEY (property_id, feature)
);
CREATE INDEX IF NOT EXISTS idx_property_features ON property_features(feature);

CREATE TABLE IF NOT EXISTS property_photos (
  id          TEXT PRIMARY KEY,
  property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  media_key   TEXT NOT NULL,
  alt         TEXT NOT NULL DEFAULT '',
  position    INTEGER NOT NULL DEFAULT 0,
  is_main     INTEGER NOT NULL DEFAULT 0,
  approved    INTEGER NOT NULL DEFAULT 1,
  created_by  TEXT,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_property_photos ON property_photos(property_id, position);

CREATE TABLE IF NOT EXISTS property_availability (
  id          TEXT PRIMARY KEY,
  property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  start_date  TEXT NOT NULL,
  end_date    TEXT NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('disponible', 'indisponible')),
  reason      TEXT NOT NULL DEFAULT '',
  created_by  TEXT,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_property_availability ON property_availability(property_id, start_date, end_date);

/* Créneaux de visite proposés par le propriétaire ou l’agent autorisé.
   'capacity' = nombre de visites acceptées simultanément sur le créneau ;
   la réservation est transactionnelle, donc sans double réservation. */
CREATE TABLE IF NOT EXISTS visit_slots (
  id          TEXT PRIMARY KEY,
  property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  starts_at   TEXT NOT NULL,
  ends_at     TEXT NOT NULL,
  capacity    INTEGER NOT NULL DEFAULT 1,
  booked      INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'ouvert'
              CHECK (status IN ('ouvert', 'complet', 'ferme')),
  note        TEXT NOT NULL DEFAULT '',
  created_by  TEXT,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_visit_slots ON visit_slots(property_id, starts_at);

/* ---------- Documents ---------- */

CREATE TABLE IF NOT EXISTS documents (
  id           TEXT PRIMARY KEY,
  entity_type  TEXT NOT NULL CHECK (entity_type IN ('bien', 'utilisateur', 'mandat', 'verification')),
  entity_id    TEXT NOT NULL,
  kind         TEXT NOT NULL DEFAULT 'justificatif',
  filename     TEXT NOT NULL,
  storage_path TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL DEFAULT 'declare'
               CHECK (status IN ('declare', 'televerse', 'verifie', 'refuse')),
  uploaded_by  TEXT,
  created_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_documents_entity ON documents(entity_type, entity_id);

/* ---------- Autorisations (mandats) ---------- */

CREATE TABLE IF NOT EXISTS authorizations (
  id           TEXT PRIMARY KEY,
  reference    TEXT NOT NULL UNIQUE,
  property_id  TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  owner_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_id     TEXT REFERENCES users(id) ON DELETE CASCADE,
  agency_id    TEXT REFERENCES agencies(id) ON DELETE SET NULL,
  /* Agent invité mais pas encore inscrit : on garde l’adresse et un jeton. */
  invite_email TEXT,
  invite_token_hash TEXT,
  scope        TEXT NOT NULL DEFAULT '["visite"]',
  mandate_type TEXT NOT NULL DEFAULT 'location'
                CHECK (mandate_type IN ('location', 'vente', 'gerance', 'visite')),
  status       TEXT NOT NULL DEFAULT 'en-attente'
               CHECK (status IN ('en-attente', 'invite', 'active', 'refusee', 'revoquee', 'expiree', 'contestee')),
  proof_label  TEXT NOT NULL DEFAULT '',
  starts_at    TEXT NOT NULL,
  expires_at   TEXT NOT NULL,
  note         TEXT NOT NULL DEFAULT '',
  decision_note TEXT NOT NULL DEFAULT '',
  decided_at   TEXT,
  decided_by   TEXT,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_authorizations_property ON authorizations(property_id, status);
CREATE INDEX IF NOT EXISTS idx_authorizations_agent ON authorizations(agent_id, status);
CREATE INDEX IF NOT EXISTS idx_authorizations_owner ON authorizations(owner_id, status);

/* ---------- Visites ---------- */

CREATE TABLE IF NOT EXISTS visits (
  id             TEXT PRIMARY KEY,
  reference      TEXT NOT NULL UNIQUE,
  property_id    TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  client_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  owner_id       TEXT REFERENCES users(id) ON DELETE SET NULL,
  agent_id       TEXT REFERENCES users(id) ON DELETE SET NULL,
  slot_id        TEXT REFERENCES visit_slots(id) ON DELETE SET NULL,
  requested_date TEXT NOT NULL,
  requested_time TEXT NOT NULL DEFAULT '',
  duration_min   INTEGER NOT NULL DEFAULT 45,
  status         TEXT NOT NULL DEFAULT 'demandee'
                 CHECK (status IN ('demandee', 'confirmee', 'refusee', 'reprogrammee', 'effectuee', 'annulee', 'absence')),
  message        TEXT NOT NULL DEFAULT '',
  cancel_reason  TEXT NOT NULL DEFAULT '',
  decided_at     TEXT,
  decided_by     TEXT,
  completed_at   TEXT,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_visits_property ON visits(property_id, status);
CREATE INDEX IF NOT EXISTS idx_visits_client ON visits(client_id, status);
CREATE INDEX IF NOT EXISTS idx_visits_agent ON visits(agent_id, status);

/* ---------- Demandes de location et contrats ---------- */

CREATE TABLE IF NOT EXISTS rental_applications (
  id          TEXT PRIMARY KEY,
  reference   TEXT NOT NULL UNIQUE,
  property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  client_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  visit_id    TEXT REFERENCES visits(id) ON DELETE SET NULL,
  status      TEXT NOT NULL DEFAULT 'envoyee'
              CHECK (status IN ('envoyee', 'en-cours', 'acceptee', 'refusee', 'annulee')),
  message     TEXT NOT NULL DEFAULT '',
  decided_at  TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_applications_property ON rental_applications(property_id, status);

CREATE TABLE IF NOT EXISTS contracts (
  id            TEXT PRIMARY KEY,
  reference     TEXT NOT NULL UNIQUE,
  property_id   TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  client_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  owner_id      TEXT REFERENCES users(id) ON DELETE SET NULL,
  application_id TEXT REFERENCES rental_applications(id) ON DELETE SET NULL,
  status        TEXT NOT NULL DEFAULT 'brouillon'
                CHECK (status IN ('brouillon', 'envoye', 'a-signer', 'signe', 'annule')),
  rent_amount   INTEGER NOT NULL DEFAULT 0,
  deposit_amount INTEGER NOT NULL DEFAULT 0,
  start_date    TEXT NOT NULL DEFAULT '',
  end_date      TEXT NOT NULL DEFAULT '',
  signed_at     TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_contracts_client ON contracts(client_id, status);

/* ---------- Vérification des biens ---------- */

CREATE TABLE IF NOT EXISTS verifications (
  id          TEXT PRIMARY KEY,
  property_id TEXT NOT NULL UNIQUE REFERENCES properties(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'a-examiner'
              CHECK (status IN ('a-examiner', 'incomplet', 'en-cours', 'accepte', 'refuse', 'suspendu', 'a-reexaminer')),
  documentary_only INTEGER NOT NULL DEFAULT 1,
  onsite_done INTEGER NOT NULL DEFAULT 0,
  assigned_to TEXT REFERENCES users(id) ON DELETE SET NULL,
  decision_note TEXT NOT NULL DEFAULT '',
  decided_at  TEXT,
  decided_by  TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS verification_steps (
  id              TEXT PRIMARY KEY,
  verification_id TEXT NOT NULL REFERENCES verifications(id) ON DELETE CASCADE,
  step_key        TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'a-faire'
                  CHECK (status IN ('a-faire', 'en-cours', 'valide', 'refuse', 'non-applicable')),
  actor_id        TEXT REFERENCES users(id) ON DELETE SET NULL,
  comment         TEXT NOT NULL DEFAULT '',
  internal        INTEGER NOT NULL DEFAULT 1,
  updated_at      TEXT NOT NULL,
  UNIQUE (verification_id, step_key)
);

/* ---------- Notifications, favoris, journal ---------- */

CREATE TABLE IF NOT EXISTS notifications (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL DEFAULT '',
  link        TEXT NOT NULL DEFAULT '',
  entity_type TEXT NOT NULL DEFAULT '',
  entity_id   TEXT NOT NULL DEFAULT '',
  read_at     TEXT,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read_at);

CREATE TABLE IF NOT EXISTS favorites (
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL,
  PRIMARY KEY (user_id, property_id)
);

/* Journal d’audit : append-only. Aucune mise à jour, aucune suppression
   depuis l’application — c’est la garantie de traçabilité. */
CREATE TABLE IF NOT EXISTS audit_log (
  id          TEXT PRIMARY KEY,
  actor_id    TEXT,
  actor_label TEXT NOT NULL DEFAULT '',
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT '',
  entity_id   TEXT NOT NULL DEFAULT '',
  detail      TEXT NOT NULL DEFAULT '{}',
  ip          TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_log(actor_id, created_at);

/* Historique métier immuable : une visite ou un mandat ne se réécrit pas,
   il s’ajoute. */
CREATE TABLE IF NOT EXISTS visit_events (
  id          TEXT PRIMARY KEY,
  visit_id    TEXT NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  actor_id    TEXT,
  actor_label TEXT NOT NULL DEFAULT '',
  action      TEXT NOT NULL,
  from_status TEXT,
  to_status   TEXT,
  note        TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_visit_events ON visit_events(visit_id, created_at);

CREATE TABLE IF NOT EXISTS authorization_events (
  id               TEXT PRIMARY KEY,
  authorization_id TEXT NOT NULL REFERENCES authorizations(id) ON DELETE CASCADE,
  actor_id         TEXT,
  actor_label      TEXT NOT NULL DEFAULT '',
  action           TEXT NOT NULL,
  from_status      TEXT,
  to_status        TEXT,
  note             TEXT NOT NULL DEFAULT '',
  created_at       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_authorization_events ON authorization_events(authorization_id, created_at);

/* Référentiel de localisation (Bénin) : évite les valeurs inventées et
   les doublons ville/quartier. */
CREATE TABLE IF NOT EXISTS locations (
  id        TEXT PRIMARY KEY,
  country   TEXT NOT NULL DEFAULT 'Bénin',
  department TEXT NOT NULL DEFAULT '',
  commune   TEXT NOT NULL DEFAULT '',
  district  TEXT NOT NULL DEFAULT '',
  kind      TEXT NOT NULL DEFAULT 'quartier'
            CHECK (kind IN ('departement', 'commune', 'arrondissement', 'quartier')),
  UNIQUE (department, commune, district)
);

CREATE TABLE IF NOT EXISTS property_reports (
  id          TEXT PRIMARY KEY,
  property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  reporter_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  reason      TEXT NOT NULL,
  detail      TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'ouvert'
              CHECK (status IN ('ouvert', 'en-cours', 'clos', 'rejete')),
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS schema_migrations (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  applied_at TEXT NOT NULL
);
`;

/* ------------------------------------------------------------------
   002 — CANDIDATURES : motifs et auteur de la décision
   ------------------------------------------------------------------
   La table `rental_applications` du socle ne retenait que la date de
   décision. Une candidature refusée sans motif écrit est une décision
   inexplicable pour le candidat comme pour l’administration : on lui
   ajoute donc le motif (transmis au candidat) et l’auteur de la
   décision (opposable en cas de contestation).

   Migration additive : `ADD COLUMN` avec valeur par défaut, aucune
   ligne existante n’est modifiée ni supprimée.
   ------------------------------------------------------------------ */

const M002 = `
ALTER TABLE rental_applications ADD COLUMN decision_note TEXT NOT NULL DEFAULT '';
ALTER TABLE rental_applications ADD COLUMN decided_by    TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE rental_applications ADD COLUMN monthly_income INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_applications_client ON rental_applications(client_id, status);
CREATE INDEX IF NOT EXISTS idx_applications_visit  ON rental_applications(visit_id);
`;


/* ------------------------------------------------------------------

   003 — MESSAGERIE INTERNE : fils de discussion et messages

   ------------------------------------------------------------------

   Jusqu’ici, l’écran « Messages » conservait les échanges dans le

   navigateur : deux personnes ne pouvaient pas se parler. La messagerie

   devient un objet serveur :

     • une conversation est rattachée à un bien (et, quand elle existe,
       à la visite qui l’a motivée) ;
     • seuls les participants voient le fil — jamais l’administration,
       qui n’a pas à lire les échanges privés ;
     • chaque participant a son propre curseur de lecture, ce qui rend
       les « non lus » réels et personnels.

   Migration additive : aucune table existante n’est modifiée.
   ------------------------------------------------------------------ */

const M003 = `
CREATE TABLE IF NOT EXISTS conversations (
  id              TEXT PRIMARY KEY,
  property_id     TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  visit_id        TEXT REFERENCES visits(id) ON DELETE SET NULL,
  subject         TEXT NOT NULL DEFAULT '',
  created_by      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  last_message_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'intervenant'
                  CHECK (role IN ('client', 'proprietaire', 'agent', 'admin')),
  joined_at       TEXT NOT NULL,
  last_read_at    TEXT,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  author_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body            TEXT NOT NULL,
  created_at      TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_conversations_property ON conversations(property_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_visit    ON conversations(visit_id);
CREATE INDEX IF NOT EXISTS idx_participants_user      ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation  ON messages(conversation_id, created_at);
`;

/* ------------------------------------------------------------------
   004 — PHOTOS TÉLÉVERSÉES : nom d’origine, poids, date d’envoi
   ------------------------------------------------------------------ */

const M005 = `
/* Vitrine payante « Des biens qui méritent d'être vus » : 10 emplacements
   exactement (CHECK 1-10), un bien par emplacement, un emplacement par bien.
   until NULL = sans fin ; une ligne expirée n'est plus servie et son
   emplacement redevient attribuable. */
CREATE TABLE IF NOT EXISTS spotlight_slots (
  slot         INTEGER PRIMARY KEY CHECK (slot BETWEEN 1 AND 10),
  property_id  TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  since        TEXT NOT NULL,
  until        TEXT,
  note         TEXT NOT NULL DEFAULT '',
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (property_id)
);
/* Demandes d'emplacement : le paiement reste à brancher (agrégateur
   Mobile Money à évaluer en bac à sable) ; en attendant, l'approbation
   manuelle attribue l'emplacement et garde la trace de la décision. */
CREATE TABLE IF NOT EXISTS spotlight_requests (
  id            TEXT PRIMARY KEY,
  property_id   TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  contact       TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  slot          INTEGER NULL REFERENCES spotlight_slots(slot) ON DELETE SET NULL,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  decided_at    TEXT,
  decision_note TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_spotlight_requests_property ON spotlight_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_spotlight_requests_status ON spotlight_requests(status);
`;
const M004 = `
/* Un visuel de la médiathèque n’a ni fichier ni poids : les trois
   colonnes restent vides, aucune ligne existante n’est modifiée. */
ALTER TABLE property_photos ADD COLUMN filename    TEXT;
ALTER TABLE property_photos ADD COLUMN bytes       INTEGER;
ALTER TABLE property_photos ADD COLUMN uploaded_at TEXT;
`;

const M006 = `
/* Taxonomie des biens : « local » cède la place à « boutique » et
   « immeuble » (« chambre » arrive en plus). SQLite ne sait pas modifier
   une contrainte : on reconstruit la table. Les deux annonces d’immeuble
   amorcées sont retypées par leur identifiant ; tout autre « local »
   (ligne pilote saisie à la main) devient « boutique », le successeur
   le plus proche d’un local commercial. */
CREATE TABLE properties_new (
  id                  TEXT PRIMARY KEY,
  reference           TEXT NOT NULL UNIQUE,
  title               TEXT NOT NULL,
  type                TEXT NOT NULL
                      CHECK (type IN ('villa', 'appartement', 'studio', 'chambre', 'immeuble', 'terrain', 'boutique')),
  intent              TEXT NOT NULL CHECK (intent IN ('acheter', 'louer', 'sejour')),
  price               INTEGER NOT NULL DEFAULT 0,
  price_period        TEXT NOT NULL DEFAULT '',
  country             TEXT NOT NULL DEFAULT 'Bénin',
  department          TEXT NOT NULL DEFAULT '',
  commune             TEXT NOT NULL DEFAULT '',
  city                TEXT NOT NULL DEFAULT '',
  district            TEXT NOT NULL DEFAULT '',
  address             TEXT NOT NULL DEFAULT '',
  bedrooms            INTEGER NOT NULL DEFAULT 0,
  bathrooms           INTEGER NOT NULL DEFAULT 0,
  surface             INTEGER NOT NULL DEFAULT 0,
  rooms               INTEGER,
  floor               TEXT NOT NULL DEFAULT '',
  land_title          TEXT,
  min_nights          INTEGER,
  description         TEXT NOT NULL DEFAULT '',
  conditions          TEXT NOT NULL DEFAULT '',
  furnished           INTEGER NOT NULL DEFAULT 0,
  availability        TEXT NOT NULL DEFAULT 'disponible'
                      CHECK (availability IN ('disponible', 'indisponible', 'suspendu')),
  unavailable_until   TEXT,
  availability_note   TEXT NOT NULL DEFAULT '',
  publication_status  TEXT NOT NULL DEFAULT 'publie'
                      CHECK (publication_status IN ('brouillon', 'soumis', 'en-verification', 'publie', 'suspendu', 'loue', 'vendu', 'archive')),
  verification_status TEXT NOT NULL DEFAULT 'non-verifie'
                      CHECK (verification_status IN ('non-verifie', 'en-cours', 'verifie', 'refuse', 'suspendu')),
  verified_on         TEXT,
  owner_id            TEXT REFERENCES users(id) ON DELETE SET NULL,
  agency_id           TEXT REFERENCES agencies(id) ON DELETE SET NULL,
  main_photo_id       TEXT,
  latitude            REAL,
  longitude           REAL,
  published_at        TEXT,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
);
INSERT INTO properties_new
  (id, reference, title, type, intent, price, price_period, country, department, commune, city, district,
   address, bedrooms, bathrooms, surface, rooms, floor, land_title, min_nights, description, conditions,
   furnished, availability, unavailable_until, availability_note, publication_status, verification_status,
   verified_on, owner_id, agency_id, main_photo_id, latitude, longitude, published_at, created_at, updated_at)
SELECT
  id, reference, title,
  CASE
    WHEN type = 'local' AND id IN ('immeuble-bureaux-ganhi', 'bureaux-haie-vive') THEN 'immeuble'
    WHEN type = 'local' THEN 'boutique'
    ELSE type
  END,
  intent, price, price_period, country, department, commune, city, district,
  address, bedrooms, bathrooms, surface, rooms, floor, land_title, min_nights, description, conditions,
  furnished, availability, unavailable_until, availability_note, publication_status, verification_status,
  verified_on, owner_id, agency_id, main_photo_id, latitude, longitude, published_at, created_at, updated_at
FROM properties;
DROP TABLE properties;
ALTER TABLE properties_new RENAME TO properties;
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(publication_status, verification_status);
CREATE INDEX IF NOT EXISTS idx_properties_owner ON properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_properties_intent ON properties(intent, type);
`;


const M007 = `
/* Taxonomie des biens : « salle » (salle de fête) et « espace » (espace
   louable) rejoignent les types louables. SQLite ne sait pas modifier
   une contrainte : on reconstruit la table, sans retypage (toutes les
   valeurs existantes restent valides). */
CREATE TABLE properties_new (
  id                  TEXT PRIMARY KEY,
  reference           TEXT NOT NULL UNIQUE,
  title               TEXT NOT NULL,
  type                TEXT NOT NULL
                      CHECK (type IN ('villa', 'appartement', 'studio', 'chambre', 'immeuble', 'terrain', 'boutique', 'salle', 'espace')),
  intent              TEXT NOT NULL CHECK (intent IN ('acheter', 'louer', 'sejour')),
  price               INTEGER NOT NULL DEFAULT 0,
  price_period        TEXT NOT NULL DEFAULT '',
  country             TEXT NOT NULL DEFAULT 'Bénin',
  department          TEXT NOT NULL DEFAULT '',
  commune             TEXT NOT NULL DEFAULT '',
  city                TEXT NOT NULL DEFAULT '',
  district            TEXT NOT NULL DEFAULT '',
  address             TEXT NOT NULL DEFAULT '',
  bedrooms            INTEGER NOT NULL DEFAULT 0,
  bathrooms           INTEGER NOT NULL DEFAULT 0,
  surface             INTEGER NOT NULL DEFAULT 0,
  rooms               INTEGER,
  floor               TEXT NOT NULL DEFAULT '',
  land_title          TEXT,
  min_nights          INTEGER,
  description         TEXT NOT NULL DEFAULT '',
  conditions          TEXT NOT NULL DEFAULT '',
  furnished           INTEGER NOT NULL DEFAULT 0,
  availability        TEXT NOT NULL DEFAULT 'disponible'
                      CHECK (availability IN ('disponible', 'indisponible', 'suspendu')),
  unavailable_until   TEXT,
  availability_note   TEXT NOT NULL DEFAULT '',
  publication_status  TEXT NOT NULL DEFAULT 'publie'
                      CHECK (publication_status IN ('brouillon', 'soumis', 'en-verification', 'publie', 'suspendu', 'loue', 'vendu', 'archive')),
  verification_status TEXT NOT NULL DEFAULT 'non-verifie'
                      CHECK (verification_status IN ('non-verifie', 'en-cours', 'verifie', 'refuse', 'suspendu')),
  verified_on         TEXT,
  owner_id            TEXT REFERENCES users(id) ON DELETE SET NULL,
  agency_id           TEXT REFERENCES agencies(id) ON DELETE SET NULL,
  main_photo_id       TEXT,
  latitude            REAL,
  longitude           REAL,
  published_at        TEXT,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
);
INSERT INTO properties_new SELECT * FROM properties;
DROP TABLE properties;
ALTER TABLE properties_new RENAME TO properties;
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(publication_status, verification_status);
CREATE INDEX IF NOT EXISTS idx_properties_owner ON properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_properties_intent ON properties(intent, type);
`;

/* ------------------------------------------------------------------
   008 — PARCOURS DE LOCATION : réservation directe ou visite préalable
   ------------------------------------------------------------------
   Deux biens à louer ne suivent pas forcément le même parcours :

   • `properties.rental_mode = 'visite'` (défaut) : le client doit
     d’abord effectuer une visite, enregistrée « effectuée », avant de
     pouvoir déposer une demande de location ;
   • `properties.rental_mode = 'direct'` : le bien est explicitement
     déclaré réservable sans visite préalable — la réservation directe
     n’est jamais accordée par défaut.

   `rental_applications.desired_start/desired_end` portent la période
   souhaitée déclarée par le client lors d’une réservation directe. Ils
   restent NULL pour les demandes déposées après visite : l’origine du
   dossier se déduit donc sans nouveau statut (`visit_id IS NULL` =
   réservation directe).

   L’espace événementiel de Cadjèhoun (tarif journalier, usage
   ponctuel) est le premier bien déclaré éligible à la réservation
   directe. Les bases neuves reçoivent la même valeur via l’amorçage.
   ------------------------------------------------------------------ */

const M008 = `
ALTER TABLE properties ADD COLUMN rental_mode TEXT NOT NULL DEFAULT 'visite'
  CHECK (rental_mode IN ('visite', 'direct'));
ALTER TABLE rental_applications ADD COLUMN desired_start TEXT;
ALTER TABLE rental_applications ADD COLUMN desired_end TEXT;
UPDATE properties SET rental_mode = 'direct' WHERE id = 'espace-evenementiel-cadjehoun';
`;

export const MIGRATIONS: Migration[] = [
  {
    id: "001",
    name: "socle-identite-biens-mandats-visites-journal",
    sql: M001,
  },
  {
    id: "002",
    name: "candidatures-motif-et-auteur",
    sql: M002,
  },
  {
    id: "003",
    name: "messagerie-fils-de-discussion",
    sql: M003,
  },
  {
    id: "004",
    name: "photos-televersees-nom-poids-date",
    sql: M004,
  },
  {
    id: "005",
    name: "vitrine-payante-emplacements-demandes",
    sql: M005,
  },
  {
    id: "006",
    name: "taxonomie-boutique-immeuble-chambre",
    sql: M006,
  },
  {
    id: "007",
    name: "taxonomie-salle-espace",
    sql: M007,
  },
  {
    id: "008",
    name: "parcours-location-reservation-directe",
    sql: M008,
  },
];
