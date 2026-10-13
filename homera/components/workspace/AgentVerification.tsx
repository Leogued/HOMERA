import Link from "next/link";
import { ArrowRight, BadgeCheck, CalendarDays, MapPin, Search, ShieldAlert, ShieldCheck, UserRound } from "lucide-react";
import { PageHero } from "@/components/catalog/PageHero";
import { BUTTON_PRIMARY, BUTTON_SECONDARY, INPUT_CLASS } from "@/components/workspace/Primitives";

/* ==================================================================
   CONTRÔLE PUBLIC D’UN MANDAT
   ------------------------------------------------------------------
   La réponse vient du registre serveur des autorisations : un mandat
   n’est déclaré valide que s’il est actif et non expiré aujourd’hui.
   Rien n’est « illustré » : sans correspondance, la page dit qu’elle
   ne peut pas confirmer, et c’est une vraie information.
   ================================================================== */

export type MandateCheck = {
  active: boolean;
  status: string;
  agentName: string;
  matricule: string;
  propertyId: string;
  propertyTitle: string;
  propertyReference: string;
  propertyCity: string;
  mandateType: string;
  scope: string[];
  startsAt: string;
  expiresAt: string;
};

const MANDATE_TYPE_LABELS: Record<string, string> = {
  location: "Location",
  vente: "Vente",
  gerance: "Gérance",
  visite: "Visites",
};

const STATUS_LABELS: Record<string, string> = {
  "en-attente": "En attente de décision",
  invite: "Agent invité, inscription en cours",
  active: "Actif",
  refusee: "Refusé",
  revoquee: "Révoqué",
  expiree: "Expiré",
  contestee: "Contesté",
};

export function AgentVerification({
  agentId = "",
  propertyRef = "",
  check = null,
}: {
  agentId?: string;
  propertyRef?: string;
  check?: MandateCheck | null;
}) {
  const normalizedAgentId = agentId.trim().toUpperCase();
  const normalizedPropertyRef = propertyRef.trim().toUpperCase();
  const searched = Boolean(normalizedAgentId && normalizedPropertyRef);
  const active = check?.active ?? false;
  const title = active ? "Autorisation retrouvée" : check ? "Autorisation inactive" : "Autorisation non confirmée";
  return <>
    <PageHero crumbs={[{ label: "Accueil", href: "/" }, { label: "Vérification d’un agent" }]} eyebrow="Contrôle public" title="Vérifier un agent sur un bien précis" intro="La validité d’un mandat dépend du représentant, de la référence de bien et de sa période. Une identité seule ne donne pas accès à toutes les annonces." facts={[{ label: "Agent", value: normalizedAgentId || "Non renseigné" }, { label: "Référence du bien", value: normalizedPropertyRef || "Non renseignée" }, { label: "Résultat", value: !searched ? "En attente de recherche" : active ? "Mandat actif" : check ? "Mandat inactif ou hors période" : "Non confirmé" }]} />
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-10 sm:px-6 lg:px-8">
      <section className="mb-6 rounded-card border border-border bg-card p-6 shadow-card sm:p-8" aria-labelledby="agent-verification-form-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-label uppercase text-homera-terracotta">Recherche dans le registre HOMERA</p>
            <h2 id="agent-verification-form-title" className="mt-1 font-serif text-display-xs">Interroger un couple matricule / bien</h2>
            <p className="mt-1 text-caption leading-relaxed text-muted">Saisissez le matricule figurant sur le badge de l’agent et la référence HOMERA du bien : la réponse est lue dans le registre des autorisations, sans intermédiaire.</p>
          </div>
          {(normalizedAgentId || normalizedPropertyRef) && (
            <Link href="/verification-agent" className={BUTTON_SECONDARY}>Réinitialiser</Link>
          )}
        </div>
        <form action="/verification-agent" method="get" className="mt-5 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div>
            <label htmlFor="verify-agent-id" className="block text-note font-semibold text-foreground">Matricule de l’agent</label>
            <input id="verify-agent-id" name="agent" defaultValue={normalizedAgentId} placeholder="Ex. AG-HOM-0248" className={`${INPUT_CLASS} mt-1.5 font-mono uppercase`} />
          </div>
          <div>
            <label htmlFor="verify-property-ref" className="block text-note font-semibold text-foreground">Référence du bien</label>
            <input id="verify-property-ref" name="bien" defaultValue={normalizedPropertyRef} placeholder="Ex. HOM-CTN-000104" className={`${INPUT_CLASS} mt-1.5 font-mono uppercase`} />
          </div>
          <button type="submit" className={BUTTON_PRIMARY}>
            <Search className="h-4 w-4" aria-hidden="true" />Vérifier
          </button>
        </form>
      </section>
      <section className={`rounded-card border p-6 shadow-card sm:p-8 ${active ? "border-success/25 bg-success/[0.035]" : "border-warning/30 bg-warning/[0.045]"}`} aria-live="polite">
        <div className="flex items-start gap-4"><span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${active ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>{active ? <ShieldCheck className="h-6 w-6" aria-hidden="true" /> : <ShieldAlert className="h-6 w-6" aria-hidden="true" />}</span><div><p className={`text-caption font-semibold uppercase tracking-[0.16em] ${active ? "text-success" : "text-warning"}`}>{!searched ? "Recherche à compléter" : active ? title : check ? "Mandat inactif" : "Aucun résultat correspondant"}</p><h2 className="mt-2 font-serif text-display-sm">{active ? "Cet agent est habilité sur ce bien" : "Ne considérez pas l’agent comme autorisé"}</h2><p className="mt-3 text-body-sm leading-relaxed text-muted">{!searched ? "Renseignez le matricule de l’agent et la référence du bien pour interroger le registre." : active ? "Le mandat est actif à la date du jour dans le registre HOMERA. Cette page atteste de l’habilitation sur ce bien, elle ne remplace pas la présentation de l’original signé." : check ? `Le registre connaît une autorisation pour ce couple, mais son statut est « ${STATUS_LABELS[check.status] ?? check.status} ». Ne considérez pas l’agent comme autorisé ; demandez une preuve valide.` : "Aucun mandat ne correspond à ce couple agent / bien dans le registre HOMERA. Demandez à voir une autorisation signée et contactez HOMERA avant toute démarche."}</p></div></div>
        {active && check && <div className="mt-7 grid gap-3 sm:grid-cols-2"><Info icon={UserRound} label="Agent" value={`${check.agentName} · ${check.matricule}`} /><Info icon={BadgeCheck} label="Statut" value={STATUS_LABELS[check.status] ?? check.status} /><Info icon={MapPin} label="Bien représenté" value={`${check.propertyTitle} · ${check.propertyReference}`} /><Info icon={BadgeCheck} label="Nature du mandat" value={MANDATE_TYPE_LABELS[check.mandateType] ?? check.mandateType} /><Info icon={CalendarDays} label="Effet" value={formatDate(check.startsAt)} /><Info icon={CalendarDays} label="Échéance" value={formatDate(check.expiresAt)} /><div className="sm:col-span-2 rounded-xl border border-border bg-card p-4"><p className="text-caption font-semibold uppercase tracking-[0.13em] text-muted">Périmètre du mandat</p><p className="mt-1 text-note leading-relaxed">{check.scope.length ? check.scope.join(", ") : "Périmètre non précisé sur le mandat."}</p></div></div>}
      </section>
      <div className="mt-6 grid gap-5 sm:grid-cols-2"><aside className="rounded-card border border-border bg-card p-5"><h2 className="font-serif text-display-xs">Avant de vous engager</h2><ul className="mt-3 space-y-2 text-caption leading-relaxed text-muted"><li>• Demandez l’original du mandat et une pièce d’identité.</li><li>• Vérifiez que la référence inscrite sur le document correspond au bien visité.</li><li>• Ne payez aucun frais de visite non annoncé par un canal officiel.</li></ul></aside><aside className="rounded-card border border-border bg-card p-5"><h2 className="font-serif text-display-xs">Poursuivre</h2><p className="mt-2 text-caption leading-relaxed text-muted">Retrouvez la fiche publique du bien ou découvrez comment HOMERA présente le protocole de contrôle.</p><div className="mt-4 flex flex-wrap gap-2">{check && <Link href={`/biens/${check.propertyId}`} className="inline-flex min-h-10 items-center gap-2 rounded-btn homera-cta px-3 text-caption font-semibold text-white">Fiche du bien<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>}<Link href="/services" className="inline-flex min-h-10 items-center gap-2 rounded-btn border border-border px-3 text-caption font-semibold hover:border-homera-terracotta">Méthode HOMERA<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link></div></aside></div>
      <p className="mt-6 text-caption leading-relaxed text-muted">Le registre consulté est celui des autorisations réellement enregistrées par HOMERA : statuts, révocations et expirations y sont tenus à jour, et chaque décision est journalisée côté serveur.</p>
    </div>
  </>;
}
function Info({ icon: Icon, label, value }: { icon: typeof BadgeCheck; label: string; value: string }) { return <div className="flex gap-3 rounded-xl border border-border bg-card p-4"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-homera-terracotta" aria-hidden="true" /><div><p className="text-micro font-semibold uppercase tracking-[0.13em] text-muted">{label}</p><p className="mt-1 text-note font-medium">{value}</p></div></div>; }
function formatDate(value: string): string { const [year, month, day] = value.split("-").map(Number); return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, (month || 1) - 1, day || 1))); }
