import type { Db } from "../db/client";
import { newId, nowIso, queryAll, queryOne } from "../db/client";
import type { UserContext } from "../authz";
import { isAdminRole } from "../authz";
import { writeAudit } from "../audit";
import { notify } from "../notifications";
import type { ServiceResult } from "./accounts";

/* ==================================================================
   HOMERA — CONTRATS DE LOCATION
   ------------------------------------------------------------------
   Un contrat naît d’une candidature **acceptée** : pas d’un bouton
   « générer un contrat » posé sur n’importe quoi. Seuls le
   propriétaire et l’agent mandaté (portée « location ») peuvent le
   rédiger ; seul le locataire peut le signer ; chaque étape est
   horodatée et journalisée.

   Ce que HOMERA ne fait pas encore — et ne prétend pas faire : la
   signature électronique qualifiée (certificat, identité vérifiée par
   un tiers de confiance). La signature enregistrée ici est une
   **signature électronique simple** : le nom saisi, la date, l’heure,
   l’adresse IP et la trace d’audit. L’écran le dit ; il ne laisse pas
   croire à une valeur probante supérieure.
   ================================================================== */

export type ContractStatus = "brouillon" | "envoye" | "a-signer" | "signe" | "annule";

export type ContractRow = {
  id: string;
  reference: string;
  property_id: string;
  client_id: string;
  owner_id: string | null;
  application_id: string | null;
  status: ContractStatus;
  rent_amount: number;
  deposit_amount: number;
  start_date: string;
  end_date: string;
  signed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ContractView = {
  id: string;
  reference: string;
  propertyId: string;
  propertyTitle: string;
  propertyReference: string;
  propertyCity: string;
  clientId: string;
  clientName: string;
  ownerId: string | null;
  applicationId: string | null;
  status: ContractStatus;
  rent: number;
  deposit: number;
  startDate: string;
  endDate: string;
  duration: string;
  signedAt: string | null;
  createdAt: string;
  canSign: boolean;
  canCancel: boolean;
};

const MONTHS = 12;

function nameOf(db: Db, userId: string | null): string {
  if (!userId) return "Interlocuteur HOMERA";
  const row = queryOne<{ prenom: string | null; nom: string | null; email: string }>(
    "SELECT prenom, nom, email FROM users WHERE id = ?",
    [userId],
  );
  if (!row) return "Ancien interlocuteur";
  return `${row.prenom ?? ""} ${row.nom ?? ""}`.trim() || row.email;
}

function nextReference(): string {
  const count = queryOne<{ count: number }>("SELECT COUNT(*) AS count FROM contracts")?.count ?? 0;
  return `CTR-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
}

function toView(db: Db, row: ContractRow, actor: UserContext): ContractView {
  const property = queryOne<{ title: string; reference: string | null; city: string }>(
    "SELECT title, reference, city FROM properties WHERE id = ?",
    [row.property_id],
  );
  const months = Math.max(1, Math.round((new Date(row.end_date).getTime() - new Date(row.start_date).getTime()) / 2_592_000_000) || MONTHS);
  return {
    id: row.id,
    reference: row.reference,
    propertyId: row.property_id,
    propertyTitle: property?.title ?? "Bien retiré du catalogue",
    propertyReference: property?.reference ?? "",
    propertyCity: property?.city ?? "",
    clientId: row.client_id,
    clientName: nameOf(db, row.client_id),
    ownerId: row.owner_id,
    applicationId: row.application_id,
    status: row.status,
    rent: row.rent_amount,
    deposit: row.deposit_amount,
    startDate: row.start_date,
    endDate: row.end_date,
    duration: months >= MONTHS ? `${Math.round(months / MONTHS)} an(s)` : `${months} mois`,
    signedAt: row.signed_at,
    createdAt: row.created_at,
    canSign: row.client_id === actor.id && (row.status === "a-signer" || row.status === "envoye"),
    canCancel:
      (row.client_id === actor.id || row.owner_id === actor.id || isAdminRole(actor.roles)) &&
      row.status !== "signe" &&
      row.status !== "annule",
  };
}

/* ------------------------------------------------------------------
   RÉDACTION
   ------------------------------------------------------------------ */

export function createContractFromApplication(
  db: Db,
  actor: UserContext,
  applicationId: string,
  input: { startDate: string; months?: number; depositMonths?: number } = { startDate: "" },
  meta: { ip?: string } = {},
): ServiceResult<{ id: string; reference: string }> {
  const application = queryOne<{
    id: string;
    property_id: string;
    client_id: string;
    property_owner_id: string;
    status: string;
    monthly_income: number;
  }>(
    `SELECT a.id, a.property_id, a.client_id, p.owner_id AS property_owner_id, a.status, a.monthly_income
       FROM rental_applications a JOIN properties p ON p.id = a.property_id WHERE a.id = ?`,
    [applicationId],
  );
  if (!application) return { ok: false, message: "Cette candidature n’existe pas.", code: "introuvable" };
  if (application.status !== "acceptee") {
    return { ok: false, message: "Le contrat ne peut être rédigé qu’après l’acceptation de la candidature." };
  }

  // Droits : le propriétaire, ou un agent mandaté « location » sur ce bien.
  const mandate = queryOne<{ agent_id: string | null; scope: string }>(
    "SELECT agent_id, scope FROM authorizations WHERE property_id = ? AND status = 'active' AND expires_at >= ? ORDER BY updated_at DESC LIMIT 1",
    [application.property_id, nowIso()],
  );
  const isOwner = application.property_owner_id === actor.id;
  const isMandated =
    mandate?.agent_id === actor.id && (mandate.scope.includes("location") || mandate.scope.includes("gestion"));
  if (!isOwner && !isMandated && !isAdminRole(actor.roles)) {
    return { ok: false, message: "Vous n’êtes pas habilité à rédiger ce contrat.", code: "permission" };
  }

  const property = queryOne<{ price: number; price_period: string }>(
    "SELECT price, price_period FROM properties WHERE id = ?",
    [application.property_id],
  );
  if (!property) return { ok: false, message: "Le bien n’existe plus.", code: "introuvable" };

  const start = /^\d{4}-\d{2}-\d{2}$/.test(input.startDate)
    ? input.startDate
    : new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
  const months = Math.min(Math.max(Math.round(input.months ?? MONTHS), 1), 120);
  const depositMonths = Math.min(Math.max(Math.round(input.depositMonths ?? 2), 0), 12);
  const end = new Date(new Date(start).getTime() + months * 30 * 86_400_000).toISOString().slice(0, 10);

  const existing = queryOne<{ id: string; reference: string }>(
    "SELECT id, reference FROM contracts WHERE application_id = ? AND status <> 'annule'",
    [applicationId],
  );
  if (existing) return { ok: true, data: { id: existing.id, reference: existing.reference } };

  const iso = nowIso();
  const id = newId("CTR");
  const reference = nextReference();

  db.transaction(() => {
    db.prepare(
      `INSERT INTO contracts (id, reference, property_id, client_id, owner_id, application_id, status,
          rent_amount, deposit_amount, start_date, end_date, signed_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'a-signer', ?, ?, ?, ?, NULL, ?, ?)`,
    ).run(
      id,
      reference,
      application.property_id,
      application.client_id,
      application.property_owner_id,
      application.id,
      property.price,
      property.price * depositMonths,
      start,
      end,
      iso,
      iso,
    );
    writeAudit(db, {
      actorId: actor.id,
      actorLabel: actor.email,
      action: "contrat.redige",
      entityType: "contrat",
      entityId: id,
      detail: { reference, candidature: applicationId },
      ip: meta.ip,
    });
    notify(db, {
      userIds: [application.client_id],
      type: "contrat",
      title: "Contrat à signer",
      body: `${reference} · le propriétaire a transmis votre contrat de location.`,
      link: "/client/contrats",
      entityType: "contrat",
      entityId: id,
    });
  })();

  return { ok: true, data: { id, reference } };
}

/* ------------------------------------------------------------------
   LECTURE
   ------------------------------------------------------------------ */

export function listContracts(db: Db, actor: UserContext): ContractView[] {
  /* Un agent mandaté suit les contrats des biens qu’il gère : son mandat
     est la seule source du droit de lecture, jamais le fait de connaître
     l’identifiant du contrat. */
  const mandatedProperties = db
    .prepare<[string], { property_id: string }>(
      "SELECT property_id FROM authorizations WHERE agent_id = ? AND status = 'active'",
    )
    .all(actor.id)
    .map((row) => row.property_id);

  const rows = isAdminRole(actor.roles)
    ? queryAll<ContractRow>("SELECT * FROM contracts ORDER BY created_at DESC")
    : queryAll<ContractRow>(
        `SELECT * FROM contracts
         WHERE client_id = ? OR owner_id = ?${
           mandatedProperties.length
             ? ` OR property_id IN (${mandatedProperties.map(() => "?").join(", ")})`
             : ""
         }
         ORDER BY created_at DESC`,
        [actor.id, actor.id, ...mandatedProperties],
      );
  return rows.map((row) => toView(db, row, actor));
}

export function getContract(db: Db, actor: UserContext, contractId: string): ServiceResult<ContractView> {
  const row = queryOne<ContractRow>("SELECT * FROM contracts WHERE id = ? OR reference = ?", [contractId, contractId]);
  if (!row) return { ok: false, message: "Contrat introuvable.", code: "introuvable" };
  const allowed =
    row.client_id === actor.id || row.owner_id === actor.id || isAdminRole(actor.roles);
  if (!allowed) return { ok: false, message: "Ce contrat ne vous concerne pas.", code: "permission" };
  return { ok: true, data: toView(db, row, actor) };
}

/* ------------------------------------------------------------------
   SIGNATURE ET ANNULATION
   ------------------------------------------------------------------ */

export function signContract(
  db: Db,
  actor: UserContext,
  contractId: string,
  fullName: string,
  meta: { ip?: string } = {},
): ServiceResult<{ signedAt: string }> {
  const row = queryOne<ContractRow>("SELECT * FROM contracts WHERE id = ? OR reference = ?", [contractId, contractId]);
  if (!row) return { ok: false, message: "Contrat introuvable.", code: "introuvable" };
  if (row.client_id !== actor.id) {
    return { ok: false, message: "Seul le locataire désigné peut signer ce contrat.", code: "permission" };
  }
  if (row.status === "signe") return { ok: false, message: "Ce contrat est déjà signé." };
  if (row.status === "annule") return { ok: false, message: "Ce contrat a été annulé." };
  const declared = (fullName ?? "").trim();
  if (declared.length < 3) {
    return { ok: false, message: "Écrivez votre nom complet tel qu’il figurera sur le contrat." };
  }

  const iso = nowIso();
  db.transaction(() => {
    db.prepare("UPDATE contracts SET status = 'signe', signed_at = ?, updated_at = ? WHERE id = ?").run(iso, iso, row.id);
    writeAudit(db, {
      actorId: actor.id,
      actorLabel: actor.email,
      action: "contrat.signe",
      entityType: "contrat",
      entityId: row.id,
      // Signature électronique simple : le nom déclaré et l’horodatage font foi
      // dans le journal ; aucune valeur probante supérieure n’est revendiquée.
      detail: { nomDeclare: declared, reference: row.reference },
      ip: meta.ip,
    });
    notify(db, {
      userIds: [row.owner_id ?? ""],
      type: "contrat",
      title: "Contrat signé",
      body: `${row.reference} · ${declared} a signé le contrat de location.`,
      link: "/proprietaire/demandes",
      entityType: "contrat",
      entityId: row.id,
    });
  })();

  return { ok: true, data: { signedAt: iso } };
}

export function cancelContract(
  db: Db,
  actor: UserContext,
  contractId: string,
  reason: string,
  meta: { ip?: string } = {},
): ServiceResult<{ cancelled: true }> {
  const row = queryOne<ContractRow>("SELECT * FROM contracts WHERE id = ? OR reference = ?", [contractId, contractId]);
  if (!row) return { ok: false, message: "Contrat introuvable.", code: "introuvable" };
  const allowed = row.client_id === actor.id || row.owner_id === actor.id || isAdminRole(actor.roles);
  if (!allowed) return { ok: false, message: "Ce contrat ne vous concerne pas.", code: "permission" };
  if (row.status === "signe") return { ok: false, message: "Un contrat signé ne s’annule plus ici : passez par une résiliation." };
  const motive = (reason ?? "").trim();
  if (motive.length < 5) {
    return { ok: false, message: "Indiquez le motif de l’annulation : il est conservé et transmis." };
  }

  const iso = nowIso();
  db.transaction(() => {
    db.prepare("UPDATE contracts SET status = 'annule', updated_at = ? WHERE id = ?").run(iso, row.id);
    writeAudit(db, {
      actorId: actor.id,
      actorLabel: actor.email,
      action: "contrat.annule",
      entityType: "contrat",
      entityId: row.id,
      detail: { motif: motive, reference: row.reference },
      ip: meta.ip,
    });
    notify(db, {
      userIds: [row.client_id, row.owner_id ?? ""],
      type: "contrat",
      title: "Contrat annulé",
      body: `${row.reference} · ${motive}`,
      link: "/client/contrats",
      entityType: "contrat",
      entityId: row.id,
    });
  })();

  return { ok: true, data: { cancelled: true } };
}
