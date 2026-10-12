import type { Db } from "./db/client";
import { newId, nowIso, queryAll, queryOne } from "./db/client";

/* ==================================================================
   HOMERA — NOTIFICATIONS PERSISTANTES
   ------------------------------------------------------------------
   Une notification n’existe que si l’événement a réellement eu lieu :
   elle est écrite par le service métier, dans la même transaction que
   le changement d’état. Si l’écriture échoue, l’opération entière est
   annulée — jamais d’événement fantôme.

   Anti-doublon : une notification identique (même destinataire, même
   type, même objet) déjà non lue depuis moins de 24 h n’est pas
   réécrite. Les acteurs concernés sont notifiés ensembles (client,
   propriétaire, agent mandaté, administration).
   ================================================================== */

export type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  link: string;
  entity_type: string;
  entity_id: string;
  read_at: string | null;
  created_at: string;
};

export type NotifyInput = {
  userIds: (string | null | undefined)[];
  type: string;
  title: string;
  body?: string;
  link?: string;
  entityType?: string;
  entityId?: string;
};

const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000;

export function notify(db: Db, input: NotifyInput): string[] {
  const created: string[] = [];
  const recipients = new Set(input.userIds.filter((value): value is string => Boolean(value)));
  if (recipients.size === 0) return created;
  const insert = db.prepare(
    `INSERT INTO notifications (id, user_id, type, title, body, link, entity_type, entity_id, read_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
  );
  const duplicate = db.prepare<[string, string, string, string, string], { id: string }>(
    `SELECT id FROM notifications
     WHERE user_id = ? AND type = ? AND entity_id = ? AND title = ? AND read_at IS NULL AND created_at >= ?`,
  );
  const cutoff = new Date(Date.now() - DUPLICATE_WINDOW_MS).toISOString();
  for (const userId of recipients) {
    const existing = duplicate.get(userId, input.type, input.entityId ?? "", input.title, cutoff);
    if (existing) continue;
    const id = newId("NOT");
    insert.run(
      id,
      userId,
      input.type,
      input.title,
      input.body ?? "",
      input.link ?? "",
      input.entityType ?? "",
      input.entityId ?? "",
      nowIso(),
    );
    created.push(id);
  }
  return created;
}

export function listNotifications(
  db: Db,
  userId: string,
  options: { limit?: number; unreadOnly?: boolean } = {},
): NotificationRow[] {
  const limit = Math.min(Math.max(options.limit ?? 40, 1), 200);
  if (options.unreadOnly) {
    return queryAll<NotificationRow>(
      "SELECT * FROM notifications WHERE user_id = ? AND read_at IS NULL ORDER BY created_at DESC LIMIT ?",
      [userId, limit],
    );
  }
  return queryAll<NotificationRow>(
    "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
    [userId, limit],
  );
}

export function unreadCount(db: Db, userId: string): number {
  const row = queryOne<{ count: number }>(
    "SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND read_at IS NULL",
    [userId],
  );
  return row?.count ?? 0;
}

export function markRead(db: Db, userId: string, ids?: string[]): number {
  if (ids && ids.length > 0) {
    const placeholders = ids.map(() => "?").join(", ");
    const result = db
      .prepare(`UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL AND id IN (${placeholders})`)
      .run(nowIso(), userId, ...ids);
    return result.changes;
  }
  const result = db
    .prepare("UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL")
    .run(nowIso(), userId);
  return result.changes;
}
