"use client";

import Link from "next/link";
import { ArrowRight, CreditCard, Info, Landmark, Receipt, ShieldCheck, Smartphone } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useServerResource } from "@/lib/use-server-resource";
import { CLIENT_PAYMENT_PROVIDERS, PAYOUT_RECEPTION_PROVIDERS } from "@/lib/workflow";
import { BUTTON_SECONDARY, WorkspaceHeading, WorkspacePanel } from "@/components/workspace/Primitives";

/* ==================================================================
   HOMERA — PAIEMENTS : CE QUI EST DÛ, RIEN DE PLUS
   ------------------------------------------------------------------
   HOMERA n’encaisse pas encore de paiement en ligne et ne dispose
   d’aucun solde à afficher. Ce panneau ne montre donc que des sommes
   réellement écrites dans un contrat signé, et n’affiche aucun bouton
   qui simulerait un débit, un encaissement ou un retrait.

   Tant qu’un prestataire de paiement (MTN MoMo, Moov Money, Celtiis
   Cash, carte ou virement UEMOA) n’est pas branché côté serveur, la
   seule action honnête est d’indiquer la marche à suivre et de
   renvoyer vers le contrat et vers HOMERA.
   ================================================================== */

type ServerContract = {
  id: string;
  reference: string;
  propertyId: string;
  propertyTitle: string;
  propertyReference: string;
  propertyCity: string;
  status: string;
  rent: number;
  deposit: number;
  startDate: string;
  endDate: string;
  duration: string;
  signedAt: string | null;
  canSign: boolean;
};

type Role = "client" | "proprietaire" | "agent" | "admin";

function formatMoney(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(value));
}

function frenchDate(iso: string | null): string {
  if (!iso) return "date à confirmer";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "date à confirmer";
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function ChannelIcon({ category }: { category: string }) {
  if (category === "mobile-money") return <Smartphone className="h-4 w-4" aria-hidden="true" />;
  if (category === "carte") return <CreditCard className="h-4 w-4" aria-hidden="true" />;
  return <Landmark className="h-4 w-4" aria-hidden="true" />;
}

export function PaymentMethodsWorkspace({
  contextRole = "client",
  agentId,
  embedded = false,
}: {
  contextRole?: Role;
  agentId?: string;
  embedded?: boolean;
}) {
  const { account } = useAuth();
  const contracts = useServerResource<{ contracts: ServerContract[] }>("/api/contracts");

  const all = contracts.data?.contracts ?? [];
  const signed = all.filter((entry) => entry.status === "signe");
  const isPayoutContext = contextRole === "proprietaire" || contextRole === "agent";
  const channelList = isPayoutContext ? PAYOUT_RECEPTION_PROVIDERS : CLIENT_PAYMENT_PROVIDERS;

  const heading = isPayoutContext
    ? {
        eyebrow: contextRole === "agent" ? "Rémunérations sur mandats" : "Revenus locatifs",
        title: "Versements et commissions",
        description:
          "Les sommes ci-dessous sont celles qu’un contrat signé prévoit. HOMERA n’a encore encaissé aucun fonds : aucun solde, aucun retrait ni aucune quittance ne peut donc être affiché.",
      }
    : {
        eyebrow: "Paiements",
        title: "Ce que vous devez régler",
        description:
          "Uniquement les sommes prévues par vos contrats signés. HOMERA n’encaisse pas encore de paiement en ligne : vous trouverez ici le montant exact et la marche à suivre.",
      };

  return (
    <div className="space-y-6">
      {!embedded && (
        <WorkspaceHeading eyebrow={heading.eyebrow} title={heading.title} description={heading.description} />
      )}

      <p className="flex items-start gap-2 rounded-2xl border border-info/25 bg-info/[0.06] px-4 py-3 text-caption leading-relaxed text-muted">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden="true" />
        <span>
          Aucun paiement, encaissement ou retrait n’est possible depuis HOMERA pour le moment : le raccordement aux
          prestataires béninois (MTN MoMo, Moov Money, Celtiis Cash, carte bancaire, virement UEMOA) n’est pas encore
          ouvert. Aucun montant n’est donc marqué « payé » ici — seul ce qu’un contrat signé prévoit est affiché.
        </span>
      </p>

      {contracts.loading ? (
        <p className="rounded-2xl border border-dashed border-border bg-background/60 p-6 text-caption text-muted">
          Lecture de vos contrats en cours…
        </p>
      ) : contracts.error ? (
        <p className="rounded-2xl border border-warning/30 bg-warning/[0.06] p-6 text-caption text-foreground">
          {contracts.error}
        </p>
      ) : signed.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-background/60 p-6">
          <p className="text-note font-semibold text-foreground">Aucune somme à régler pour le moment</p>
          <p className="mt-1 max-w-2xl text-caption leading-relaxed text-muted">
            {isPayoutContext
              ? "Aucun contrat signé n’est rattaché à vos biens ou à vos mandats : il n’y a donc aucun loyer, aucune caution ni aucune commission à suivre."
              : "Dans HOMERA, le règlement suit l’avancement réel du dossier : recherche → visite → demande de location → signature du contrat. Aucune somme n’est due avant la signature."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={isPayoutContext ? "/proprietaire/contrats" : "/client/contrats"} className={BUTTON_SECONDARY}>
              Voir mes contrats
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      ) : (
        <WorkspacePanel
          title={isPayoutContext ? "Montants prévus par vos contrats signés" : "Montants prévus par vos contrats"}
          description="Loyer et dépôt de garantie tels qu’écrits au contrat. Le règlement s’effectue auprès d’HOMERA, jamais sur cette page."
          icon={Receipt}
        >
          <ul className="space-y-3">
            {signed.map((contract) => (
              <li
                key={contract.id}
                className="rounded-2xl border border-border bg-background p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-micro font-semibold text-homera-terracotta">
                      {contract.reference} · {contract.propertyReference}
                    </p>
                    <h3 className="mt-1 text-note font-semibold text-foreground">
                      {contract.propertyTitle} — {contract.propertyCity}
                    </h3>
                    <p className="mt-1 text-caption text-muted">
                      Signé le {frenchDate(contract.signedAt)} · {contract.duration} à partir du{" "}
                      {frenchDate(contract.startDate)}
                    </p>
                  </div>
                  <span className="rounded-full border border-warning/30 bg-warning/[0.08] px-2.5 py-0.5 text-micro font-semibold text-warning">
                    À régler auprès d’HOMERA
                  </span>
                </div>
                <dl className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-3">
                  <div>
                    <dt className="text-caption text-muted">Loyer</dt>
                    <dd className="homera-num text-note font-bold text-foreground">
                      {formatMoney(contract.rent)} FCFA
                    </dd>
                  </div>
                  <div>
                    <dt className="text-caption text-muted">Dépôt de garantie</dt>
                    <dd className="homera-num text-note font-bold text-foreground">
                      {formatMoney(contract.deposit)} FCFA
                    </dd>
                  </div>
                  <div>
                    <dt className="text-caption text-muted">Échéance</dt>
                    <dd className="text-note font-semibold text-foreground">Jusqu’au {frenchDate(contract.endDate)}</dd>
                  </div>
                </dl>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={
                      contextRole === "client" ? `/client/contrats/${contract.id}` : `/proprietaire/contrats/${contract.id}`
                    }
                    className={BUTTON_SECONDARY}
                  >
                    Ouvrir le contrat
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  <Link href={`/contact?objet=paiement&contrat=${contract.reference}`} className={BUTTON_SECONDARY}>
                    Organiser le règlement avec HOMERA
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </WorkspacePanel>
      )}

      <WorkspacePanel
        title={isPayoutContext ? "Canaux de versement prévus" : "Canaux de règlement prévus"}
        description="Canaux annoncés pour le pilote béninois. Aucun n’est encore actif : HOMERA n’utilise ces informations que pour préparer le raccordement."
        icon={ShieldCheck}
      >
        <ul className="grid gap-3 sm:grid-cols-2">
          {channelList.map((channel) => (
            <li key={channel.id} className="flex items-start gap-3 rounded-2xl border border-border bg-background p-4">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-homera-terracotta/[0.08] text-homera-terracotta">
                <ChannelIcon category={channel.category} />
              </span>
              <div className="min-w-0">
                <p className="text-note font-semibold text-foreground">{channel.label}</p>
                <p className="mt-0.5 text-caption text-muted">{channel.description}</p>
              </div>
            </li>
          ))}
        </ul>
        {isPayoutContext ? (
          <p className="mt-4 rounded-2xl border border-border bg-background/60 p-4 text-caption leading-relaxed text-muted">
            <strong className="text-foreground">Règle économique HOMERA :</strong> l’habilitation d’un agent sur un bien
            autorise les visites et le suivi opérationnel, mais ne crée jamais un droit automatique à percevoir des fonds.
            Seules les opérations rattachées à votre matricule{agentId ? ` (${agentId})` : ""} et à une commission prévue
            ouvrent un versement, après encaissement réel et confirmation bancaire.
          </p>
        ) : null}
        {account && !isPayoutContext ? (
          <p className="mt-4 text-caption text-muted">
            Une question sur une somme due ? Écrivez à HOMERA depuis la messagerie de votre espace, ou utilisez le lien
            « Organiser le règlement » ci-dessus : un conseiller vous rappelle la procédure et la référence à rappeler.
          </p>
        ) : null}
      </WorkspacePanel>
    </div>
  );
}
