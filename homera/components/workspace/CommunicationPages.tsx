"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight, Bell, CheckCheck, Home, Loader2, Mail, MessageCircle,
  MessageSquareText, Plus, Send, ShieldCheck, SlidersHorizontal,
} from "lucide-react";
import { apiPatch, apiPost } from "@/lib/api-client";
import { useServerResource } from "@/lib/use-server-resource";
import {
  BUTTON_PRIMARY, BUTTON_SECONDARY, EmptyPanel, FormField,
  INPUT_CLASS, WorkspaceHeading, WorkspacePanel,
} from "@/components/workspace/Primitives";

/* ==================================================================
   HOMERA — MESSAGES ET NOTIFICATIONS, DEUX OBJETS DIFFÉRENTS
   ------------------------------------------------------------------
   Les deux écrans parlent au serveur, jamais au navigateur :

   • **Messages** : conversations privées entre un visiteur, le
     propriétaire et l’agent mandaté. Un fil n’est visible que par ses
     participants ; l’administration n’y entre pas.

   • **Notifications** : décisions du système (visite confirmée,
     candidature acceptée, vérification, mandat…). Elles sont générées
     par le serveur, jamais fabriquées à l’écran, et portent une date,
     un contexte, une destination et une action.

   Rien n’est conservé localement : si le serveur n’a rien, l’écran
   affiche un état vide réel.
   ================================================================== */

type ServerNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  entity_type: string | null;
  entity_id: string | null;
  read_at: string | null;
  created_at: string;
};

type NotificationsPayload = { items: ServerNotification[]; unread: number };

const NOTIFICATION_FILTERS: { id: "toutes" | "non-lues" | string; label: string }[] = [
  { id: "toutes", label: "Toutes" },
  { id: "non-lues", label: "Non lues" },
  { id: "message", label: "Messages" },
  { id: "visite", label: "Visites" },
  { id: "candidature", label: "Demandes" },
  { id: "verification", label: "Vérifications" },
  { id: "publication", label: "Biens" },
  { id: "signalement", label: "Signalements" },
  { id: "compte", label: "Compte" },
];

const TYPE_LABELS: Record<string, string> = {
  message: "Message",
  visite: "Visite",
  candidature: "Demande de location",
  verification: "Vérification",
  publication: "Bien",
  signalement: "Signalement",
  mandat: "Mandat",
  compte: "Compte",
  securite: "Sécurité",
  agent: "Agent",
  systeme: "Système",
};

const ENTITY_LABELS: Record<string, string> = {
  bien: "un bien",
  visite: "une visite",
  conversation: "une conversation",
  candidature: "une candidature",
  mandat: "un mandat",
  compte: "votre compte",
  verification: "une vérification",
};

function typeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(date);
}

/* ---------------- Notifications (système) ---------------- */

export function NotificationsPage() {
  const { data, loading, error, reload } = useServerResource<NotificationsPayload>("/api/notifications");
  const [filter, setFilter] = useState("toutes");
  const [busy, setBusy] = useState(false);

  const items = useMemo(() => data?.items ?? [], [data]);
  const unread = data?.unread ?? 0;
  const visible = useMemo(() => {
    if (filter === "non-lues") return items.filter((entry) => !entry.read_at);
    if (filter === "toutes") return items;
    return items.filter((entry) => entry.type === filter);
  }, [items, filter]);

  const mark = useCallback(
    async (ids?: string[]) => {
      setBusy(true);
      await apiPatch<{ updated: number }>("/api/notifications", ids ? { ids } : {});
      setBusy(false);
      await reload();
    },
    [reload],
  );

  return <>
    <WorkspaceHeading
      eyebrow="Centre de notifications"
      title="Vos notifications"
      description="Confirmations, décisions et rappels envoyés par la plateforme. Rien n’est fabriqué à l’écran : chaque ligne provient du serveur."
      actions={
        <button type="button" onClick={() => void mark()} disabled={!unread || busy} className={`${BUTTON_SECONDARY} disabled:cursor-not-allowed disabled:opacity-45`}>
          <CheckCheck className="h-4 w-4" aria-hidden="true" />Tout marquer comme lu
        </button>
      }
    />
    <div className="mb-5 flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-homera-terracotta/[0.08] text-homera-terracotta">
        <Bell className="h-4 w-4" aria-hidden="true" />
      </span>
      <p className="text-caption leading-relaxed text-muted">
        {loading
          ? "Lecture de vos notifications…"
          : unread
            ? <><strong className="text-foreground">{unread} notification{unread === 1 ? "" : "s"} non lue{unread === 1 ? "" : "s"}.</strong> Les décisions prises sur vos dossiers apparaissent ici, avec leur date et leur contexte.</>
            : "Vous êtes à jour. Les prochaines décisions apparaîtront dans cet historique."}
      </p>
    </div>
    <div className="mb-5 flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Filtrer les notifications">
      {NOTIFICATION_FILTERS.map((entry) => (
        <button
          key={entry.id}
          type="button"
          role="tab"
          aria-selected={filter === entry.id}
          onClick={() => setFilter(entry.id)}
          className={`min-h-10 shrink-0 rounded-full border px-4 text-caption font-semibold transition-colors ${filter === entry.id ? "border-homera-brown bg-homera-brown text-white" : "border-border bg-card text-muted hover:text-foreground"}`}
        >
          {entry.label}
        </button>
      ))}
    </div>
    {error && <p role="alert" className="mb-4 rounded-xl border border-error/20 bg-error/[0.05] px-4 py-3 text-note text-error">{error}</p>}
    {loading ? (
      <p className="flex items-center gap-2 rounded-card border border-border bg-card p-6 text-caption text-muted">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Chargement…
      </p>
    ) : !visible.length ? (
      <EmptyPanel
        icon={Bell}
        title={items.length ? "Aucune alerte dans cette catégorie" : "Aucune notification pour le moment"}
        description={items.length ? "Essayez une autre catégorie ou revenez sur « Toutes »." : "Vos alertes de visite, de candidature, de vérification et de mandat apparaîtront ici dès qu’une action vous concerne."}
        action={items.length ? <button type="button" onClick={() => setFilter("toutes")} className={BUTTON_SECONDARY}>Afficher toutes</button> : <Link href="/explorer" className={BUTTON_SECONDARY}>Explorer les biens<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>}
      />
    ) : (
      <WorkspacePanel title="Historique" description={`${visible.length} élément${visible.length === 1 ? "" : "s"}`} icon={SlidersHorizontal}>
        <ul className="divide-y divide-border">
          {visible.map((entry) => (
            <li key={entry.id} className={`flex items-start gap-3 py-4 first:pt-0 last:pb-0 ${entry.read_at ? "opacity-80" : ""}`}>
              <span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${entry.read_at ? "bg-border" : "bg-homera-terracotta"}`} aria-label={entry.read_at ? "Lue" : "Non lue"} />
              <div className="min-w-0 flex-1">
                <p className="text-note font-semibold">{entry.title}</p>
                {entry.body && <p className="mt-1 text-caption leading-relaxed text-muted">{entry.body}</p>}
                <p className="mt-2 text-caption text-muted-light">
                  {formatDate(entry.created_at)} · {typeLabel(entry.type)}
                  {entry.entity_type ? ` · lié à ${ENTITY_LABELS[entry.entity_type] ?? entry.entity_type}` : ""}
                </p>
                <div className="mt-2 flex flex-wrap gap-3">
                  {entry.link && (
                    <Link
                      href={entry.link}
                      onClick={() => { if (!entry.read_at) void mark([entry.id]); }}
                      className="inline-flex min-h-8 items-center gap-1 text-caption font-semibold text-homera-terracotta hover:underline"
                    >
                      Ouvrir<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  )}
                  {!entry.read_at && (
                    <button type="button" onClick={() => void mark([entry.id])} className="min-h-8 text-caption font-semibold text-muted hover:text-foreground">
                      Marquer comme lue
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </WorkspacePanel>
    )}
  </>;
}

/* ---------------- Messages (conversations privées) ---------------- */

type Contactable = { id: string; title: string; reference: string };
type Summary = {
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
type Detail = Summary & {
  messages: { id: string; authorId: string; authorName: string; body: string; createdAt: string; mine: boolean }[];
};
type MessagesPayload = { conversations: Summary[]; unread: number; contactable: Contactable[] };
type DetailPayload = { conversation: Detail };

export function MessagesPage({ initialPropertyId = "" }: { initialPropertyId?: string }) {
  const list = useServerResource<MessagesPayload>("/api/messages");
  const [selectedId, setSelectedId] = useState("");
  const [composeOpen, setComposeOpen] = useState(Boolean(initialPropertyId));
  const [propertyId, setPropertyId] = useState(initialPropertyId);
  const [firstMessage, setFirstMessage] = useState("");
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const threadRef = useRef<HTMLOListElement | null>(null);

  const conversations = list.data?.conversations ?? [];
  const selectedIdOrFirst = selectedId || conversations[0]?.id || "";
  const detail = useServerResource<DetailPayload>(selectedIdOrFirst ? `/api/messages/${selectedIdOrFirst}` : null);
  const conversation = detail.data?.conversation;

  // Le fil est marqué lu à l’ouverture : le compteur « non lus » est personnel.
  useEffect(() => {
    if (!selectedIdOrFirst || !conversation) return;
    if (conversation.unreadCount === 0) return;
    void apiPatch(`/api/messages/${selectedIdOrFirst}`, {}).then(() => list.reload());
  }, [selectedIdOrFirst, conversation?.unreadCount]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const node = threadRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [conversation?.messages.length]);

  const openThread = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!propertyId) {
      setError("Sélectionnez le bien concerné.");
      return;
    }
    if (firstMessage.trim().length < 4) {
      setError("Votre message doit contenir au moins 4 caractères.");
      return;
    }
    setBusy(true);
    const result = await apiPost<{ id: string }>("/api/messages", { propertyId, body: firstMessage.trim() });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setFirstMessage("");
    setComposeOpen(false);
    setSelectedId(result.data.id);
    setNotice("Votre message est envoyé : le propriétaire et l’agent mandaté en sont notifiés.");
    await list.reload();
  };

  const sendReply = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!conversation || reply.trim().length < 4) return;
    setBusy(true);
    const result = await apiPost<{ id: string }>(`/api/messages/${conversation.id}`, { body: reply.trim() });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setReply("");
    setError("");
    await Promise.all([detail.reload(), list.reload()]);
  };

  const unreadTotal = list.data?.unread ?? 0;

  return <>
    <WorkspaceHeading
      eyebrow="Boîte de réception"
      title="Messages"
      description="Une conversation par bien, avec le propriétaire et l’agent mandaté. Les échanges sont privés : seuls les participants du fil y ont accès."
      actions={
        <button type="button" onClick={() => { setComposeOpen((open) => !open); setError(""); }} className={BUTTON_PRIMARY}>
          <Plus className="h-4 w-4" aria-hidden="true" />Nouvelle conversation
        </button>
      }
    />
    {notice && <p role="status" className="mb-4 rounded-xl border border-success/20 bg-success/[0.05] px-4 py-3 text-note text-success">{notice}</p>}
    {list.error && <p role="alert" className="mb-4 rounded-xl border border-error/20 bg-error/[0.05] px-4 py-3 text-note text-error">{list.error}</p>}

    <div className="grid gap-4 lg:grid-cols-[minmax(240px,0.7fr)_minmax(0,1.3fr)]">
      <WorkspacePanel
        title="Conversations"
        description={unreadTotal ? `${unreadTotal} message${unreadTotal === 1 ? "" : "s"} non lu${unreadTotal === 1 ? "" : "s"}` : "Aucun message non lu"}
        icon={MessageCircle}
        className="h-fit"
      >
        {list.loading ? (
          <p className="flex items-center gap-2 text-caption text-muted"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Chargement…</p>
        ) : conversations.length ? (
          <ul className="space-y-1">
            {conversations.map((thread) => (
              <li key={thread.id}>
                <button
                  type="button"
                  onClick={() => { setSelectedId(thread.id); setComposeOpen(false); }}
                  aria-pressed={selectedIdOrFirst === thread.id}
                  className={`w-full rounded-xl border p-3 text-left transition-colors ${selectedIdOrFirst === thread.id ? "border-homera-terracotta/35 bg-homera-terracotta/[0.06]" : "border-transparent hover:bg-background"}`}
                >
                  <span className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-background text-homera-terracotta">
                      <Home className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="block truncate text-note font-semibold">{thread.propertyTitle}</span>
                        {thread.unreadCount > 0 && (
                          <span className="shrink-0 rounded-full bg-homera-terracotta px-2 text-micro font-semibold text-white">{thread.unreadCount}</span>
                        )}
                      </span>
                      <span className="mt-1 block truncate text-caption text-muted">{thread.lastMessagePreview || "Aucun message"}</span>
                      <span className="mt-1 block font-mono text-micro text-muted-light">{thread.propertyReference || "—"}</span>
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-border p-4 text-caption leading-relaxed text-muted">
            Aucun échange. Écrivez depuis la fiche d’un bien, ou démarrez une conversation ci-contre.
          </p>
        )}
      </WorkspacePanel>

      <div className="min-h-[420px] rounded-card border border-border bg-card p-4 shadow-[var(--shadow-card)] sm:p-6">
        {composeOpen ? (
          <form onSubmit={openThread} className="space-y-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-homera-terracotta/[0.08] text-homera-terracotta">
                <MessageSquareText className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-body font-semibold">Nouvelle conversation</h2>
                <p className="text-caption text-muted">Le propriétaire et l’agent mandaté recevront votre message.</p>
              </div>
            </div>
            <FormField label="Bien concerné" name="message-property" required>
              <select id="message-property" value={propertyId} onChange={(event) => setPropertyId(event.target.value)} className={INPUT_CLASS}>
                <option value="">Choisir un bien</option>
                {(list.data?.contactable ?? []).map((property) => (
                  <option key={property.id} value={property.id}>{property.title}{property.reference ? ` · ${property.reference}` : ""}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Votre message" name="first-message" hint="N’envoyez jamais de pièce d’identité ni d’argent par messagerie." required>
              <textarea
                id="first-message"
                rows={6}
                maxLength={4000}
                value={firstMessage}
                onChange={(event) => setFirstMessage(event.target.value)}
                placeholder="Bonjour, je souhaite obtenir des précisions sur ce bien…"
                className={`${INPUT_CLASS} resize-y py-3`}
              />
            </FormField>
            {error && <p role="alert" className="text-note text-error">{error}</p>}
            <button type="submit" disabled={busy} className={`${BUTTON_PRIMARY} disabled:opacity-60`}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
              Envoyer le message
            </button>
          </form>
        ) : detail.loading ? (
          <p className="flex items-center gap-2 text-caption text-muted"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Chargement de la conversation…</p>
        ) : conversation ? (
          <div className="flex h-full min-h-[390px] flex-col">
            <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
              <div>
                <p className="text-note font-semibold">{conversation.propertyTitle}</p>
                <p className="mt-1 flex items-center gap-2 text-caption text-muted">
                  <ShieldCheck className="h-3.5 w-3.5 text-homera-terracotta" aria-hidden="true" />
                  Avec {conversation.participants
                    .map((entry) => (entry.role === "proprietaire" ? "le propriétaire" : entry.role === "agent" ? "l’agent mandaté" : entry.role === "admin" ? "l’administration" : "un interlocuteur"))
                    .filter((label, index, all) => all.indexOf(label) === index)
                    .join(" et ")}
                </p>
              </div>
              <Link href={`/biens/${conversation.propertyId}`} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-background px-3 font-mono text-caption text-muted transition-colors hover:border-homera-terracotta hover:text-homera-terracotta">
                {conversation.propertyReference || "Fiche"}<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </header>
            <ol ref={threadRef} aria-label="Historique de la conversation" className="flex-1 space-y-3 overflow-y-auto py-4">
              {conversation.messages.map((message) => (
                <li key={message.id} className={`flex ${message.mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[88%] rounded-2xl px-4 py-3 ${message.mine ? "rounded-br-md bg-homera-brown text-white" : "rounded-bl-md bg-background text-foreground"}`}>
                    <p className="text-caption font-semibold">{message.authorName}</p>
                    <p className="mt-1 whitespace-pre-wrap text-note leading-relaxed">{message.body}</p>
                    <p className={`mt-2 text-micro ${message.mine ? "text-white/65" : "text-muted"}`}>{formatDate(message.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ol>
            <form onSubmit={sendReply} className="border-t border-border pt-4">
              <label htmlFor={`reply-${conversation.id}`} className="sr-only">Votre réponse</label>
              <div className="flex items-end gap-2">
                <textarea
                  id={`reply-${conversation.id}`}
                  rows={2}
                  maxLength={4000}
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  placeholder="Écrire un message…"
                  className={`${INPUT_CLASS} min-h-12 resize-y py-3`}
                />
                <button
                  type="submit"
                  disabled={busy || reply.trim().length < 4}
                  aria-label="Envoyer la réponse"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-homera-brown text-white hover:bg-homera-brown-light disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-caption text-muted">
                <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                Message réellement remis aux participants du fil · HOMERA ne lit pas vos échanges
              </p>
              {error && <p role="alert" className="mt-2 text-note text-error">{error}</p>}
            </form>
          </div>
        ) : (
          <EmptyPanel
            icon={Mail}
            title="Votre boîte est vide"
            description="Démarrez une conversation à propos d’un bien publié, ou explorez d’abord les annonces disponibles."
            action={<Link href="/explorer" className={BUTTON_PRIMARY}>Explorer<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>}
          />
        )}
      </div>
    </div>
  </>;
}
