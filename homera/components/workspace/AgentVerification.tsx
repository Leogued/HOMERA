import Link from "next/link";
import { ArrowRight, BadgeCheck, CalendarDays, FileCheck2, MapPin, Search, ShieldAlert, ShieldCheck, UserRound } from "lucide-react";
import { PROPERTIES } from "@/lib/content";
import { DEMO_AGENT_AUTHORIZATIONS, DEMO_AGENT_NAME, isAgentAuthorizationCurrent } from "@/lib/portal-data";
import { PageHero } from "@/components/catalog/PageHero";
import { BUTTON_PRIMARY, BUTTON_SECONDARY, INPUT_CLASS } from "@/components/workspace/Primitives";

export function AgentVerification({ agentId = "", propertyRef = "" }: { agentId?: string; propertyRef?: string }) {
  const normalizedAgentId = agentId.trim().toUpperCase();
  const normalizedPropertyRef = propertyRef.trim().toUpperCase();
  const authorization = DEMO_AGENT_AUTHORIZATIONS.find(
    (entry) => entry.agentId.toUpperCase() === normalizedAgentId && entry.propertyRef.toUpperCase() === normalizedPropertyRef,
  );
  const active = authorization ? isAgentAuthorizationCurrent(authorization) : false;
  const property = authorization ? PROPERTIES.find((entry) => entry.id === authorization.propertyId) : undefined;
  const title = active ? "Autorisation retrouvée" : authorization ? "Autorisation inactive" : "Autorisation non confirmée";
  return <>
    <PageHero crumbs={[{ label: "Accueil", href: "/" }, { label: "Vérification d’un agent" }]} eyebrow="Contrôle public" title="Vérifier un agent sur un bien précis" intro="La validité d’un mandat dépend du représentant, de la référence de bien et de sa période. Une identité seule ne donne pas accès à toutes les annonces." facts={[{ label: "Agent", value: normalizedAgentId || "Non renseigné" }, { label: "Référence du bien", value: normalizedPropertyRef || "Non renseignée" }, { label: "Résultat", value: active ? "Mandat actif (démo)" : authorization ? "Mandat inactif ou hors période" : "Non confirmé" }]} />
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-10 sm:px-6 lg:px-8">
      <section className="mb-6 rounded-card border border-border bg-card p-6 shadow-card sm:p-8" aria-labelledby="agent-verification-form-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-label uppercase text-homera-terracotta">Recherche dans le registre pilote</p>
            <h2 id="agent-verification-form-title" className="mt-1 font-serif text-display-xs">Interroger un couple matricule / bien</h2>
            <p className="mt-1 text-caption leading-relaxed text-muted">Saisissez le matricule figurant sur le badge de l’agent et la référence HOMERA du bien, ou testez un exemple du jeu de démonstration.</p>
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
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <span className="text-micro font-semibold uppercase tracking-[0.14em] text-muted">Exemples pilotes :</span>
          {DEMO_AGENT_AUTHORIZATIONS.map((sample) => (
            <Link
              key={`${sample.agentId}-${sample.propertyRef}`}
              href={`/verification-agent?agent=${encodeURIComponent(sample.agentId)}&bien=${encodeURIComponent(sample.propertyRef)}`}
              className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 font-mono text-micro font-semibold text-foreground transition-colors hover:border-homera-terracotta/45 hover:text-homera-terracotta"
            >
              {sample.agentId} · {sample.propertyRef}
            </Link>
          ))}
        </div>
      </section>
      <section className={`rounded-card border p-6 shadow-card sm:p-8 ${active ? "border-success/25 bg-success/[0.035]" : "border-warning/30 bg-warning/[0.045]"}`} aria-live="polite">
        <div className="flex items-start gap-4"><span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${active ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>{active ? <ShieldCheck className="h-6 w-6" aria-hidden="true" /> : <ShieldAlert className="h-6 w-6" aria-hidden="true" />}</span><div><p className={`text-caption font-semibold uppercase tracking-[0.16em] ${active ? "text-success" : "text-warning"}`}>{active ? title : authorization ? "Mandat inactif" : "Aucun résultat correspondant"}</p><h2 className="mt-2 font-serif text-display-sm">{active ? "Cet agent est associé à ce mandat (pilote)" : "Ne considérez pas l’agent comme autorisé"}</h2><p className="mt-3 text-body-sm leading-relaxed text-muted">{active ? "Une entrée de démonstration correspond au matricule, au bien et à une période active. Cette page ne prouve pas l’authenticité du mandat original." : authorization ? "Une entrée correspond à ce bien, mais le mandat n’est pas actif aujourd’hui ou a été révoqué. Ne considérez pas l’agent comme autorisé ; demandez une preuve valide." : "Le couple agent / référence n’a pas été trouvé dans les données de démonstration. Demandez à voir une autorisation signée et contactez HOMERA avant toute démarche."}</p></div></div>
        {active && authorization && <div className="mt-7 grid gap-3 sm:grid-cols-2"><Info icon={UserRound} label="Agent" value={`${authorization.agentName} · ${authorization.agentId}`} /><Info icon={BadgeCheck} label="Statut" value="Actif dans le registre pilote" /><Info icon={MapPin} label="Bien représenté" value={`${property?.title ?? normalizedPropertyRef} · ${authorization.propertyRef}`} /><Info icon={FileCheck2} label="Preuve déclarée" value={authorization.proof} /><Info icon={CalendarDays} label="Date d’autorisation" value={formatDate(authorization.authorizedAt)} /><Info icon={CalendarDays} label="Expiration" value={formatDate(authorization.expiresAt)} /><div className="sm:col-span-2 rounded-xl border border-border bg-card p-4"><p className="text-caption font-semibold uppercase tracking-[0.13em] text-muted">Périmètre du mandat</p><p className="mt-1 text-note leading-relaxed">{authorization.scope}</p></div></div>}
      </section>
      <div className="mt-6 grid gap-5 sm:grid-cols-2"><aside className="rounded-card border border-border bg-card p-5"><h2 className="font-serif text-display-xs">Avant de vous engager</h2><ul className="mt-3 space-y-2 text-caption leading-relaxed text-muted"><li>• Demandez l’original du mandat et une pièce d’identité.</li><li>• Vérifiez que la référence inscrite sur le document correspond au bien visité.</li><li>• Ne payez aucun frais de visite non annoncé par un canal officiel.</li></ul></aside><aside className="rounded-card border border-border bg-card p-5"><h2 className="font-serif text-display-xs">Poursuivre</h2><p className="mt-2 text-caption leading-relaxed text-muted">Retrouvez la fiche publique du bien ou découvrez comment HOMERA présente le protocole de contrôle.</p><div className="mt-4 flex flex-wrap gap-2">{property && <Link href={`/biens/${property.id}`} className="inline-flex min-h-10 items-center gap-2 rounded-btn homera-cta px-3 text-caption font-semibold text-white">Fiche du bien<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>}<Link href="/services" className="inline-flex min-h-10 items-center gap-2 rounded-btn border border-border px-3 text-caption font-semibold hover:border-homera-terracotta">Méthode HOMERA<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link></div></aside></div>
      <p className="mt-6 text-caption leading-relaxed text-muted">Vérification du prototype HOMERA · agent de démonstration : {DEMO_AGENT_NAME}. Les registres réels, signatures, révocations et journaux d’audit nécessitent une API sécurisée.</p>
    </div>
  </>;
}
function Info({ icon: Icon, label, value }: { icon: typeof BadgeCheck; label: string; value: string }) { return <div className="flex gap-3 rounded-xl border border-border bg-card p-4"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-homera-terracotta" aria-hidden="true" /><div><p className="text-micro font-semibold uppercase tracking-[0.13em] text-muted">{label}</p><p className="mt-1 text-note font-medium">{value}</p></div></div>; }
function formatDate(value: string): string { const [year, month, day] = value.split("-").map(Number); return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, (month || 1) - 1, day || 1))); }
