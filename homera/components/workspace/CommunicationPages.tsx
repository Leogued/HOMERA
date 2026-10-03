"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight, Bell, CheckCheck, Home, Mail, MessageCircle,
  MessageSquareText, Plus, Send, ShieldCheck, SlidersHorizontal,
} from "lucide-react";
import { useWorkflow } from "@/components/providers/WorkflowProvider";
import { PROPERTIES } from "@/lib/content";
import { createLocalId, makeNotification, type AppNotificationType, type MessageThread } from "@/lib/workflow";
import {
  BUTTON_PRIMARY, BUTTON_SECONDARY, DemoNotice, EmptyPanel, FormField,
  INPUT_CLASS, WorkspaceHeading, WorkspacePanel,
} from "@/components/workspace/Primitives";

const NOTIFICATION_FILTERS: { id: "toutes" | "non-lues" | AppNotificationType; label: string }[] = [
  { id: "toutes", label: "Toutes" },
  { id: "non-lues", label: "Non lues" },
  { id: "visite", label: "Visites" },
  { id: "demande", label: "Demandes" },
  { id: "contrat", label: "Contrats" },
  { id: "verification", label: "Vérifications" },
  { id: "agent", label: "Agents" },
  { id: "propriete", label: "Biens" },
  { id: "systeme", label: "Système" },
];

export function NotificationsPage() {
  const { data, updateData } = useWorkflow();
  const [filter, setFilter] = useState<(typeof NOTIFICATION_FILTERS)[number]["id"]>("toutes");
  const visible = useMemo(() => data.notifications.filter((notification) => {
    if (filter === "non-lues") return !notification.read;
    if (filter === "toutes") return true;
    return notification.type === filter;
  }), [data.notifications, filter]);
  const markOneRead = (id: string) => updateData((current) => ({ ...current, notifications: current.notifications.map((entry) => entry.id === id ? { ...entry, read: true } : entry) }));
  const markAllRead = () => updateData((current) => ({ ...current, notifications: current.notifications.map((entry) => ({ ...entry, read: true })) }));
  const unread = data.notifications.filter((entry) => !entry.read).length;

  return <>
    <WorkspaceHeading eyebrow="Centre de notifications" title="Vos notifications" description="Les confirmations de visite, évolutions de dossier, contrats et vérifications sont regroupés dans cet historique." actions={<button type="button" onClick={markAllRead} disabled={!unread} className={`${BUTTON_SECONDARY} disabled:cursor-not-allowed disabled:opacity-45`}><CheckCheck className="h-4 w-4" aria-hidden="true" />Tout marquer comme lu</button>} />
    <div className="mb-5 flex items-start gap-3 rounded-2xl border border-border bg-card p-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-homera-terracotta/[0.08] text-homera-terracotta"><Bell className="h-4 w-4" aria-hidden="true" /></span><p className="text-caption leading-relaxed text-muted">{unread ? <><strong className="text-foreground">{unread} notification{unread === 1 ? "" : "s"} non lue{unread === 1 ? "" : "s"}.</strong> Les changements liés à votre activité seront visibles ici.</> : "Vous êtes à jour. Les nouvelles alertes apparaîtront dans cet historique."}</p></div>
    <div className="mb-5 flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Filtrer les notifications">{NOTIFICATION_FILTERS.map((entry) => <button key={entry.id} type="button" role="tab" aria-selected={filter === entry.id} onClick={() => setFilter(entry.id)} className={`min-h-10 shrink-0 rounded-full border px-4 text-caption font-semibold transition-colors ${filter === entry.id ? "border-homera-brown bg-homera-brown text-white" : "border-border bg-card text-muted hover:text-foreground"}`}>{entry.label}</button>)}</div>
    {!visible.length ? <EmptyPanel icon={Bell} title={data.notifications.length ? "Aucune alerte dans cette catégorie" : "Aucune notification pour le moment"} description={data.notifications.length ? "Essayez une autre catégorie ou revenez sur « Toutes »." : "Vos alertes de visite, demande, contrat et vérification apparaîtront ici après une action dans l’espace."} action={data.notifications.length ? <button type="button" onClick={() => setFilter("toutes")} className={BUTTON_SECONDARY}>Afficher toutes</button> : <Link href="/client" className={BUTTON_SECONDARY}>Retour à mon espace<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>} /> : <WorkspacePanel title="Historique" description={`${visible.length} élément${visible.length === 1 ? "" : "s"}`} icon={SlidersHorizontal}><ul className="divide-y divide-border">{visible.map((notification) => <li key={notification.id} className={`flex items-start gap-3 py-4 first:pt-0 last:pb-0 ${notification.read ? "opacity-80" : ""}`}><span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${notification.read ? "bg-border" : "bg-homera-terracotta"}`} aria-label={notification.read ? "Lue" : "Non lue"} /><div className="min-w-0 flex-1"><p className="text-note font-semibold">{notification.title}</p><p className="mt-1 text-caption leading-relaxed text-muted">{notification.body}</p><p className="mt-2 text-[0.68rem] text-muted-light">{formatDate(notification.createdAt)} · {typeLabel(notification.type)}</p><div className="mt-2 flex flex-wrap gap-3">{notification.href && <Link href={notification.href} onClick={() => markOneRead(notification.id)} className="inline-flex min-h-8 items-center gap-1 text-caption font-semibold text-homera-terracotta hover:underline">Ouvrir<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>}{!notification.read && <button type="button" onClick={() => markOneRead(notification.id)} className="min-h-8 text-caption font-semibold text-muted hover:text-foreground">Marquer comme lue</button>}</div></div></li>)}</ul></WorkspacePanel>}
    <div className="mt-6"><DemoNotice>Les notifications sont générées par les interactions du prototype et restent dans votre navigateur. Les courriels et notifications poussées ne sont pas connectés.</DemoNotice></div>
  </>;
}

export function MessagesPage({ initialPropertyId = "" }: { initialPropertyId?: string }) {
  const { data, updateData } = useWorkflow();
  const [selectedId, setSelectedId] = useState("");
  const [composeOpen, setComposeOpen] = useState(data.messages.length === 0 || Boolean(initialPropertyId));
  const [propertyId, setPropertyId] = useState(initialPropertyId);
  const [recipient, setRecipient] = useState<"agent" | "proprietaire">("agent");
  const [firstMessage, setFirstMessage] = useState("");
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const threads = useMemo(() => [...data.messages].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [data.messages]);
  const selected = threads.find((thread) => thread.id === selectedId) ?? threads[0];

  const startConversation = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const property = PROPERTIES.find((entry) => entry.id === propertyId);
    if (!property) { setError("Sélectionnez le bien concerné."); return; }
    if (firstMessage.trim().length < 8) { setError("Votre message doit contenir au moins 8 caractères."); return; }
    const now = new Date().toISOString();
    const thread: MessageThread = {
      id: createLocalId("conversation"),
      propertyId: property.id,
      propertyRef: property.homeraId,
      propertyTitle: property.title,
      recipient,
      updatedAt: now,
      messages: [{ id: createLocalId("message"), author: "me", body: firstMessage.trim(), createdAt: now }],
    };
    updateData((current) => ({
      ...current,
      messages: [thread, ...current.messages],
      notifications: [makeNotification("systeme", "Conversation créée", `Un message concernant ${property.title} a été enregistré localement.`, "/messages"), ...current.notifications],
    }));
    setSelectedId(thread.id);
    setComposeOpen(false);
    setFirstMessage("");
    setError("");
    setNotice("Votre message est enregistré dans cette conversation de démonstration.");
  };

  const sendReply = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected || !reply.trim()) return;
    const now = new Date().toISOString();
    updateData((current) => ({
      ...current,
      messages: current.messages.map((thread) => thread.id === selected.id ? {
        ...thread,
        updatedAt: now,
        messages: [...thread.messages, { id: createLocalId("message"), author: "me", body: reply.trim(), createdAt: now }],
      } : thread),
    }));
    setReply("");
    setNotice("Réponse ajoutée à votre historique local.");
  };

  return <>
    <WorkspaceHeading eyebrow="Boîte de réception" title="Messages" description="Une conversation par bien, rattachée à sa référence HOMERA. Les échanges du prototype restent privés dans votre navigateur." actions={<button type="button" onClick={() => { setComposeOpen((open) => !open); setError(""); }} className={BUTTON_PRIMARY}><Plus className="h-4 w-4" aria-hidden="true" />Nouvelle conversation</button>} />
    {notice && <p role="status" className="mb-4 rounded-xl border border-success/20 bg-success/[0.05] px-4 py-3 text-note text-success">{notice}</p>}
    <div className="grid gap-4 lg:grid-cols-[minmax(240px,0.7fr)_minmax(0,1.3fr)]">
      <WorkspacePanel title="Conversations" description="Par bien et par interlocuteur." icon={MessageCircle} className="h-fit">
        {threads.length ? <ul className="space-y-1">{threads.map((thread) => <li key={thread.id}><button type="button" onClick={() => { setSelectedId(thread.id); setComposeOpen(false); }} aria-pressed={selected?.id === thread.id} className={`w-full rounded-xl border p-3 text-left transition-colors ${selected?.id === thread.id ? "border-homera-terracotta/35 bg-homera-terracotta/[0.06]" : "border-transparent hover:bg-background"}`}><span className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-background text-homera-terracotta"><Home className="h-4 w-4" aria-hidden="true" /></span><span className="min-w-0 flex-1"><span className="block truncate text-note font-semibold">{thread.propertyTitle}</span><span className="mt-1 block truncate text-caption text-muted">{thread.messages[thread.messages.length - 1]?.body ?? "Aucun message"}</span><span className="mt-1 block font-mono text-[0.65rem] text-muted-light">{thread.propertyRef}</span></span></span></button></li>)}</ul> : <p className="rounded-xl border border-dashed border-border p-4 text-caption leading-relaxed text-muted">Aucun échange. Écrivez à l’agent ou au propriétaire depuis la fiche d’un bien.</p>}
      </WorkspacePanel>
      <div className="min-h-[420px] rounded-card border border-border bg-card p-4 shadow-[var(--shadow-card)] sm:p-6">
        {composeOpen ? <form onSubmit={startConversation} className="space-y-5"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-homera-terracotta/[0.08] text-homera-terracotta"><MessageSquareText className="h-4 w-4" aria-hidden="true" /></span><div><h2 className="text-body-md font-semibold">Nouvelle conversation</h2><p className="text-caption text-muted">Choisissez un bien et un interlocuteur.</p></div></div><FormField label="Bien concerné" name="message-property" required><select id="message-property" value={propertyId} onChange={(event) => setPropertyId(event.target.value)} className={INPUT_CLASS}><option value="">Choisir un bien</option>{PROPERTIES.map((property) => <option key={property.id} value={property.id}>{property.title} · {property.homeraId}</option>)}</select></FormField><FormField label="Écrire à" name="message-recipient" required><select id="message-recipient" value={recipient} onChange={(event) => setRecipient(event.target.value as "agent" | "proprietaire")} className={INPUT_CLASS}><option value="agent">L’agent autorisé</option><option value="proprietaire">Le propriétaire (si la relation le permet)</option></select></FormField><FormField label="Votre message" name="first-message" hint="Ne partagez pas de documents sensibles dans ce prototype." required><textarea id="first-message" rows={6} value={firstMessage} onChange={(event) => setFirstMessage(event.target.value)} placeholder="Bonjour, je souhaite obtenir des précisions sur ce bien…" className={`${INPUT_CLASS} resize-y py-3`} /></FormField>{error && <p role="alert" className="text-note text-error">{error}</p>}<button type="submit" className={BUTTON_PRIMARY}><Send className="h-4 w-4" aria-hidden="true" />Enregistrer le message</button></form> : selected ? <ConversationView thread={selected} reply={reply} onReplyChange={setReply} onSend={sendReply} /> : <EmptyPanel icon={Mail} title="Votre boîte est vide" description="Démarrez une conversation à propos d’un bien, ou consultez d’abord les annonces disponibles." action={<Link href="/explorer" className={BUTTON_PRIMARY}>Explorer<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>} />}
      </div>
    </div>
    <div className="mt-6"><DemoNotice>La messagerie est une maquette interactive locale. Les messages et pièces jointes ne sont transmis à aucun interlocuteur.</DemoNotice></div>
  </>;
}

function ConversationView({ thread, reply, onReplyChange, onSend }: { thread: MessageThread; reply: string; onReplyChange: (value: string) => void; onSend: (event: React.FormEvent<HTMLFormElement>) => void }) {
  return <div className="flex h-full min-h-[390px] flex-col"><header className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4"><div><p className="text-note font-semibold">{thread.propertyTitle}</p><p className="mt-1 flex items-center gap-2 text-caption text-muted"><ShieldCheck className="h-3.5 w-3.5 text-homera-terracotta" aria-hidden="true" />Avec {thread.recipient === "agent" ? "l’agent autorisé" : "le propriétaire"}</p></div><span className="font-mono text-[0.68rem] text-muted">{thread.propertyRef}</span></header><ol aria-label="Historique de la conversation" className="flex-1 space-y-3 overflow-y-auto py-4">{thread.messages.map((message) => <li key={message.id} className={`flex ${message.author === "me" ? "justify-end" : "justify-start"}`}><div className={`max-w-[88%] rounded-2xl px-4 py-3 ${message.author === "me" ? "rounded-br-md bg-homera-brown text-white" : "rounded-bl-md bg-background text-foreground"}`}><p className="text-caption font-semibold">{message.author === "me" ? "Vous" : message.author === "agent" ? "Agent HOMERA" : "Propriétaire"}</p><p className="mt-1 whitespace-pre-wrap text-note leading-relaxed">{message.body}</p><p className={`mt-2 text-[0.65rem] ${message.author === "me" ? "text-white/65" : "text-muted"}`}>{formatDate(message.createdAt)}</p></div></li>)}</ol><form onSubmit={onSend} className="border-t border-border pt-4"><label htmlFor={`reply-${thread.id}`} className="sr-only">Votre réponse</label><div className="flex items-end gap-2"><textarea id={`reply-${thread.id}`} rows={2} maxLength={1000} value={reply} onChange={(event) => onReplyChange(event.target.value)} placeholder="Écrire un message…" className={`${INPUT_CLASS} min-h-12 resize-y py-3`} /><button type="submit" disabled={!reply.trim()} aria-label="Envoyer la réponse" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-homera-brown text-white hover:bg-homera-brown-light disabled:cursor-not-allowed disabled:opacity-40"><Send className="h-4 w-4" aria-hidden="true" /></button></div><p className="mt-2 flex items-center gap-1.5 text-[0.68rem] text-muted"><ShieldCheck className="h-3 w-3" aria-hidden="true" />Échange fictif de démonstration · sans envoi réel</p></form></div>;
}

function typeLabel(type: AppNotificationType): string {
  const labels: Record<AppNotificationType, string> = { visite: "Visite", demande: "Demande", contrat: "Contrat", verification: "Vérification", agent: "Agent", propriete: "Bien", systeme: "Système" };
  return labels[type];
}
function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}
