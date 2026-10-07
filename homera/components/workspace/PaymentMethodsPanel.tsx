"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  CreditCard,
  Download,
  Landmark,
  Lock,
  Plus,
  Receipt,
  ShieldCheck,
  Smartphone,
  Star,
  Trash2,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useWorkflow } from "@/components/providers/WorkflowProvider";
import {
  CLIENT_PAYMENT_PROVIDERS,
  PAYMENT_PROVIDERS,
  PAYOUT_RECEPTION_PROVIDERS,
  UEMOA_BANKS,
  canClientPayContract,
  computeActorBalances,
  computeFinancialBreakdown,
  createLocalId,
  makeNotification,
  maskPaymentIdentifier,
  type PaymentMethodUsage,
  type PaymentProviderId,
  type PaymentTransactionKind,
  type PaymentTransactionRecord,
  type SavedPaymentMethod,
  type WithdrawalRecord,
  type WithdrawalStatus,
} from "@/lib/workflow";
import {
  BUTTON_PRIMARY,
  BUTTON_SECONDARY,
  DemoNotice,
  FormField,
  INPUT_CLASS,
  MetricCard,
  WorkspaceHeading,
  WorkspacePanel,
} from "@/components/workspace/Primitives";

const TRANSACTION_KIND_LABELS: Record<PaymentTransactionKind, string> = {
  loyer: "Location longue durée",
  caution: "Dépôt de garantie",
  abonnement: "Abonnement / service HOMERA",
  reservation: "Réservation court séjour",
  visite: "Frais de visite",
  vente: "Transaction de vente",
};

const WITHDRAWAL_STATUS_LABELS: Record<WithdrawalStatus, string> = {
  "en-attente": "Retrait en attente",
  "en-cours": "Retrait en cours",
  effectue: "Retrait effectué",
  refuse: "Retrait refusé",
  echoue: "Retrait échoué",
  annule: "Retrait annulé",
};

function formatMoney(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(value));
}

function providerSpec(id: PaymentProviderId) {
  return PAYMENT_PROVIDERS.find((entry) => entry.id === id) ?? PAYMENT_PROVIDERS[0];
}

function ProviderIcon({ provider }: { provider: PaymentProviderId }) {
  const spec = providerSpec(provider);
  if (spec.category === "mobile-money") return <Smartphone className="h-4 w-4" aria-hidden="true" />;
  if (spec.category === "carte") return <CreditCard className="h-4 w-4" aria-hidden="true" />;
  return <Landmark className="h-4 w-4" aria-hidden="true" />;
}

export function PaymentMethodsWorkspace({
  contextRole = "client",
  agentId,
  embedded = false,
}: {
  contextRole?: "client" | "proprietaire" | "agent" | "admin";
  agentId?: string;
  embedded?: boolean;
}) {
  const { account } = useAuth();
  const { data, updateData } = useWorkflow();

  const isPayoutContext = contextRole === "proprietaire" || contextRole === "agent";
  const availableProviders = isPayoutContext ? PAYOUT_RECEPTION_PROVIDERS : CLIENT_PAYMENT_PROVIDERS;
  const defaultHolder = account ? `${account.prenom} ${account.nom}`.trim() : "";
  const defaultUsage: PaymentMethodUsage = isPayoutContext ? "reversement" : "paiement";

  const [provider, setProvider] = useState<PaymentProviderId>("mtn-momo");
  const [holderName, setHolderName] = useState(defaultHolder);
  const [identifier, setIdentifier] = useState("");
  const [bankName, setBankName] = useState<string>(UEMOA_BANKS[0]);
  const [expiry, setExpiry] = useState("");
  const [makeDefault, setMakeDefault] = useState(true);
  const [formError, setFormError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [txFilter, setTxFilter] = useState<"all" | PaymentTransactionKind>("all");

  const activeSpec = providerSpec(provider);
  const roleMethods = data.paymentMethods.filter((method) =>
    isPayoutContext
      ? (method.usage === "reversement" || method.usage === "mixte") &&
        providerSpec(method.provider).supportsPayoutWithdrawal
      : method.usage === "paiement" || method.usage === "mixte",
  );
  const savedMethods = roleMethods.length > 0 ? roleMethods : data.paymentMethods;
  const defaultMethod = savedMethods.find((entry) => entry.isDefault) ?? savedMethods[0];
  const effectiveMethod = defaultMethod;

  // Balances for Propriétaire / Agent / Admin (never exposed to Client)
  const actorBalances =
    contextRole === "proprietaire" || contextRole === "agent" || contextRole === "admin"
      ? computeActorBalances(data.transactions, data.withdrawals, contextRole, agentId)
      : null;

  // Client payable operations strictly derived from signed contracts in the workflow
  const signedContracts = data.contracts.filter((contract) => contract.status === "signe");
  const clientPayableItems = signedContracts.flatMap((contract) => {
    const rentCheck = canClientPayContract(contract, data.transactions, "loyer");
    const depositCheck = canClientPayContract(contract, data.transactions, "caution");
    const items: {
      key: string;
      contractId: string;
      propertyId: string;
      propertyRef: string;
      propertyTitle: string;
      kind: "loyer" | "caution";
      amount: number;
      buttonLabel: string;
    }[] = [];
    if (rentCheck.allowed) {
      items.push({
        key: `${contract.id}-loyer`,
        contractId: contract.id,
        propertyId: contract.propertyId,
        propertyRef: contract.propertyRef,
        propertyTitle: contract.propertyTitle,
        kind: "loyer",
        amount: rentCheck.amount,
        buttonLabel: rentCheck.contextualLabel,
      });
    }
    if (depositCheck.allowed) {
      items.push({
        key: `${contract.id}-caution`,
        contractId: contract.id,
        propertyId: contract.propertyId,
        propertyRef: contract.propertyRef,
        propertyTitle: contract.propertyTitle,
        kind: "caution",
        amount: depositCheck.amount,
        buttonLabel: depositCheck.contextualLabel,
      });
    }
    return items;
  });

  // Actor-specific transaction visibility (Section 13 & 15: Transparence & Confidentialité)
  const visibleTransactions = data.transactions.filter((tx) => {
    if (contextRole === "agent") {
      return Boolean(agentId) && tx.agentId === agentId && (tx.agentAmount ?? 0) > 0;
    }
    if (contextRole === "proprietaire") {
      return tx.kind !== "visite" || (tx.ownerNetAmount ?? 0) > 0;
    }
    return true;
  });

  const filteredTransactions =
    txFilter === "all"
      ? visibleTransactions
      : visibleTransactions.filter((tx) => tx.kind === txFilter);

  const handleAddMethod = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    setFeedback("");

    const cleanHolder = (holderName || defaultHolder || "Titulaire HOMERA").trim();
    const cleanId = identifier.trim();

    if (!cleanHolder) {
      setFormError("Indiquez le nom complet du titulaire du compte ou de la carte.");
      return;
    }

    if (isPayoutContext && !activeSpec.supportsPayoutWithdrawal) {
      setFormError("Ce canal ne permet pas la réception de fonds ou le retrait. Choisissez Mobile Money ou un virement UEMOA.");
      return;
    }

    if (activeSpec.category === "mobile-money") {
      const digits = cleanId.replace(/\D/g, "");
      if (digits.length < 8) {
        setFormError("Saisissez un numéro Mobile Money béninois valide (au moins 8 chiffres, ex. +229 01 97 00 00 00).");
        return;
      }
    } else if (activeSpec.category === "carte") {
      const digits = cleanId.replace(/\D/g, "");
      if (digits.length < 4) {
        setFormError("Indiquez les 4 derniers chiffres de la carte bancaire.");
        return;
      }
    } else if (cleanId.replace(/\s+/g, "").length < 8) {
      setFormError("Indiquez un identifiant RIB ou IBAN UEMOA valide (ex. BJ06 0001 ...).");
      return;
    }

    const masked = maskPaymentIdentifier(
      provider,
      cleanId,
      activeSpec.category === "virement" ? bankName : undefined,
    );

    const newMethod: SavedPaymentMethod = {
      id: createLocalId("pm"),
      provider,
      holderName: cleanHolder,
      maskedIdentifier: masked,
      bankOrNetwork: activeSpec.category === "virement" ? bankName : activeSpec.shortLabel,
      expiry: activeSpec.category === "carte" && expiry.trim() ? expiry.trim() : undefined,
      usage: defaultUsage,
      isDefault: makeDefault || data.paymentMethods.length === 0,
      createdAt: new Date().toISOString(),
    };

    updateData((current) => {
      const existing = newMethod.isDefault
        ? current.paymentMethods.map((item) => ({ ...item, isDefault: false }))
        : current.paymentMethods;
      return {
        ...current,
        paymentMethods: [newMethod, ...existing],
        notifications: [
          makeNotification(
            "systeme",
            isPayoutContext ? "Compte de réception enregistré" : "Moyen de paiement enregistré",
            `${activeSpec.shortLabel} (${masked}) ajouté à votre espace.`,
            contextRole === "proprietaire" ? "/proprietaire/abonnement" : "/client/paiements",
          ),
          ...current.notifications,
        ],
      };
    });

    setIdentifier("");
    setExpiry("");
    setFeedback(`${activeSpec.label} (${masked}) a été enregistré dans ce navigateur.`);
  };

  const handleSetDefault = (id: string) => {
    updateData((current) => ({
      ...current,
      paymentMethods: current.paymentMethods.map((item) => ({
        ...item,
        isDefault: item.id === id,
      })),
    }));
    setFeedback("Le moyen par défaut a été mis à jour.");
  };

  const handleRemove = (id: string) => {
    updateData((current) => {
      const remaining = current.paymentMethods.filter((item) => item.id !== id);
      if (remaining.length > 0 && !remaining.some((item) => item.isDefault)) {
        remaining[0] = { ...remaining[0], isDefault: true };
      }
      return {
        ...current,
        paymentMethods: remaining,
      };
    });
    setFeedback("Le moyen enregistré a été retiré de ce navigateur.");
  };

  const handlePayDueContractItem = (item: (typeof clientPayableItems)[number]) => {
    const chosenProvider = effectiveMethod ? effectiveMethod.provider : provider;
    const chosenSpec = providerSpec(chosenProvider);
    const summary = effectiveMethod
      ? `${chosenSpec.shortLabel} · ${effectiveMethod.maskedIdentifier}`
      : `${chosenSpec.shortLabel} · règlement direct`;
    const now = new Date().toISOString();
    const reference = createLocalId("PAY-CTN").toUpperCase();
    const split = computeFinancialBreakdown(item.kind, item.amount);
    const txStatus = chosenProvider === "virement-uemoa" ? "en-verification" : "confirme";

    const record: PaymentTransactionRecord = {
      id: createLocalId("tx"),
      reference,
      kind: item.kind,
      label: `${item.kind === "caution" ? "Dépôt de garantie" : "Loyer contractuel"} · ${item.propertyTitle}`,
      amount: item.amount,
      homeraFee: split.homeraFee,
      ownerNetAmount: split.ownerNetAmount,
      agentAmount: split.agentAmount,
      provider: chosenProvider,
      methodSummary: summary,
      propertyId: item.propertyId,
      propertyRef: item.propertyRef,
      contractId: item.contractId,
      status: txStatus,
      fundsAvailability: txStatus === "confirme" ? "disponible" : "en-attente",
      createdAt: now,
    };

    updateData((current) => ({
      ...current,
      transactions: [record, ...current.transactions],
      notifications: [
        makeNotification(
          "contrat",
          `Paiement enregistré (${reference})`,
          `${formatMoney(item.amount)} FCFA · ${item.propertyRef} via HOMERA`,
          "/client/paiements",
        ),
        ...current.notifications,
      ],
    }));

    setFeedback(
      `Opération ${reference} (${formatMoney(item.amount)} FCFA) enregistrée via HOMERA pour le dossier ${item.propertyRef}.`,
    );
  };

  const handleRequestWithdrawal = () => {
    if (!actorBalances || !actorBalances.canWithdraw || actorBalances.availableAmount <= 0) return;
    if (contextRole !== "proprietaire" && contextRole !== "agent") return;

    const payoutMethod = roleMethods.find((m) => m.isDefault) ?? roleMethods[0];
    if (!payoutMethod) {
      setFormError("Enregistrez d’abord un compte de réception Mobile Money ou RIB UEMOA avant de demander un retrait.");
      return;
    }

    const spec = providerSpec(payoutMethod.provider);
    const reference = createLocalId("RET-HOM").toUpperCase();
    const amountToWithdraw = actorBalances.availableAmount;
    const withdrawal: WithdrawalRecord = {
      id: createLocalId("ret"),
      reference,
      actorRole: contextRole,
      agentId: contextRole === "agent" ? agentId : undefined,
      amount: amountToWithdraw,
      destinationSummary: `${spec.shortLabel} · ${payoutMethod.maskedIdentifier}`,
      status: "effectue",
      createdAt: new Date().toISOString(),
    };

    updateData((current) => ({
      ...current,
      withdrawals: [withdrawal, ...current.withdrawals],
      notifications: [
        makeNotification(
          "systeme",
          `Retrait effectué (${reference})`,
          `${formatMoney(amountToWithdraw)} FCFA vers ${withdrawal.destinationSummary}`,
          contextRole === "proprietaire" ? "/proprietaire/abonnement" : "/agent",
        ),
        ...current.notifications,
      ],
    }));

    setFeedback(
      `Retrait ${reference} de ${formatMoney(amountToWithdraw)} FCFA effectué vers ${withdrawal.destinationSummary}.`,
    );
  };

  const downloadReceipt = (tx: PaymentTransactionRecord) => {
    const lines = [
      "HOMERA — JUSTIFICATIF D'OPÉRATION FINANCIÈRE (PILOTE)",
      "=====================================================",
      "",
      `Référence transaction : ${tx.reference}`,
      `Date : ${formatDateTime(tx.createdAt)}`,
      `Opération : ${TRANSACTION_KIND_LABELS[tx.kind]}`,
      `Libellé : ${tx.label}`,
      tx.propertyRef ? `Bien rattaché : ${tx.propertyRef}` : null,
      tx.contractId ? `Contrat rattaché : ${tx.contractId}` : null,
      `Flux : CLIENT -> HOMERA -> Attribution selon contrat`,
      `Canal utilisé : ${tx.methodSummary}`,
      `Statut paiement : ${tx.status === "confirme" ? "Confirmé (aperçu local)" : "En attente de confirmation bancaire"}`,
    ];

    if (contextRole === "client") {
      lines.push(`Montant payé par le client : ${formatMoney(tx.amount)} FCFA`);
    } else if (contextRole === "proprietaire") {
      lines.push(
        `Montant brut encaissé par HOMERA : ${formatMoney(tx.amount)} FCFA`,
        `Frais / commission HOMERA : ${formatMoney(tx.homeraFee ?? 0)} FCFA`,
        `Montant net revenant au propriétaire : ${formatMoney(tx.ownerNetAmount ?? tx.amount)} FCFA`,
        `Disponibilité des fonds : ${tx.status === "confirme" ? "Disponible" : "En attente de confirmation"}`,
      );
    } else if (contextRole === "agent") {
      lines.push(
        `Rémunération agent rattachée au mandat : ${formatMoney(tx.agentAmount ?? 0)} FCFA`,
        `Disponibilité : ${tx.status === "confirme" ? "Disponible" : "En attente de confirmation"}`,
      );
    } else {
      lines.push(
        `Montant brut payé : ${formatMoney(tx.amount)} FCFA`,
        `Part HOMERA : ${formatMoney(tx.homeraFee ?? 0)} FCFA`,
        `Part Propriétaire : ${formatMoney(tx.ownerNetAmount ?? 0)} FCFA`,
        `Part Agent autorisé : ${formatMoney(tx.agentAmount ?? 0)} FCFA`,
      );
    }

    lines.push(
      "",
      "Note importante : Ce document est généré dans l'environnement pilote HOMERA.",
      "Aucun débit bancaire ni prélèvement Mobile Money réel n'a été exécuté.",
    );

    const blob = new Blob([lines.filter(Boolean).join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `HOMERA-${tx.reference}-justificatif.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {!embedded && (
        <WorkspaceHeading
          eyebrow={
            contextRole === "proprietaire"
              ? "Revenus, Commissions & Retraits Propriétaire"
              : contextRole === "agent"
                ? "Rémunérations sur mandats & Retraits Agent"
                : contextRole === "admin"
                  ? "Supervision des Flux Financiers HOMERA"
                  : "Paiements & Quittances Client"
          }
          title={
            isPayoutContext
              ? "Flux financiers & comptes de réception"
              : "Moyens de paiement & échéances"
          }
          description={
            contextRole === "client"
              ? "Consultez uniquement les sommes réellement exigibles sur vos dossiers validés et gérez vos moyens de paiement (MTN MoMo, Moov Money, Celtiis Cash, Carte bancaire, Virement UEMOA)."
              : "Chaque transaction passe par HOMERA (Client → HOMERA → Attribution des montants → Disponibilité → Retrait). Une somme en attente de confirmation n’est jamais considérée comme disponible."
          }
        />
      )}

      <DemoNotice>
        Environnement pilote : chaque opération financière est rattachée à un bien, un acteur et une étape réelle du workflow HOMERA. Seuls des identifiants masqués sont conservés dans ce navigateur et aucun prélèvement réel n’est exécuté.
      </DemoNotice>

      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/[0.06] px-4 py-3 text-note font-medium text-foreground"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
          <span>{feedback}</span>
        </div>
      )}

      {/* PROPRIÉTAIRE / AGENT / ADMIN : Synthèse des soldes (En attente vs Disponible vs Retiré) */}
      {actorBalances && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={Wallet}
              label="Montant disponible"
              value={`${formatMoney(actorBalances.availableAmount)} FCFA`}
              detail={
                actorBalances.availableAmount > 0
                  ? "Fonds confirmés prêts pour retrait"
                  : "Aucun solde confirmé retirable"
              }
            />
            <MetricCard
              icon={Lock}
              label="Montant en attente"
              value={`${formatMoney(actorBalances.pendingAmount)} FCFA`}
              detail="En cours de confirmation · non retirable"
            />
            {contextRole !== "agent" ? (
              <MetricCard
                icon={Receipt}
                label="Commissions & frais HOMERA"
                value={`${formatMoney(actorBalances.homeraRevenueAmount)} FCFA`}
                detail="Part plateforme calculée sur opérations"
              />
            ) : (
              <MetricCard
                icon={ShieldCheck}
                label="Mandat & droit financier"
                value={agentId ?? "Aucun mandat"}
                detail="Autorisation bien ≠ droit automatique"
              />
            )}
            <MetricCard
              icon={Landmark}
              label="Retraits effectués"
              value={`${formatMoney(actorBalances.withdrawnAmount)} FCFA`}
              detail={`${data.withdrawals.filter((w) => w.actorRole === contextRole).length} opération(s) de retrait`}
            />
          </div>

          {contextRole === "agent" && (
            <div className="rounded-2xl border border-border bg-card p-4 text-caption leading-relaxed text-muted">
              <strong className="text-foreground">Règle économique Agent HOMERA :</strong> l’habilitation d’un agent sur un bien autorise les visites et le suivi opérationnel, mais ne crée jamais un droit automatique à percevoir des fonds. Seules les opérations explicitement rattachées à votre matricule ({agentId ?? "non renseigné"}) et à une commission prévue ouvrent un solde disponible après confirmation du paiement par HOMERA.
            </div>
          )}

          {/* Bouton Retirer strictement conditionnel (Section 11 : uniquement si solde > 0 et rôle autorisé) */}
          {(contextRole === "proprietaire" || contextRole === "agent") && (
            <WorkspacePanel
              title="Disponibilité des fonds & retraits"
              description="Flux : Client → HOMERA → Calcul des frais → Attribution → Disponibilité → Retrait sur compte vérifié."
              icon={Landmark}
            >
              {actorBalances.canWithdraw ? (
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-success/30 bg-success/[0.05] p-4">
                  <div>
                    <p className="text-note font-semibold text-foreground">
                      Solde confirmé disponible :{" "}
                      <span className="homera-num font-bold text-success">
                        {formatMoney(actorBalances.availableAmount)} FCFA
                      </span>
                    </p>
                    <p className="mt-1 text-caption text-muted">
                      Compte de réception sélectionné :{" "}
                      {roleMethods.find((m) => m.isDefault)?.maskedIdentifier ??
                        roleMethods[0]?.maskedIdentifier ??
                        "Aucun compte de réception enregistré (ajoutez un numéro Mobile Money ou RIB UEMOA ci-dessous)"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRequestWithdrawal}
                    disabled={roleMethods.length === 0}
                    className={`${BUTTON_PRIMARY} disabled:cursor-not-allowed disabled:opacity-45`}
                  >
                    <Landmark className="h-4 w-4" aria-hidden="true" />
                    Retirer {formatMoney(actorBalances.availableAmount)} FCFA
                  </button>
                </div>
              ) : (
                <div className="flex items-start gap-3 rounded-2xl border border-border bg-background/60 p-4">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                  <div>
                    <p className="text-note font-semibold text-foreground">
                      Aucun retrait déclenchable actuellement
                    </p>
                    <p className="mt-1 text-caption leading-relaxed text-muted">
                      Le bouton de retrait n’apparaît que lorsqu’une somme vous appartient réellement et a atteint l’état{" "}
                      <strong className="text-foreground">Disponible</strong> après confirmation définitive par HOMERA. Les sommes{" "}
                      <strong className="text-foreground">En attente</strong> ({formatMoney(actorBalances.pendingAmount)} FCFA) ne peuvent pas être retirées.
                    </p>
                  </div>
                </div>
              )}

              {data.withdrawals.filter((w) => w.actorRole === contextRole).length > 0 && (
                <ul className="mt-4 space-y-2" aria-label="Historique des retraits">
                  {data.withdrawals
                    .filter((w) => w.actorRole === contextRole)
                    .map((w) => (
                      <li
                        key={w.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3 text-caption"
                      >
                        <div>
                          <span className="font-mono font-semibold text-homera-terracotta">{w.reference}</span>
                          <span className="mx-2 text-muted">·</span>
                          <span className="font-semibold text-foreground">{w.destinationSummary}</span>
                          <span className="ml-2 text-muted">({formatDateTime(w.createdAt)})</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="homera-num font-bold text-foreground">
                            {formatMoney(w.amount)} FCFA
                          </span>
                          <span className="rounded-full border border-success/30 bg-success/[0.08] px-2.5 py-0.5 text-micro font-semibold text-success">
                            {WITHDRAWAL_STATUS_LABELS[w.status]}
                          </span>
                        </div>
                      </li>
                    ))}
                </ul>
              )}
            </WorkspacePanel>
          )}
        </div>
      )}

      {/* CLIENT : Échéances réellement dues issues du workflow (Section 4 & 5 : bouton Payer uniquement si étape validée) */}
      {contextRole === "client" && (
        <WorkspacePanel
          title="Échéances à payer sur vos dossiers"
          description="Un bouton de paiement n’apparaît que lorsqu’une opération validée du parcours (contrat signé) ouvre une somme réellement exigible."
          icon={Building2}
        >
          {clientPayableItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-background/60 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-2xl">
                  <p className="text-note font-semibold text-foreground">
                    Aucune somme exigible à régler pour le moment
                  </p>
                  <p className="mt-1 text-caption leading-relaxed text-muted">
                    Dans HOMERA, le paiement suit strictement l’avancement de votre dossier :{" "}
                    <strong className="text-foreground">
                      Recherche → Visite → Demande de location → Signature du contrat → Paiement sécurisé via HOMERA
                    </strong>
                    . Dès qu’un contrat de location est signé, l’échéance correspondante s’affiche ici avec son montant exact.
                  </p>
                </div>
                <Link href="/client/contrats" className={BUTTON_SECONDARY}>
                  Consulter mes contrats
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {clientPayableItems.map((item) => (
                <article
                  key={item.key}
                  className="flex flex-col justify-between rounded-2xl border border-homera-terracotta/35 bg-background p-5"
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-micro font-semibold text-homera-terracotta">
                        {item.propertyRef} · Contrat {item.contractId}
                      </span>
                      <span className="rounded-full border border-warning/30 bg-warning/[0.08] px-2.5 py-0.5 text-micro font-semibold text-warning">
                        À payer
                      </span>
                    </div>
                    <h3 className="mt-2 text-note font-semibold text-foreground">
                      {item.propertyTitle}
                    </h3>
                    <dl className="mt-3 space-y-1.5 text-caption">
                      <div className="flex items-center justify-between gap-2">
                        <dt className="text-muted">Opération</dt>
                        <dd className="font-semibold text-foreground">
                          {TRANSACTION_KIND_LABELS[item.kind]}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <dt className="text-muted">Encaissement & séquestre</dt>
                        <dd className="font-semibold text-foreground">HOMERA (compte d’opération)</dd>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <dt className="text-muted">Moyen sélectionné</dt>
                        <dd className="font-semibold text-foreground">
                          {effectiveMethod
                            ? `${providerSpec(effectiveMethod.provider).shortLabel} (${effectiveMethod.maskedIdentifier})`
                            : activeSpec.shortLabel}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-2 border-t border-border pt-2">
                        <dt className="font-semibold text-foreground">Montant dû par le client</dt>
                        <dd className="homera-num text-note font-bold text-foreground">
                          {formatMoney(item.amount)} FCFA
                        </dd>
                      </div>
                    </dl>
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePayDueContractItem(item)}
                    className={`${BUTTON_PRIMARY} mt-4 w-full`}
                  >
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    {item.buttonLabel}
                  </button>
                </article>
              ))}
            </div>
          )}
        </WorkspacePanel>
      )}

      {/* SÉLECTION DES CANAUX : Séparation stricte Moyens de paiement Client vs Moyens de réception/retrait (§12) */}
      {contextRole !== "admin" && (
        <>
          <WorkspacePanel
            title={
              isPayoutContext
                ? "Canaux de réception et de retrait autorisés (Bénin & UEMOA)"
                : "Moyens de paiement pris en charge pour le client"
            }
            description={
              isPayoutContext
                ? "Les retraits et reversements s’effectuent vers un portefeuille Mobile Money vérifié ou un compte bancaire UEMOA (les cartes bancaires ne permettent pas la réception de fonds)."
                : "Sélectionnez un canal pour enregistrer un moyen de paiement personnel."
            }
            icon={Wallet}
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {availableProviders.map((item) => {
                const active = provider === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setProvider(item.id);
                      setFormError("");
                    }}
                    aria-pressed={active}
                    className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition-colors ${
                      active
                        ? "border-homera-terracotta bg-homera-terracotta/[0.06] ring-1 ring-homera-terracotta/30"
                        : "border-border bg-background hover:border-homera-terracotta/40 hover:bg-surface-hover"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-card text-homera-terracotta">
                          <ProviderIcon provider={item.id} />
                        </span>
                        <span className="rounded-full border border-border bg-card px-2.5 py-0.5 text-micro font-semibold text-muted">
                          {item.badge}
                        </span>
                      </div>
                      <p className="mt-3 text-note font-semibold text-foreground">{item.shortLabel}</p>
                      <p className="mt-1 text-caption leading-relaxed text-muted">{item.description}</p>
                    </div>
                    <p className="mt-3 text-micro font-semibold uppercase tracking-[0.13em] text-homera-terracotta">
                      {active ? "Canal sélectionné" : "Choisir ce canal"}
                    </p>
                  </button>
                );
              })}
            </div>
          </WorkspacePanel>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <WorkspacePanel
              title={
                isPayoutContext
                  ? `Comptes de réception enregistrés (${savedMethods.length})`
                  : `Moyens de paiement enregistrés (${savedMethods.length})`
              }
              description={
                isPayoutContext
                  ? "Compte utilisé par HOMERA pour vous reverser les sommes disponibles après validation."
                  : "Moyen proposé par défaut lorsqu’une étape de votre parcours autorise un paiement."
              }
              icon={ShieldCheck}
            >
              {savedMethods.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-background/60 p-6 text-center">
                  <Wallet className="mx-auto h-8 w-8 text-homera-terracotta" aria-hidden="true" />
                  <p className="mt-3 text-note font-semibold text-foreground">
                    {isPayoutContext
                      ? "Aucun compte de réception enregistré"
                      : "Aucun moyen de paiement enregistré"}
                  </p>
                  <p className="mt-1 text-caption leading-relaxed text-muted">
                    {isPayoutContext
                      ? "Enregistrez un numéro Mobile Money Bénin ou un RIB UEMOA à droite pour recevoir vos reversements confirmés."
                      : "Enregistrez un portefeuille Mobile Money, une carte Visa / Mastercard ou un compte UEMOA à droite."}
                  </p>
                </div>
              ) : (
                <ul className="space-y-3" aria-label="Moyens enregistrés">
                  {savedMethods.map((method) => {
                    const spec = providerSpec(method.provider);
                    return (
                      <li
                        key={method.id}
                        className={`rounded-2xl border p-4 transition-colors ${
                          method.isDefault
                            ? "border-homera-terracotta/45 bg-homera-terracotta/[0.04]"
                            : "border-border bg-background"
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-card text-homera-terracotta">
                              <ProviderIcon provider={method.provider} />
                            </span>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-note font-semibold text-foreground">{spec.label}</p>
                                {method.isDefault && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-homera-terracotta px-2.5 py-0.5 text-micro font-semibold text-white">
                                    <Star className="h-3 w-3" aria-hidden="true" />
                                    Par défaut
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 font-mono text-caption font-medium text-foreground">
                                {method.maskedIdentifier}
                                {method.expiry ? ` · Exp. ${method.expiry}` : ""}
                              </p>
                              <p className="mt-1 text-caption text-muted">
                                Titulaire : {method.holderName}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {!method.isDefault && (
                              <button
                                type="button"
                                onClick={() => handleSetDefault(method.id)}
                                className={BUTTON_SECONDARY}
                              >
                                <Check className="h-4 w-4" aria-hidden="true" />
                                Par défaut
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemove(method.id)}
                              aria-label={`Supprimer ${spec.shortLabel} ${method.maskedIdentifier}`}
                              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-caption font-semibold text-muted transition-colors hover:border-error/40 hover:text-error"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                              Supprimer
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </WorkspacePanel>

            <WorkspacePanel
              title={
                isPayoutContext
                  ? `Ajouter un compte de réception : ${activeSpec.shortLabel}`
                  : `Ajouter un moyen de paiement : ${activeSpec.shortLabel}`
              }
              description={activeSpec.processingNote}
              icon={Plus}
            >
              <form onSubmit={handleAddMethod} className="space-y-4">
                <FormField
                  label={isPayoutContext ? "Canal de réception / retrait" : "Canal de paiement client"}
                  name="pm-provider"
                  required
                >
                  <select
                    id="pm-provider"
                    value={provider}
                    onChange={(event) => {
                      setProvider(event.target.value as PaymentProviderId);
                      setFormError("");
                    }}
                    className={INPUT_CLASS}
                  >
                    {availableProviders.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.label}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Nom complet du titulaire" name="pm-holder" required>
                  <input
                    id="pm-holder"
                    value={holderName}
                    onChange={(event) => setHolderName(event.target.value)}
                    placeholder="Ex. Awa Dossou / Kossi Hounkpatin"
                    className={INPUT_CLASS}
                  />
                </FormField>

                {activeSpec.category === "virement" && (
                  <FormField label="Établissement bancaire (Bénin / UEMOA)" name="pm-bank" required>
                    <select
                      id="pm-bank"
                      value={bankName}
                      onChange={(event) => setBankName(event.target.value)}
                      className={INPUT_CLASS}
                    >
                      {UEMOA_BANKS.map((bank) => (
                        <option key={bank} value={bank}>
                          {bank}
                        </option>
                      ))}
                    </select>
                  </FormField>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    label={
                      activeSpec.category === "mobile-money"
                        ? "Numéro Mobile Money (+229 01)"
                        : activeSpec.category === "carte"
                          ? "4 derniers chiffres de la carte"
                          : "RIB / IBAN UEMOA"
                    }
                    name="pm-identifier"
                    hint="Masqué automatiquement lors de l’enregistrement."
                    required
                  >
                    <input
                      id="pm-identifier"
                      value={identifier}
                      onChange={(event) => setIdentifier(event.target.value)}
                      placeholder={activeSpec.placeholder}
                      maxLength={activeSpec.category === "carte" ? 4 : 34}
                      className={INPUT_CLASS}
                    />
                  </FormField>

                  {activeSpec.category === "carte" && (
                    <FormField label="Date d’expiration (MM/AA)" name="pm-expiry">
                      <input
                        id="pm-expiry"
                        value={expiry}
                        onChange={(event) => setExpiry(event.target.value)}
                        placeholder="08/28"
                        maxLength={5}
                        className={INPUT_CLASS}
                      />
                    </FormField>
                  )}
                </div>

                <label
                  htmlFor="pm-default"
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-background px-3.5 py-2.5 text-caption font-medium text-foreground"
                >
                  <input
                    id="pm-default"
                    type="checkbox"
                    checked={makeDefault}
                    onChange={(event) => setMakeDefault(event.target.checked)}
                    className="h-4 w-4 accent-homera-terracotta"
                  />
                  <span>
                    {isPayoutContext
                      ? "Définir comme compte de réception par défaut"
                      : "Définir comme moyen de paiement par défaut"}
                  </span>
                </label>

                {formError && (
                  <p
                    role="alert"
                    className="rounded-xl border border-error/25 bg-error/[0.06] px-4 py-3 text-caption font-medium text-error"
                  >
                    {formError}
                  </p>
                )}

                <button type="submit" className={`${BUTTON_PRIMARY} w-full`}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  {isPayoutContext
                    ? "Enregistrer ce compte de réception"
                    : "Enregistrer ce moyen de paiement"}
                </button>
              </form>
            </WorkspacePanel>
          </div>
        </>
      )}

      {/* JOURNAL FINANCIER TRANSPARENT PAR ACTEUR (§6, §13, §14, §15) */}
      <WorkspacePanel
        title={
          contextRole === "client"
            ? `Historique de mes paiements (${filteredTransactions.length})`
            : contextRole === "proprietaire"
              ? `Revenus, commissions HOMERA & opérations (${filteredTransactions.length})`
              : contextRole === "agent"
                ? `Opérations rattachées à mes mandats (${filteredTransactions.length})`
                : `Journal financier complet HOMERA (${filteredTransactions.length})`
        }
        description={
          contextRole === "client"
            ? "Retrouvez les paiements effectués sur vos dossiers et téléchargez vos justificatifs."
            : "Ventilation stricte par opération : Montant brut client → Commission HOMERA → Part nette attribuée → Disponibilité."
        }
        icon={Receipt}
        action={
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrer par nature d’opération">
            {(
              [
                { id: "all", label: "Toutes" },
                { id: "loyer", label: "Locations" },
                { id: "caution", label: "Cautions" },
                { id: "reservation", label: "Séjours" },
                { id: "visite", label: "Visites" },
              ] as const
            ).map((chip) => (
              <button
                key={chip.id}
                type="button"
                aria-pressed={txFilter === chip.id}
                onClick={() => setTxFilter(chip.id)}
                className={`min-h-9 rounded-full border px-3 py-1 text-caption font-semibold transition-colors ${
                  txFilter === chip.id
                    ? "border-homera-terracotta bg-homera-terracotta text-white"
                    : "border-border bg-background text-muted hover:text-foreground"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        }
      >
        {filteredTransactions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-background/60 p-6 text-center">
            <Receipt className="mx-auto h-8 w-8 text-homera-terracotta" aria-hidden="true" />
            <p className="mt-3 text-note font-semibold text-foreground">
              Aucune opération enregistrée dans cette vue
            </p>
            <p className="mt-1 text-caption leading-relaxed text-muted">
              {contextRole === "client"
                ? "Vos règlements liés aux contrats signés ou réservations confirmées apparaîtront ici."
                : contextRole === "agent"
                  ? "Seules les opérations rattachées à un bien sous mandat actif et prévoyant une rémunération agent s’affichent ici."
                  : "Les opérations encaissées par HOMERA et leur ventilation apparaîtront ici dès le règlement d’une échéance."}
            </p>
          </div>
        ) : (
          <>
            <ul className="space-y-3 md:hidden" aria-label="Opérations financières">
              {filteredTransactions.map((tx) => {
                const split = computeFinancialBreakdown(tx.kind, tx.amount, tx.agentId);
                const homeraFee = tx.homeraFee ?? split.homeraFee;
                const ownerNet = tx.ownerNetAmount ?? split.ownerNetAmount;
                const agentNet = tx.agentAmount ?? split.agentAmount;
                return (
                  <li
                    key={tx.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background p-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-micro font-semibold text-homera-terracotta">
                          {tx.reference}
                        </span>
                        {tx.propertyRef && (
                          <span className="font-mono text-micro text-muted">{tx.propertyRef}</span>
                        )}
                        <span className="rounded-full border border-success/30 bg-success/[0.08] px-2.5 py-0.5 text-micro font-semibold text-success">
                          {tx.status === "confirme" ? "Confirmé" : "En attente"}
                        </span>
                      </div>
                      <p className="mt-1 text-note font-semibold text-foreground">{tx.label}</p>
                      <p className="mt-0.5 text-caption text-muted">
                        {tx.methodSummary} · {formatDateTime(tx.createdAt)}
                      </p>
                      {contextRole === "proprietaire" && (
                        <p className="mt-1 text-caption text-muted">
                          Brut : {formatMoney(tx.amount)} FCFA · Commission HOMERA :{" "}
                          {formatMoney(homeraFee)} FCFA ·{" "}
                          <strong className="text-foreground">Net : {formatMoney(ownerNet)} FCFA</strong>
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="homera-num text-note font-bold text-foreground">
                        {formatMoney(
                          contextRole === "proprietaire"
                            ? ownerNet
                            : contextRole === "agent"
                              ? agentNet
                              : tx.amount,
                        )}{" "}
                        FCFA
                      </p>
                      <button
                        type="button"
                        onClick={() => downloadReceipt(tx)}
                        className={BUTTON_SECONDARY}
                      >
                        <Download className="h-4 w-4" aria-hidden="true" />
                        Justificatif
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[680px] border-collapse text-left text-note"><thead><tr className="border-b border-border text-caption text-muted"><th scope="col" className="pb-3 pr-4 font-semibold">Référence & Bien</th><th scope="col" className="pb-3 pr-4 font-semibold">Opération</th><th scope="col" className="pb-3 pr-4 font-semibold">Canal</th>{contextRole === "client" ? <th scope="col" className="pb-3 pr-4 font-semibold">Montant payé</th> : contextRole === "proprietaire" ? <><th scope="col" className="pb-3 pr-4 font-semibold">Brut / Frais HOMERA</th><th scope="col" className="pb-3 pr-4 font-semibold">Net Propriétaire</th></> : contextRole === "agent" ? <th scope="col" className="pb-3 pr-4 font-semibold">Part Agent</th> : <><th scope="col" className="pb-3 pr-4 font-semibold">Brut Client</th><th scope="col" className="pb-3 pr-4 font-semibold">Part HOMERA / Net Prop.</th></>}<th scope="col" className="pb-3 pr-4 font-semibold">Statut</th><th scope="col" className="pb-3 text-right font-semibold">Justificatif</th></tr></thead><tbody>{filteredTransactions.map((tx) => {
              const split = computeFinancialBreakdown(tx.kind, tx.amount, tx.agentId);
              const homeraFee = tx.homeraFee ?? split.homeraFee;
              const ownerNet = tx.ownerNetAmount ?? split.ownerNetAmount;
              const agentNet = tx.agentAmount ?? split.agentAmount;
              return <tr key={tx.id} className="border-b border-border/70 last:border-0"><td className="py-3.5 pr-4"><span className="block font-mono text-caption font-semibold text-homera-terracotta">{tx.reference}</span><span className="mt-0.5 block text-caption text-muted">{tx.propertyRef ?? "Dossier HOMERA"} · {formatDateTime(tx.createdAt)}</span></td><td className="py-3.5 pr-4"><span className="block font-semibold text-foreground">{tx.label}</span><span className="mt-0.5 block text-caption text-muted">{TRANSACTION_KIND_LABELS[tx.kind]}</span></td><td className="py-3.5 pr-4 text-caption text-muted">{tx.methodSummary}</td>{contextRole === "client" ? <td className="homera-num py-3.5 pr-4 font-bold text-foreground">{formatMoney(tx.amount)} FCFA</td> : contextRole === "proprietaire" ? <><td className="homera-num py-3.5 pr-4 text-caption text-muted">{formatMoney(tx.amount)} FCFA <span className="block text-micro">Frais HOMERA : {formatMoney(homeraFee)} FCFA</span></td><td className="homera-num py-3.5 pr-4 font-bold text-foreground">{formatMoney(ownerNet)} FCFA</td></> : contextRole === "agent" ? <td className="homera-num py-3.5 pr-4 font-bold text-foreground">{formatMoney(agentNet)} FCFA</td> : <><td className="homera-num py-3.5 pr-4 font-semibold text-foreground">{formatMoney(tx.amount)} FCFA</td><td className="homera-num py-3.5 pr-4 text-caption text-muted">HOMERA : {formatMoney(homeraFee)} FCFA<span className="block text-micro text-foreground">Prop. : {formatMoney(ownerNet)} FCFA</span></td></>}<td className="py-3.5 pr-4"><span className="inline-flex rounded-full border border-success/30 bg-success/[0.08] px-2.5 py-0.5 text-micro font-semibold text-success">{tx.status === "confirme" ? (isPayoutContext ? "Disponible" : "Confirmé") : "En attente"}</span></td><td className="py-3.5 text-right"><button type="button" onClick={() => downloadReceipt(tx)} className={BUTTON_SECONDARY}><Download className="h-4 w-4" aria-hidden="true" />Reçu</button></td></tr>;
            })}</tbody></table></div>
          </>
        )}
      </WorkspacePanel>
    </div>
  );
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
