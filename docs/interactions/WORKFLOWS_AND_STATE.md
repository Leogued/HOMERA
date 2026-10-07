# Flux Métiers & Persistance Locale

## 1. Trois couches de stockage navigateur validées

| Couche | Clé `localStorage` | Provider | Validation à la relecture |
| --- | --- | --- | --- |
| **Visiteur public** | `homera.visiteur.v1` | `VisitorProvider` | `parseVisitorState` (`lib/persistence.ts`) : filtre les IDs invalides et rejette toute URL non interne (`javascript:`, externe). |
| **Comptes & Session** | `homera.comptes.v1` / `homera.session.v1` | `AuthProvider` | `parseAccounts` (`lib/accounts.ts`) : vérifie la structure complète du hachage PBKDF2-SHA-256 et les rôles cumulables. |
| **Parcours métiers** | `homera.parcours.v1.<accountId>` | `WorkflowProvider` | `parseWorkflowData` (`lib/workflow.ts`) : valide les visites, candidatures, contrats, biens soumis, notifications et messages. |

## 2. Contrats de transition inter-rôles

1. **Visite → Candidature locative (`validateRentalRequest`)** :
   - Un client ne peut déposer une demande de location que pour une visite ayant le statut **`terminee`**, portant sur un bien dont le projet est **`louer`**, et à raison d'**une seule candidature par visite**.
2. **Candidature → Contrat (`OwnerDocuments` ↔ `ClientContractReader`)** :
   - Le propriétaire crée un brouillon de bail sur une candidature acceptée, l'édite puis l'envoie (`envoye`). Le client peut alors le relire, télécharger le récapitulatif `.txt`, l'imprimer et signer l'aperçu (`signe`), ce qui verrouille le contrat.
3. **Soumission Propriétaire → Contrôle Admin (`PropertyWizard` ↔ `AdminVerifications`)** :
   - Un propriétaire ne peut jamais passer lui-même un bien de `brouillon` ou `en-verification` à `verifie` ou `publie` (`nextOwnerListingStatus`).
   - Seule une décision dans `/admin/verifications` (`recordVerificationDecision`) valide le bien (`verifie`), demande une modification (`modification-demandee`), le refuse ou le suspend, en journalisant l'événement dans `verificationHistory`.
4. **Mandat Agent → Visibilité & QR Code (`authorizationsForAgent`)** :
   - Un agent connecté ne voit que les biens et visites couverts par une autorisation active rattachée à son matricule et valide à la date du jour.

## 3. Modèle économique, paiements conditionnés au workflow et retraits (`lib/workflow.ts`)

1. **Flux financier centralisé via HOMERA (`computeFinancialBreakdown`)** :
   - Toute transaction suit la chaîne **`CLIENT → HOMERA → Attribution (Commission HOMERA / Part Agent éventuelle / Net Propriétaire) → Disponibilité → Retrait`**.
   - Chaque opération (`PaymentTransactionRecord`) conserve les liens anti-contournement : `propertyId`, `propertyRef`, `visitId`, `contractId`, `agentId`, `homeraFee`, `ownerNetAmount`, `agentAmount` et `fundsAvailability` (`en-attente` | `disponible` | `retire`).
2. **Conditionnement strict du bouton « Payer » au workflow (`canClientPayContract` & `canClientPayVisit`)** :
   - **Location longue durée (§7)** : `canClientPayContract(contract, transactions, kind)` exige que le contrat soit au statut `signe` avant d'afficher **« Payer la location · X FCFA »** ou **« Payer le dépôt de garantie · X FCFA »**.
   - **Visite (§9)** : `canClientPayVisit(visit, transactions, 5000)` n'affiche **« Payer les frais de visite · 5 000 FCFA »** dans `/client/visites` que lorsque le créneau est `confirmee`, sans jamais transformer ces frais en avance sur loyer.
   - **Court séjour / meublé (§8)** : calcul `prix par nuit × durée` avec affichage du montant total exact avant confirmation et bouton **« Payer la réservation · X FCFA »**.
3. **Séparation Moyens de paiement Client vs Moyens de réception / retrait (§12)** :
   - `CLIENT_PAYMENT_PROVIDERS` (5 canaux : MTN MoMo, Moov Money, Celtiis Cash, Carte Visa/Mastercard, Virement UEMOA).
   - `PAYOUT_RECEPTION_PROVIDERS` (4 canaux de réception : MTN MoMo, Moov Money, Celtiis Cash, Virement UEMOA — carte bancaire exclue des retraits).
4. **Soldes, disponibilité et retraits par acteur (`computeActorBalances`)** :
   - Une somme en attente de confirmation (`status !== "confirme"`) n'est jamais comptée comme disponible.
   - Pour l'agent, **« autorisation sur un bien ≠ droit automatique à recevoir de l'argent »** : seules les opérations explicitement rattachées à son matricule et dotées d'une part agent alimentent son solde disponible.

