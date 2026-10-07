"use client";

import { useState, type FormEvent } from "react";
import {
  Building2,
  Check,
  CheckCircle2,
  CreditCard,
  Download,
  Landmark,
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
  PAYMENT_PROVIDERS,
  UEMOA_BANKS,
  createLocalId,
  makeNotification,
  maskPaymentIdentifier,
  type PaymentMethodUsage,
  type PaymentProviderId,
  type PaymentTransactionKind,
  type PaymentTransactionRecord,
  type SavedPaymentMethod,
} from "@/lib/workflow";
import {
  BUTTON_PRIMARY,
  BUTTON_SECONDARY,
  DemoNotice,
  FormField,
  INPUT_CLASS,
  WorkspaceHeading,
  WorkspacePanel,
} from "@/components/workspace/Primitives";

function formatMoney(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(value));
}

const USAGE_LABELS: Record<PaymentMethodUsage, string> = {
  paiement: "Règlement loyer & séjour",
  reversement: "Reversement propriétaire",
  mixte: "Paiement & reversement",
};

const TRANSACTION_KIND_LABELS: Record<PaymentTransactionKind, string> = {
  loyer: "Loyer mensuel",
  caution: "Dépôt de garantie",
  abonnement: "Service propriétaire",
  reservation: "Réservation séjour",
};

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
  embedded = false,
}: {
  contextRole?: "client" | "proprietaire" | "admin";
  embedded?: boolean;
}) {
  const { account } = useAuth();
  const { data, updateData } = useWorkflow();

  const defaultHolder = account ? `${account.prenom} ${account.nom}`.trim() : "";
  const defaultUsage: PaymentMethodUsage = contextRole === "proprietaire" ? "reversement" : "paiement";
  const [provider, setProvider] = useState<PaymentProviderId>("mtn-momo");
  const [holderName, setHolderName] = useState(defaultHolder);
  const [identifier, setIdentifier] = useState("");
  const [bankName, setBankName] = useState<string>(UEMOA_BANKS[0]);
  const [expiry, setExpiry] = useState("");
  const [usage, setUsage] = useState<PaymentMethodUsage>(defaultUsage);
  const [makeDefault, setMakeDefault] = useState(true);
  const [formError, setFormError] = useState("");
  const [feedback, setFeedback] = useState("");

  // Quick payment simulator state
  const [txKind, setTxKind] = useState<PaymentTransactionKind>(
    contextRole === "proprietaire" ? "abonnement" : "loyer",
  );
  const [txAmount, setTxAmount] = useState(contextRole === "proprietaire" ? "45000" : "350000");
  const [txLabel, setTxLabel] = useState(
    contextRole === "proprietaire"
      ? "Accompagnement gestion locative HOMERA"
      : "Règlement loyer mensuel · dossier pilote",
  );
  const [selectedMethodId, setSelectedMethodId] = useState<string>("");
  const [txFilter, setTxFilter] = useState<"all" | PaymentTransactionKind>("all");

  const activeSpec = providerSpec(provider);
  const savedMethods = data.paymentMethods;
  const defaultMethod = savedMethods.find((entry) => entry.isDefault) ?? savedMethods[0];
  const effectiveMethod =
    savedMethods.find((entry) => entry.id === selectedMethodId) ?? defaultMethod;
  const filteredTransactions =
    txFilter === "all"
      ? data.transactions
      : data.transactions.filter((tx) => tx.kind === txFilter);

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
      bankOrNetwork:
        activeSpec.category === "virement"
          ? bankName
          : activeSpec.shortLabel,
      expiry: activeSpec.category === "carte" && expiry.trim() ? expiry.trim() : undefined,
      usage,
      isDefault: makeDefault || savedMethods.length === 0,
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
            "Moyen de paiement enregistré",
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
    setFeedback("Le moyen de paiement par défaut a été mis à jour.");
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
    setFeedback("Le moyen de paiement a été retiré de ce navigateur.");
  };

  const handleSimulatePayment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const numericAmount = Number(txAmount.replace(/\D/g, "")) || 0;
    if (numericAmount <= 0) {
      setFormError("Indiquez un montant en FCFA supérieur à 0.");
      return;
    }

    const chosenProvider = effectiveMethod ? effectiveMethod.provider : provider;
    const chosenSpec = providerSpec(chosenProvider);
    const summary = effectiveMethod
      ? `${chosenSpec.shortLabel} · ${effectiveMethod.maskedIdentifier}`
      : `${chosenSpec.shortLabel} · règlement direct`;
    const now = new Date().toISOString();
    const reference = createLocalId("PAY-CTN").toUpperCase();

    const record: PaymentTransactionRecord = {
      id: createLocalId("tx"),
      reference,
      kind: txKind,
      label: txLabel.trim() || TRANSACTION_KIND_LABELS[txKind],
      amount: numericAmount,
      provider: chosenProvider,
      methodSummary: summary,
      status: chosenProvider === "virement-uemoa" ? "en-verification" : "confirme",
      createdAt: now,
    };

    updateData((current) => ({
      ...current,
      transactions: [record, ...current.transactions],
      notifications: [
        makeNotification(
          "contrat",
          `Règlement enregistré (${reference})`,
          `${formatMoney(numericAmount)} FCFA via ${chosenSpec.shortLabel}`,
          contextRole === "proprietaire" ? "/proprietaire/abonnement" : "/client/paiements",
        ),
        ...current.notifications,
      ],
    }));

    setFeedback(
      `Règlement de démonstration ${reference} (${formatMoney(numericAmount)} FCFA via ${chosenSpec.shortLabel}) enregistré.`,
    );
  };

  const downloadReceipt = (tx: PaymentTransactionRecord) => {
    const content = [
      "HOMERA — REÇU / QUITTANCE DE DÉMONSTRATION",
      "==========================================",
      "",
      `Référence transaction : ${tx.reference}`,
      `Date : ${formatDateTime(tx.createdAt)}`,
      `Nature : ${TRANSACTION_KIND_LABELS[tx.kind]}`,
      `Libellé : ${tx.label}`,
      `Montant : ${formatMoney(tx.amount)} FCFA`,
      `Canal utilisé : ${tx.methodSummary}`,
      `Statut : ${tx.status === "confirme" ? "Confirmé (aperçu local)" : "En rapprochement bancaire (aperçu local)"}`,
      tx.propertyRef ? `Référence bien : ${tx.propertyRef}` : null,
      "",
      "Note importante : Ce document est généré dans l'environnement pilote HOMERA.",
      "Aucun débit bancaire ni prélèvement Mobile Money réel n'a été exécuté.",
    ]
      .filter(Boolean)
      .join("\n");

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `HOMERA-${tx.reference}-quittance.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {!embedded && (
        <WorkspaceHeading
          eyebrow={
            contextRole === "proprietaire"
              ? "Encaissements & Services Bénin / UEMOA"
              : "Règlements & Quittances Bénin / UEMOA"
          }
          title="Moyens de paiement"
          description="Configurez vos portefeuilles Mobile Money (MTN MoMo, Moov Money, Celtiis Cash), cartes Visa / Mastercard et comptes bancaires UEMOA pour vos loyers, cautions et reversements."
        />
      )}

      <DemoNotice>
        Environnement pilote : seuls des identifiants masqués (derniers chiffres du numéro, de la carte ou du RIB) sont conservés dans ce navigateur. Aucun prélèvement réel Mobile Money ou bancaire n’est déclenché.
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

      <WorkspacePanel
        title="Canaux pris en charge au Bénin et pour la diaspora"
        description="Sélectionnez un canal pour préremplir le formulaire d’enregistrement ci-dessous."
        icon={Wallet}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {PAYMENT_PROVIDERS.map((item) => {
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
          title={`Moyens enregistrés (${savedMethods.length})`}
          description="Définissez votre moyen par défaut pour les règlements de loyers, dépôts de garantie ou reversements propriétaires."
          icon={ShieldCheck}
        >
          {savedMethods.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-background/60 p-6 text-center">
              <Wallet className="mx-auto h-8 w-8 text-homera-terracotta" aria-hidden="true" />
              <p className="mt-3 text-note font-semibold text-foreground">
                Aucun moyen de paiement enregistré
              </p>
              <p className="mt-1 text-caption leading-relaxed text-muted">
                Ajoutez un numéro MTN MoMo, Moov Money, Celtiis Cash, une carte Visa / Mastercard ou un RIB UEMOA à droite pour préparer vos règlements et reversements.
              </p>
            </div>
          ) : (
            <ul className="space-y-3" aria-label="Moyens de paiement enregistrés">
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
                            Titulaire : {method.holderName} · {USAGE_LABELS[method.usage]}
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
                          Retirer
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
          title={`Ajouter : ${activeSpec.shortLabel}`}
          description={activeSpec.processingNote}
          icon={Plus}
        >
          <form onSubmit={handleAddMethod} className="space-y-4">
            <FormField label="Canal de paiement ou de reversement" name="pm-provider" required>
              <select
                id="pm-provider"
                value={provider}
                onChange={(event) => {
                  setProvider(event.target.value as PaymentProviderId);
                  setFormError("");
                }}
                className={INPUT_CLASS}
              >
                {PAYMENT_PROVIDERS.map((entry) => (
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

              {activeSpec.category === "carte" ? (
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
              ) : (
                <FormField label="Usage principal" name="pm-usage">
                  <select
                    id="pm-usage"
                    value={usage}
                    onChange={(event) => setUsage(event.target.value as PaymentMethodUsage)}
                    className={INPUT_CLASS}
                  >
                    <option value="paiement">Règlement loyer & séjour</option>
                    <option value="reversement">Reversement propriétaire</option>
                    <option value="mixte">Paiement & reversement</option>
                  </select>
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
              <span>Utiliser comme moyen par défaut sur ce compte</span>
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
              Enregistrer ce moyen de paiement
            </button>
          </form>
        </WorkspacePanel>
      </div>

      <WorkspacePanel
        title="Simuler un règlement avec récapitulatif fixe (aperçu pilote)"
        description="Testez un règlement Mobile Money, carte ou virement UEMOA et générez immédiatement une quittance de démonstration."
        icon={Building2}
      >
        <form onSubmit={handleSimulatePayment} className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Nature du règlement" name="tx-kind" required>
                <select
                  id="tx-kind"
                  value={txKind}
                  onChange={(event) => setTxKind(event.target.value as PaymentTransactionKind)}
                  className={INPUT_CLASS}
                >
                  <option value="loyer">Loyer mensuel</option>
                  <option value="caution">Dépôt de garantie (caution)</option>
                  <option value="reservation">Réservation court séjour</option>
                  <option value="abonnement">Service / accompagnement propriétaire</option>
                </select>
              </FormField>

              <FormField label="Montant (FCFA)" name="tx-amount" required>
                <input
                  id="tx-amount"
                  type="text"
                  inputMode="numeric"
                  value={txAmount}
                  onChange={(event) => setTxAmount(event.target.value.replace(/[^\d]/g, ""))}
                  placeholder="350000"
                  className={INPUT_CLASS}
                />
              </FormField>
            </div>

            <FormField label="Moyen de paiement à utiliser" name="tx-method">
              <select
                id="tx-method"
                value={effectiveMethod?.id ?? ""}
                onChange={(event) => setSelectedMethodId(event.target.value)}
                className={INPUT_CLASS}
              >
                {savedMethods.length === 0 ? (
                  <option value="">
                    Canal direct : {activeSpec.label}
                  </option>
                ) : (
                  savedMethods.map((item) => (
                    <option key={item.id} value={item.id}>
                      {providerSpec(item.provider).shortLabel} · {item.maskedIdentifier}
                      {item.isDefault ? " (Par défaut)" : ""}
                    </option>
                  ))
                )}
              </select>
            </FormField>

            <FormField label="Libellé ou référence du dossier" name="tx-label">
              <input
                id="tx-label"
                value={txLabel}
                onChange={(event) => setTxLabel(event.target.value)}
                placeholder="Ex. Loyer Octobre 2026 · HOM-CTN-000421"
                className={INPUT_CLASS}
              />
            </FormField>
          </div>

          <aside
            aria-label="Récapitulatif fixe du règlement"
            className="flex flex-col justify-between rounded-2xl border border-border bg-background p-5"
          >
            <div>
              <p className="text-micro font-semibold uppercase tracking-[0.14em] text-homera-terracotta">
                Récapitulatif du règlement
              </p>
              <dl className="mt-4 space-y-2.5 text-caption">
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted">Nature</dt>
                  <dd className="font-semibold text-foreground">{TRANSACTION_KIND_LABELS[txKind]}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted">Canal sélectionné</dt>
                  <dd className="font-semibold text-foreground">
                    {effectiveMethod
                      ? `${providerSpec(effectiveMethod.provider).shortLabel} (${effectiveMethod.maskedIdentifier})`
                      : activeSpec.shortLabel}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted">Frais de service pilote</dt>
                  <dd className="font-semibold text-success">0 FCFA · inclus</dd>
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
                  <dt className="text-note font-semibold text-foreground">Total à valider</dt>
                  <dd className="homera-num text-body font-bold text-foreground">
                    {formatMoney(Number(txAmount) || 0)} FCFA
                  </dd>
                </div>
              </dl>
            </div>

            <button type="submit" className={`${BUTTON_PRIMARY} mt-5 w-full`}>
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Valider le règlement ({formatMoney(Number(txAmount) || 0)} FCFA)
            </button>
          </aside>
        </form>
      </WorkspacePanel>

      <WorkspacePanel
        title={`Journal des règlements & quittances (${filteredTransactions.length})`}
        description="Table structurée sur grand écran et cartes prioritaires sur mobile. Chaque opération génère une quittance téléchargeable."
        icon={Receipt}
        action={
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrer par nature de règlement">
            {(
              [
                { id: "all", label: "Tous" },
                { id: "loyer", label: "Loyers" },
                { id: "caution", label: "Cautions" },
                { id: "reservation", label: "Séjours" },
                { id: "abonnement", label: "Services" },
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
              Aucune transaction dans cette catégorie
            </p>
            <p className="mt-1 text-caption leading-relaxed text-muted">
              Validez un règlement ci-dessus (ou depuis un contrat de location) pour afficher son reçu et télécharger la quittance.
            </p>
          </div>
        ) : (
          <>
            <ul className="space-y-3 md:hidden" aria-label="Historique des règlements">
              {filteredTransactions.map((tx) => (
                <li
                  key={tx.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background p-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-micro font-semibold text-homera-terracotta">
                        {tx.reference}
                      </span>
                      <span className="rounded-full border border-success/30 bg-success/[0.08] px-2.5 py-0.5 text-micro font-semibold text-success">
                        {tx.status === "confirme" ? "Confirmé · démo" : "Rapprochement · démo"}
                      </span>
                    </div>
                    <p className="mt-1 text-note font-semibold text-foreground">{tx.label}</p>
                    <p className="mt-0.5 text-caption text-muted">
                      {tx.methodSummary} · {formatDateTime(tx.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="homera-num text-note font-bold text-foreground">
                      {formatMoney(tx.amount)} FCFA
                    </p>
                    <button
                      type="button"
                      onClick={() => downloadReceipt(tx)}
                      className={BUTTON_SECONDARY}
                    >
                      <Download className="h-4 w-4" aria-hidden="true" />
                      Quittance
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[640px] border-collapse text-left text-note"><thead><tr className="border-b border-border text-caption text-muted"><th scope="col" className="pb-3 pr-4 font-semibold">Référence & Date</th><th scope="col" className="pb-3 pr-4 font-semibold">Libellé & Nature</th><th scope="col" className="pb-3 pr-4 font-semibold">Canal utilisé</th><th scope="col" className="pb-3 pr-4 font-semibold">Statut</th><th scope="col" className="pb-3 pr-4 font-semibold">Montant</th><th scope="col" className="pb-3 text-right font-semibold">Action</th></tr></thead><tbody>{filteredTransactions.map((tx) => <tr key={tx.id} className="border-b border-border/70 last:border-0"><td className="py-3.5 pr-4"><span className="block font-mono text-caption font-semibold text-homera-terracotta">{tx.reference}</span><span className="mt-0.5 block text-caption text-muted">{formatDateTime(tx.createdAt)}</span></td><td className="py-3.5 pr-4"><span className="block font-semibold text-foreground">{tx.label}</span><span className="mt-0.5 block text-caption text-muted">{TRANSACTION_KIND_LABELS[tx.kind]}</span></td><td className="py-3.5 pr-4 text-caption text-muted">{tx.methodSummary}</td><td className="py-3.5 pr-4"><span className="inline-flex rounded-full border border-success/30 bg-success/[0.08] px-2.5 py-0.5 text-micro font-semibold text-success">{tx.status === "confirme" ? "Confirmé · démo" : "Rapprochement · démo"}</span></td><td className="homera-num py-3.5 pr-4 font-bold text-foreground">{formatMoney(tx.amount)} FCFA</td><td className="py-3.5 text-right"><button type="button" onClick={() => downloadReceipt(tx)} className={BUTTON_SECONDARY}><Download className="h-4 w-4" aria-hidden="true" />Quittance</button></td></tr>)}</tbody></table></div>
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
