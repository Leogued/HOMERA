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
