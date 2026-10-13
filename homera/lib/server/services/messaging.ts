import type { Db } from "../db/client";
import { newId, nowIso, queryAll, queryOne } from "../db/client";
import type { UserContext } from "../authz";
import { isAdminRole } from "../authz";
import { writeAudit } from "../audit";
import { notify } from "../notifications";
import type { ServiceResult } from "./accounts";
import { PROPERTY_COLUMNS, type PropertyRow } from "./properties";

/* ==================================================================
   HOMERA — MESSAGERIE INTERNE
   ------------------------------------------------------------------
   Trois règles tiennent tout le service :

   1. **On ne parle qu’à quelqu’un qu’un lien réel autorise.** Un client
      peut écrire au propriétaire d’un bien publié (et à l’agent qui
      détient un mandat actif). Un propriétaire ou son agent mandaté
      peut écrire au client d’une visite ou d’une candidature sur leur
      bien. Rien d’autre : pas de message à un inconnu, pas d’adresse
      devinée.

   2. **Un fil n’est visible que par ses participants.** L’administration
      ne lit pas les échanges privés : elle reçoit ses propres alertes,
      qui sont un autre objet (voir `notifications`).

   3. **Le « non lu » est personnel.** Chaque participant porte son
      curseur de lecture ; « 2 non lus » veut dire « 2 messages que vous
      n’avez pas ouverts », pas « 2 messages envoyés ».

   La messagerie est volontairement distincte des notifications système
   (décisions, rappels) et des alertes d’administration (signalements) :
   trois natures, trois endroits, aucune confusion pour l’utilisateur.
   ================================================================== */

export type ConversationSummary = {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertyReference: string;
  subject: string;
  visitId: string | null;
  lastMessageAt: string;
  lastMessagePreview: string;
  unreadCount: number;
  participants: { id: string; name: string; role: string }[];
};

export type ConversationMessage = {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
  mine: boolean;
};

export type ConversationDetail = ConversationSummary & { messages: ConversationMessage[] };

type ConversationRow = {
  id: string;
  property_id: string;
  visit_id: string | null;
  subject: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
};

const MIN_BODY = 4;
const MAX_BODY = 4000;

function nameOf(db: Db, userId: string): string {
  const row = queryOne<{ prenom: string | null; nom: string | null; email: string }>(
    "SELECT prenom, nom, email FROM users WHERE id = ?",
    [userId],
  );
  if (!row) return "Ancien interlocuteur";
  const full = `${row.prenom ?? ""} ${row.nom ?? ""}`.trim();
  return full || row.email;
}

function isParticipant(db: Db, conversationId: string, userId: string): boolean {
  return Boolean(
    queryOne<{ user_id: string }>("SELECT user_id FROM conversation_participants WHERE conversation_id = ? AND user_id = ?", [
      conversationId,
      userId,
    ]),
  );
}

/** Les interlocuteurs légitimes d’un bien : le propriétaire, l’agent mandaté actif, et l’administration jamais. */
function propertyContacts(db: Db, property: PropertyRow): string[] {
  const agent = queryOne<{ agent_id: string | null }>(
    "SELECT agent_id FROM authorizations WHERE property_id = ? AND status = 'active' AND expires_at >= ? ORDER BY updated_at DESC LIMIT 1",
    [property.id, nowIso()],
  );
  return [property.owner_id, agent?.agent_id ?? null].filter((value): value is string => Boolean(value));
}

/* ------------------------------------------------------------------
   OUVERTURE D’UNE CONVERSATION
   ------------------------------------------------------------------ */

export function openConversation(
  db: Db,
  actor: UserContext,
  input: { propertyId: string; visitId?: string | null; subject?: string; body: string },
  meta: { ip?: string } = {},
): ServiceResult<{ id: string }> {
  const body = (input.body ?? "").trim();
  if (body.length < MIN_BODY) {
    return { ok: false, message: "Votre message est trop court pour être envoyé." };
  }
  if (body.length > MAX_BODY) {
    return { ok: false, message: `Votre message dépasse ${MAX_BODY} caractères.` };
  }

  const property = queryOne<PropertyRow>(`${PROPERTY_COLUMNS} WHERE id = ? OR reference = ?`, [
    input.propertyId,
    input.propertyId,
  ]);
  if (!property) return { ok: false, message: "Ce bien n’existe pas ou a été retiré.", code: "introuvable" };

  const contacts = propertyContacts(db, property).filter((id) => id !== actor.id);
  if (contacts.length === 0) {
    // Cas le plus fréquent : le propriétaire qui s’écrit à lui-même.
    return { ok: false, message: "Vous êtes le seul interlocuteur de ce bien : il n’y a personne à contacter." };
  }

  // Qui a le droit d’ouvrir la discussion ? Le propriétaire, l’agent mandaté
  // actif, ou tout visiteur dès lors que le bien est publié. L’administration
  // n’entre pas dans les échanges privés : elle dispose de ses propres outils.
  const mandate = queryOne<{ agent_id: string | null }>(
    "SELECT agent_id FROM authorizations WHERE property_id = ? AND status = 'active' AND expires_at >= ? ORDER BY updated_at DESC LIMIT 1",
    [property.id, nowIso()],
  );
  const isOwner = property.owner_id === actor.id;
  const isMandatedAgent = Boolean(mandate?.agent_id && mandate.agent_id === actor.id);
  if (isAdminRole(actor.roles)) {
    return { ok: false, message: "L’administration n’ouvre pas de conversation privée : elle utilise ses outils de contrôle.", code: "permission" };
  }
  if (!isOwner && !isMandatedAgent && property.publication_status !== "publie") {
    return { ok: false, message: "Ce bien n’est pas ouvert aux échanges.", code: "permission" };
  }

  // Une visite ne peut servir de contexte que si l’acteur y participe.
  let visitId: string | null = null;
  if (input.visitId) {
    const visit = queryOne<{ id: string; client_id: string; owner_id: string | null; agent_id: string | null }>(
      "SELECT id, client_id, owner_id, agent_id FROM visits WHERE id = ?",
      [input.visitId],
    );
    if (visit && [visit.client_id, visit.owner_id, visit.agent_id].includes(actor.id)) visitId = visit.id;
  }

  const iso = nowIso();
  const conversationId = newId("CONV");
  const messageId = newId("MSG");

  db.transaction(() => {
    db.prepare(
      `INSERT INTO conversations (id, property_id, visit_id, subject, created_by, created_at, updated_at, last_message_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      conversationId,
      property.id,
      visitId,
      (input.subject ?? "").trim().slice(0, 140),
      actor.id,
      iso,
      iso,
      iso,
    );
    const join = db.prepare(
      "INSERT OR IGNORE INTO conversation_participants (conversation_id, user_id, role, joined_at, last_read_at) VALUES (?, ?, ?, ?, ?)",
    );
    join.run(conversationId, actor.id, isOwner ? "proprietaire" : isMandatedAgent ? "agent" : "client", iso, iso);
    for (const contactId of contacts) {
      const role = contactId === property.owner_id ? "proprietaire" : "agent";
      join.run(conversationId, contactId, role, iso, null);
    }
    db.prepare(
      "INSERT INTO messages (id, conversation_id, author_id, body, created_at) VALUES (?, ?, ?, ?, ?)",
    ).run(messageId, conversationId, actor.id, body, iso);
    writeAudit(db, {
      actorId: actor.id,
      actorLabel: actor.email,
      action: "message.conversation.ouverte",
      entityType: "bien",
      entityId: property.id,
      detail: { conversation: conversationId, destinataires: contacts.length },
      ip: meta.ip,
    });
    notify(db, {
      userIds: contacts,
      type: "message",
      title: "Nouveau message",
      body: `${nameOf(db, actor.id)} au sujet de « ${property.title} » : ${body.slice(0, 120)}`,
      link: "/messages",
      entityType: "conversation",
      entityId: conversationId,
    });
  })();

  return { ok: true, data: { id: conversationId } };
}

/* ------------------------------------------------------------------
   LECTURE
   ------------------------------------------------------------------ */

export function listConversations(db: Db, actor: UserContext): ConversationSummary[] {
  const rows = queryAll<ConversationRow & { property_title: string; property_reference: string; last_read_at: string | null }>(
    `SELECT c.*, p.title AS property_title, COALESCE(p.reference, '') AS property_reference,
            me.last_read_at
       FROM conversations c
       JOIN conversation_participants me ON me.conversation_id = c.id AND me.user_id = ?
       JOIN properties p ON p.id = c.property_id
      ORDER BY c.last_message_at DESC`,
    [actor.id],
  );

  return rows.map((row) => {
    const participants = queryAll<{ user_id: string; role: string }>(
      "SELECT user_id, role FROM conversation_participants WHERE conversation_id = ?",
      [row.id],
    );
    const last = queryOne<{ body: string }>(
      "SELECT body FROM messages WHERE conversation_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1",
      [row.id],
    );
    const unread = queryOne<{ count: number }>(
      "SELECT COUNT(*) AS count FROM messages WHERE conversation_id = ? AND author_id <> ? AND created_at > COALESCE(?, '')",
      [row.id, actor.id, row.last_read_at],
    );
    return {
      id: row.id,
      propertyId: row.property_id,
      propertyTitle: row.property_title,
      propertyReference: row.property_reference,
      subject: row.subject,
      visitId: row.visit_id,
      lastMessageAt: row.last_message_at,
      lastMessagePreview: (last?.body ?? "").slice(0, 140),
      unreadCount: unread?.count ?? 0,
      participants: participants.map((entry) => ({
        id: entry.user_id,
        name: nameOf(db, entry.user_id),
        role: entry.role,
      })),
    };
  });
}

export function readConversation(
  db: Db,
  actor: UserContext,
  conversationId: string,
): ServiceResult<ConversationDetail> {
  if (!isParticipant(db, conversationId, actor.id)) {
    return { ok: false, message: "Vous ne participez pas à cette conversation.", code: "permission" };
  }
  const row = queryOne<ConversationRow & { property_title: string; property_reference: string }>(
    `SELECT c.*, p.title AS property_title, COALESCE(p.reference, '') AS property_reference
       FROM conversations c JOIN properties p ON p.id = c.property_id WHERE c.id = ?`,
    [conversationId],
  );
  if (!row) return { ok: false, message: "Cette conversation n’existe plus.", code: "introuvable" };

  const messages = queryAll<{ id: string; author_id: string; body: string; created_at: string }>(
    "SELECT id, author_id, body, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC, rowid ASC",
    [conversationId],
  );
  const me = queryOne<{ last_read_at: string | null }>(
    "SELECT last_read_at FROM conversation_participants WHERE conversation_id = ? AND user_id = ?",
    [conversationId, actor.id],
  );
  const last = queryOne<{ body: string }>(
    "SELECT body FROM messages WHERE conversation_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1",
    [conversationId],
  );
  const unread = queryOne<{ count: number }>(
    "SELECT COUNT(*) AS count FROM messages WHERE conversation_id = ? AND author_id <> ? AND created_at > COALESCE(?, '')",
    [conversationId, actor.id, me?.last_read_at ?? null],
  );

  return {
    ok: true,
    data: {
      id: row.id,
      propertyId: row.property_id,
      propertyTitle: row.property_title,
      propertyReference: row.property_reference,
      subject: row.subject,
      visitId: row.visit_id,
      lastMessageAt: row.last_message_at,
      lastMessagePreview: (last?.body ?? "").slice(0, 140),
      unreadCount: unread?.count ?? 0,
      participants: queryAll<{ user_id: string; role: string }>(
        "SELECT user_id, role FROM conversation_participants WHERE conversation_id = ?",
        [conversationId],
      ).map((entry) => ({ id: entry.user_id, name: nameOf(db, entry.user_id), role: entry.role })),
      messages: messages.map((entry) => ({
        id: entry.id,
        authorId: entry.author_id,
        authorName: entry.author_id === actor.id ? "Vous" : nameOf(db, entry.author_id),
        body: entry.body,
        createdAt: entry.created_at,
        mine: entry.author_id === actor.id,
      })),
    },
  };
}

/* ------------------------------------------------------------------
   ÉCRITURE
   ------------------------------------------------------------------ */

export function postMessage(
  db: Db,
  actor: UserContext,
  conversationId: string,
  body: string,
  meta: { ip?: string } = {},
): ServiceResult<{ id: string }> {
  const text = (body ?? "").trim();
  if (text.length < MIN_BODY) return { ok: false, message: "Votre message est trop court pour être envoyé." };
  if (text.length > MAX_BODY) return { ok: false, message: `Votre message dépasse ${MAX_BODY} caractères.` };
  if (!isParticipant(db, conversationId, actor.id)) {
    return { ok: false, message: "Vous ne participez pas à cette conversation.", code: "permission" };
  }

  const iso = nowIso();
  const id = newId("MSG");
  const recipients = queryAll<{ user_id: string }>(
    "SELECT user_id FROM conversation_participants WHERE conversation_id = ? AND user_id <> ?",
    [conversationId, actor.id],
  ).map((row) => row.user_id);

  db.transaction(() => {
    db.prepare("INSERT INTO messages (id, conversation_id, author_id, body, created_at) VALUES (?, ?, ?, ?, ?)").run(
      id,
      conversationId,
      actor.id,
      text,
      iso,
    );
    db.prepare("UPDATE conversations SET last_message_at = ?, updated_at = ? WHERE id = ?").run(iso, iso, conversationId);
    // L’auteur relit implicitement son propre fil.
    db.prepare(
      "UPDATE conversation_participants SET last_read_at = ? WHERE conversation_id = ? AND user_id = ?",
    ).run(iso, conversationId, actor.id);
    writeAudit(db, {
      actorId: actor.id,
      actorLabel: actor.email,
      action: "message.envoye",
      entityType: "conversation",
      entityId: conversationId,
      detail: { destinataires: recipients.length },
      ip: meta.ip,
    });
    notify(db, {
      userIds: recipients,
      type: "message",
      title: "Nouveau message",
      body: `${nameOf(db, actor.id)} : ${text.slice(0, 120)}`,
      link: "/messages",
      entityType: "conversation",
      entityId: conversationId,
    });
  })();

  return { ok: true, data: { id } };
}

/** Marque le fil comme lu pour l’appelant — et seulement pour lui. */
export function markConversationRead(db: Db, actor: UserContext, conversationId: string): ServiceResult<{ read: true }> {
  if (!isParticipant(db, conversationId, actor.id)) {
    return { ok: false, message: "Vous ne participez pas à cette conversation.", code: "permission" };
  }
  db.prepare("UPDATE conversation_participants SET last_read_at = ? WHERE conversation_id = ? AND user_id = ?").run(
    nowIso(),
    conversationId,
    actor.id,
  );
  return { ok: true, data: { read: true } };
}

/** Compteur global, utilisé par les menus pour afficher un vrai chiffre. */
export function unreadMessageCount(db: Db, actor: UserContext): number {
  const row = queryOne<{ count: number }>(
    `SELECT COUNT(*) AS count
       FROM messages m
       JOIN conversation_participants me ON me.conversation_id = m.conversation_id AND me.user_id = ?
      WHERE m.author_id <> ? AND m.created_at > COALESCE(me.last_read_at, '')`,
    [actor.id, actor.id],
  );
  return row?.count ?? 0;
}

/** Biens qu’un utilisateur peut légitimement « contacter » — sert à remplir le formulaire. */
export function contactableProperties(db: Db, actor: UserContext): { id: string; title: string; reference: string }[] {
  if (isAdminRole(actor.roles)) return [];
  return queryAll<{ id: string; title: string; reference: string }>(
    `SELECT p.id, p.title, COALESCE(p.reference, '') AS reference
       FROM properties p
      WHERE p.publication_status = 'publie' AND p.owner_id IS NOT NULL AND p.owner_id <> ?
      ORDER BY p.title`,
    [actor.id],
  );
}
