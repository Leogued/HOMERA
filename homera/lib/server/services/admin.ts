import type { Db } from "../db/client";
import { newId, nowIso, queryAll, queryOne } from "../db/client";
import { canModerate, isSuperAdminRole, loadUserContext, type ServerRole, type UserContext } from "../authz";
import { writeAudit } from "../audit";
import { notify } from "../notifications";
import type { ServiceResult } from "./accounts";
import type { AuditEntry } from "../audit";

/* ==================================================================
   HOMERA — TABLEAU DE BORD ADMINISTRATIF
   ------------------------------------------------------------------
   Chaque chiffre vient d’une requête : aucun indicateur n’est décoratif.
   Les compteurs sont accompagnés de ce qui permet d’agir : les dossiers
   en retard, les mandats à instruire, les visites en conflit, les
   signalements ouverts.
   ================================================================== */

const OVERDUE_DAYS = 7;

function count(db: Db, sql: string, params: unknown[] = []): number {
  return queryOne<{ count: number }>(sql, params)?.count ?? 0;
}

export type AdminOverview = {
  properties: {
    total: number;
    publie: number;
    brouillon: number;
    soumis: number;
    enVerification: number;
    suspendu: number;
    loue: number;
    vendu: number;
    archive: number;
    verifies: number;
  };
  verification: {
    aExaminer: number;
    enCours: number;
    incomplets: number;
    refuses: number;
    enRetard: number;
    delaiMoyenJours: number;
    controlesSurPlace: number;
  };
  accounts: {
    total: number;
    clients: number;
    proprietaires: number;
    agents: number;
    admins: number;
    nonVerifies: number;
  };
  mandates: {
    enAttente: number;
    actifs: number;
    expires: number;
    revoques: number;
    contestes: number;
  };
  visits: {
    demandees: number;
    confirmees: number;
    effectuees: number;
    annulees: number;
    absences: number;
    conflits: number;
  };
  rentals: {
    demandes: number;
    acceptees: number;
    contratsSignes: number;
  };
  signals: {
    ouverts: number;
    notificationsNonLues: number;
    erreursRecentes: number;
  };
};

export function adminOverview(db: Db): AdminOverview {
  const iso = nowIso();
  const retardIso = new Date(Date.now() - OVERDUE_DAYS * 86_400_000).toISOString();
  const verificationAges = queryAll<{ created_at: string; status: string }>(
    "SELECT created_at, status FROM verifications WHERE status IN ('a-examiner', 'en-cours', 'incomplet')",
  );
  const ages = verificationAges.map((row) => (Date.now() - new Date(row.created_at).getTime()) / 86_400_000);
  const delaiMoyen = ages.length ? ages.reduce((sum, value) => sum + value, 0) / ages.length : 0;

  return {
    properties: {
      total: count(db, "SELECT COUNT(*) AS count FROM properties"),
      publie: count(db, "SELECT COUNT(*) AS count FROM properties WHERE publication_status = 'publie'"),
      brouillon: count(db, "SELECT COUNT(*) AS count FROM properties WHERE publication_status = 'brouillon'"),
      soumis: count(db, "SELECT COUNT(*) AS count FROM properties WHERE publication_status = 'soumis'"),
      enVerification: count(db, "SELECT COUNT(*) AS count FROM properties WHERE verification_status = 'en-cours'"),
      suspendu: count(db, "SELECT COUNT(*) AS count FROM properties WHERE publication_status = 'suspendu'"),
      loue: count(db, "SELECT COUNT(*) AS count FROM properties WHERE publication_status = 'loue'"),
      vendu: count(db, "SELECT COUNT(*) AS count FROM properties WHERE publication_status = 'vendu'"),
      archive: count(db, "SELECT COUNT(*) AS count FROM properties WHERE publication_status = 'archive'"),
      verifies: count(db, "SELECT COUNT(*) AS count FROM properties WHERE verification_status = 'verifie'"),
    },
    verification: {
      aExaminer: count(db, "SELECT COUNT(*) AS count FROM verifications WHERE status = 'a-examiner'"),
      enCours: count(db, "SELECT COUNT(*) AS count FROM verifications WHERE status = 'en-cours'"),
      incomplets: count(db, "SELECT COUNT(*) AS count FROM verifications WHERE status = 'incomplet'"),
      refuses: count(db, "SELECT COUNT(*) AS count FROM verifications WHERE status = 'refuse'"),
      enRetard: count(
        db,
        "SELECT COUNT(*) AS count FROM verifications WHERE status IN ('a-examiner', 'en-cours', 'incomplet') AND created_at < ?",
        [retardIso],
      ),
      delaiMoyenJours: Math.round(delaiMoyen * 10) / 10,
      controlesSurPlace: count(db, "SELECT COUNT(*) AS count FROM verifications WHERE onsite_done = 1"),
    },
    accounts: {
      total: count(db, "SELECT COUNT(*) AS count FROM users WHERE status <> 'supprime'"),
      clients: count(db, "SELECT COUNT(DISTINCT user_id) AS count FROM user_roles WHERE role = 'client'"),
      proprietaires: count(db, "SELECT COUNT(DISTINCT user_id) AS count FROM user_roles WHERE role = 'proprietaire'"),
      agents: count(db, "SELECT COUNT(DISTINCT user_id) AS count FROM user_roles WHERE role = 'agent'"),
      admins: count(db, "SELECT COUNT(DISTINCT user_id) AS count FROM user_roles WHERE role IN ('admin', 'superadmin')"),
      nonVerifies: count(db, "SELECT COUNT(*) AS count FROM users WHERE email_verified = 0 AND status <> 'supprime'"),
    },
    mandates: {
      enAttente: count(db, "SELECT COUNT(*) AS count FROM authorizations WHERE status IN ('en-attente', 'invite')"),
      actifs: count(db, "SELECT COUNT(*) AS count FROM authorizations WHERE status = 'active' AND expires_at >= ?", [iso]),
      expires: count(db, "SELECT COUNT(*) AS count FROM authorizations WHERE status = 'expiree' OR (status = 'active' AND expires_at < ?)", [iso]),
      revoques: count(db, "SELECT COUNT(*) AS count FROM authorizations WHERE status = 'revoquee'"),
      contestes: count(db, "SELECT COUNT(*) AS count FROM authorizations WHERE status = 'contestee'"),
    },
    visits: {
      demandees: count(db, "SELECT COUNT(*) AS count FROM visits WHERE status = 'demandee'"),
      confirmees: count(db, "SELECT COUNT(*) AS count FROM visits WHERE status = 'confirmee'"),
      effectuees: count(db, "SELECT COUNT(*) AS count FROM visits WHERE status = 'effectuee'"),
      annulees: count(db, "SELECT COUNT(*) AS count FROM visits WHERE status = 'annulee'"),
      absences: count(db, "SELECT COUNT(*) AS count FROM visits WHERE status = 'absence'"),
      conflits: count(
        db,
        `SELECT COUNT(*) AS count FROM (
           SELECT property_id, requested_date, requested_time, COUNT(*) AS total
           FROM visits
           WHERE status IN ('demandee', 'confirmee', 'reprogrammee')
           GROUP BY property_id, requested_date, requested_time
           HAVING total > 1
         )`,
      ),
    },
    rentals: {
      demandes: count(db, "SELECT COUNT(*) AS count FROM rental_applications"),
      acceptees: count(db, "SELECT COUNT(*) AS count FROM rental_applications WHERE status = 'acceptee'"),
      contratsSignes: count(db, "SELECT COUNT(*) AS count FROM contracts WHERE status = 'signe'"),
    },
    signals: {
      ouverts: count(db, "SELECT COUNT(*) AS count FROM property_reports WHERE status IN ('ouvert', 'en-cours')"),
      notificationsNonLues: count(db, "SELECT COUNT(*) AS count FROM notifications WHERE read_at IS NULL"),
      erreursRecentes: count(
        db,
        "SELECT COUNT(*) AS count FROM audit_log WHERE action LIKE '%.refusee' AND created_at >= ?",
        [new Date(Date.now() - 7 * 86_400_000).toISOString()],
      ),
    },
  };
}

/* ------------------------------------------------------------------
   COMPTES
   ------------------------------------------------------------------ */

export type AdminUserView = {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  roles: string[];
  emailVerified: boolean;
  status: string;
  createdAt: string;
  lastLoginAt: string | null;
  properties: number;
  mandates: number;
};

export function listUsers(db: Db, filter: { q?: string; role?: string; status?: string } = {}): AdminUserView[] {
  const clauses: string[] = ["u.status <> 'supprime'"];
  const params: unknown[] = [];
  if (filter.q) {
    clauses.push("(lower(u.email) LIKE ? OR lower(u.prenom) LIKE ? OR lower(u.nom) LIKE ? OR lower(u.id) LIKE ?)");
    const needle = `%${filter.q.toLowerCase()}%`;
    params.push(needle, needle, needle, needle);
  }
  if (filter.role) {
    clauses.push("EXISTS (SELECT 1 FROM user_roles r WHERE r.user_id = u.id AND r.role = ?)");
    params.push(filter.role);
  }
  if (filter.status) {
    clauses.push("u.status = ?");
    params.push(filter.status);
  }
  const rows = queryAll<{
    id: string;
    prenom: string;
    nom: string;
    email: string;
    telephone: string;
    email_verified: number;
    status: string;
    created_at: string;
    last_login_at: string | null;
  }>(
    `SELECT u.id, u.prenom, u.nom, u.email, u.telephone, u.email_verified, u.status, u.created_at, u.last_login_at
     FROM users u WHERE ${clauses.join(" AND ")} ORDER BY u.created_at DESC LIMIT 500`,
    params,
  );
  return rows.map((row) => ({
    id: row.id,
    prenom: row.prenom,
    nom: row.nom,
    email: row.email,
    telephone: row.telephone,
    roles: queryAll<{ role: string }>("SELECT role FROM user_roles WHERE user_id = ?", [row.id]).map((entry) => entry.role),
    emailVerified: row.email_verified === 1,
    status: row.status,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
    properties: count(db, "SELECT COUNT(*) AS count FROM properties WHERE owner_id = ?", [row.id]),
    mandates: count(db, "SELECT COUNT(*) AS count FROM authorizations WHERE agent_id = ?", [row.id]),
  }));
}

export function setUserStatus(
  db: Db,
  actor: UserContext,
  userId: string,
  status: "actif" | "suspendu",
  reason: string,
  meta: { ip?: string } = {},
): ServiceResult<{ userId: string; status: string }> {
  if (!canModerate(actor)) return { ok: false, code: "permission", message: "Action réservée à l’administration." };
  const target = loadUserContext(db, userId);
  if (!target) return { ok: false, message: "Compte introuvable." };
  if ((target.roles.includes("admin") || target.roles.includes("superadmin")) && !isSuperAdminRole(actor.roles)) {
    return { ok: false, code: "permission", message: "Seul un super-administrateur peut suspendre un administrateur." };
  }
  if (userId === actor.id) return { ok: false, message: "Vous ne pouvez pas suspendre votre propre compte." };
  if (!reason.trim()) return { ok: false, message: "Indiquez le motif : il est conservé dans le journal." };
  db.transaction(() => {
    db.prepare("UPDATE users SET status = ?, updated_at = ? WHERE id = ?").run(status, nowIso(), userId);
    writeAudit(db, {
      actorId: actor.id,
      actorLabel: actor.email,
      action: status === "suspendu" ? "admin.compte.suspendu" : "admin.compte.reactive",
      entityType: "utilisateur",
      entityId: userId,
      detail: { motif: reason },
      ip: meta.ip,
    });
    notify(db, {
      userIds: [userId],
      type: "systeme",
      title: status === "suspendu" ? "Compte suspendu" : "Compte rétabli",
      body: reason,
      link: "/connexion",
      entityType: "utilisateur",
      entityId: userId,
    });
  })();
  return { ok: true, data: { userId, status } };
}

export function listRoles(db: Db): ServerRole[] {
  return db
    .prepare<[], { role: ServerRole }>("SELECT DISTINCT role FROM user_roles ORDER BY role")
    .all()
    .map((row) => row.role);
}

/* ------------------------------------------------------------------
   SIGNALEMENTS
   ------------------------------------------------------------------ */

export function createReport(
  db: Db,
  actor: UserContext | null,
  input: { propertyId: string; reason: string; detail?: string },
  meta: { ip?: string } = {},
): ServiceResult<{ id: string }> {
  const exists = queryOne<{ id: string }>("SELECT id FROM properties WHERE id = ?", [input.propertyId]);
  if (!exists) return { ok: false, message: "Ce bien n’existe pas ou a été retiré.", code: "introuvable" };
  const id = newId("SIG");
  db.transaction(() => {
    db.prepare(
      "INSERT INTO property_reports (id, property_id, reporter_id, reason, detail, status, created_at) VALUES (?, ?, ?, ?, ?, 'ouvert', ?)",
    ).run(id, input.propertyId, actor?.id ?? null, input.reason, input.detail ?? "", nowIso());
    writeAudit(db, {
      actorId: actor?.id ?? null,
      actorLabel: actor?.email ?? "visiteur",
      action: "signalement.cree",
      entityType: "bien",
      entityId: input.propertyId,
      detail: { raison: input.reason },
      ip: meta.ip,
    });
    const admins = queryAll<{ user_id: string }>(
      "SELECT user_id FROM user_roles WHERE role IN ('admin', 'superadmin')",
    ).map((row) => row.user_id);
    notify(db, {
      userIds: admins,
      type: "signalement",
      title: "Annonce signalée",
      body: `${input.reason} · ${input.detail ?? ""}`.trim(),
      link: "/admin/signalements",
      entityType: "bien",
      entityId: input.propertyId,
    });
  })();
  return { ok: true, data: { id } };
}

export function listReports(db: Db, status?: string) {
  const where = status ? "WHERE status = ?" : "";
  return queryAll<{
    id: string;
    property_id: string;
    reporter_id: string | null;
    reason: string;
    detail: string;
    status: string;
    created_at: string;
  }>(`SELECT * FROM property_reports ${where} ORDER BY created_at DESC`, status ? [status] : []);
}

/**
 * Clore ou rejeter un signalement.
 *
 * Le signalement reste en base : on ne supprime jamais une alerte, on
 * la résout. Le statut et l’auteur de la décision sont tracés.
 */
export function setReportStatus(
  db: Db,
  actor: UserContext,
  reportId: string,
  status: "en-cours" | "clos" | "rejete",
  meta: { ip?: string } = {},
): ServiceResult<{ id: string }> {
  const row = queryOne<{ id: string; property_id: string; status: string }>("SELECT * FROM property_reports WHERE id = ?", [reportId]);
  if (!row) return { ok: false, message: "Signalement introuvable." };
  if (row.status === status) return { ok: false, message: "Ce signalement est déjà dans cet état." };
  db.transaction(() => {
    db.prepare("UPDATE property_reports SET status = ? WHERE id = ?").run(status, reportId);
    writeAudit(db, {
      actorId: actor.id,
      actorLabel: actor.email,
      action: `signalement.${status}`,
      entityType: "signalement",
      entityId: reportId,
      detail: { depuis: row.status, bien: row.property_id },
      ip: meta.ip ?? "",
    });
  })();
  return { ok: true, data: { id: reportId } };
}

export function recentAudit(db: Db, limit = 40): AuditEntry[] {
  return queryAll<AuditEntry>("SELECT * FROM audit_log ORDER BY created_at DESC, rowid DESC LIMIT ?", [limit]);
}
