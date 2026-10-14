# HOMERA — Architecture réelle et cible

> **Référence honnête** : ce document distingue ce qui fonctionne réellement
> aujourd'hui de ce qui reste à construire. Chaque statut a été confronté au
> code et aux tests le **14 octobre 2026** (branche `arena/87b15d6d-homera`).
> Détail du socle serveur : [`BACKEND.md`](./BACKEND.md). Journal des lots :
> [`CURRENT_STATE.md`](./CURRENT_STATE.md).

## Légende

| Statut | Signification |
|---|---|
| RÉEL | Présent dans le code et couvert par les tests. |
| À FINALISER | Partiellement implémenté ; le reste est connu et cadré. |
| À VÉRIFIER | Existence non confirmée — ne jamais présenter comme achevé sans preuve. |
| À AUDITER | Existant dont le dimensionnement doit être examiné avant toute décision. |
| CIBLE | Planifié mais non livré. |

**Règle documentaire :** « réel » signifie présent et démontré dans le code ou
par un test ; « cible » signifie planifié mais non livré. Tout changement de
statut exige une preuve (fichier, test, mesure). Aucune simulation, aucun faux
bouton, aucune donnée inventée présentée comme réelle.

## 1. Les utilisateurs — RÉEL

Quatre rôles, cumulables sur un même compte, chacun avec son espace et ses
permissions : Client (`/client`), Propriétaire (`/proprietaire`),
Agent immobilier (`/agent`), Administrateur (`/admin`, espace « Administration »).

Preuves : `lib/auth.ts` (rôles, `guardWorkspace`, redirection post-connexion),
5 écrans documentés dans `docs/pages/AUTH_FLOWS.md`, 4 espaces dans
`docs/pages/WORKSPACES.md`, bascule d'espace depuis le menu de profil.

## 2. Les interfaces

### Site web responsive — RÉEL

Application Next.js : accueil, recherche, Explorateur (filtres à 2 niveaux),
fiches bien, favoris, formulaires, 4 espaces utilisateurs, tableaux de bord
lus du serveur, contrôle public (mandat, historique d'un bien). Utilisable sur
ordinateur et téléphone via navigateur.

Preuves : `docs/pages/` (PUBLIC_SITE, AUTH_FLOWS, WORKSPACES),
`npm run test:motion` 72/72, `npm run audit:home` (budgets de poids tenus).

### Application mobile native — CIBLE

Aucun code natif (ni `android/`, ni `ios/`, ni enveloppe hybride) : les
applications Android/iOS restent des applications distinctes à développer et à
publier. Elles ne sont pas considérées comme existantes.

### Cartes géographiques — RÉEL (schématique) / CIBLE (géoréférencée)

Vue schématique SVG interactive des communes dans l'Explorateur (Cotonou,
Abomey-Calavi, Ouidah, Porto-Novo), sans librairie cartographique. Aucun fond
de carte géoréférencé (Leaflet, Google Maps, Mapbox : zéro occurrence) :
l'ajout de tuiles reste optionnel.

Preuves : `components/catalog/CommuneMapExplorer.tsx`, ROADMAP 6.1.

## 3. Les services métier — le cœur d'HOMERA

Le différenciateur d'HOMERA n'est pas de publier des annonces : c'est de
structurer la confiance immobilière. Dix services (`lib/server/services/`),
45 routes `/api/**`, une seule base ; le serveur décide avant le rendu.

### A. Authentification et sessions — RÉEL

Inscription, connexion, codes de vérification, réinitialisation, gardes serveur
par rôle avant chaque rendu. L'envoi d'e-mail n'existe pas (voir H) : en pilote,
le code s'affiche à l'écran, expire en 15 minutes, 5 tentatives.

Preuves : `lib/auth.ts`, `lib/server/auth/`, `components/auth/VerifyEmailForm.tsx`.

### B. Vérification et confiance — RÉEL / À FINALISER

Pipeline de vérification des biens, statuts de publication, validation
administrative, `audit_log` immuable et horodaté. Le téléversement des pièces
justificatives reste déclaratif (`declareDocument`) : colonne en base, mais
aucune réception de fichiers.

Preuves : `lib/server/services/verifications.ts`, `documents.ts`,
`lib/server/db/migrations.ts` (`audit_log`).

### C. Mandats propriétaire–agent — RÉEL

Association propriétaire–bien–agent autorisé, cycle de vie complet
(`en-attente → active → expiree | revoquee | contestee`, plus `refusee`),
événements tracés (`authorization_events`), contrôle public du mandat.

Preuves : `lib/server/services/authorizations.ts:18-33`,
`npm run test:scenarios` 13/13.

### D. Visites — RÉEL

Créneaux de disponibilité, demandes, décisions, historique auditable, tableau
de bord admin. Réservation premier arrivé : « Un autre visiteur a déjà réservé
ce créneau ».

Preuves : `lib/server/services/visits.ts` (`listSlots`, `createSlot`,
`requestVisit:291`, `decideVisit:455`, garde `:374`).

### E. Candidatures et contrats — RÉEL (signature simple)

Candidatures instruites, puis contrats de location rédigés depuis une
candidature acceptée ; signature par le locataire, contrat signé non annulable.
La signature enregistrée est une **signature électronique simple** (nom saisi,
date, heure) — pas de signature qualifiée, pas de paiement en ligne.

Preuves : `applications.ts`, `contracts.ts:19-21`, `app/api/contracts/route.ts`,
pages `/client/contrats`, CURRENT_STATE LOT 7.

### F. Messagerie, notifications, alertes — RÉEL

Trois canaux distincts : conversations persistées adossées à un bien
(`/messages`), notifications (`/notifications`), alertes. Tableaux de bord et
compteurs lus du serveur, plus du stockage local.

Preuves : `lib/server/services/messaging.ts`, BACKEND.md §7, CURRENT_STATE LOT 7-8.

### G. Commissions, paiements, retraits — CIBLE

Aucun module de facturation : soldes, retraits et bouton « Payer » ont été
**supprimés plutôt que simulés**. La fiche bien affiche une mention statutaire
(« Commission HOMERA : Selon mandat vérifié »), sans moteur de calcul ni
encaissement. Une autorisation sur un bien n'ouvre aucun droit automatique à
recevoir de l'argent.

Preuves : CURRENT_STATE LOT 7, `AdminServerSections.tsx:649`
(« aucun revenu, commission ou retrait n'est affiché plutôt que d'être simulé »),
`PropertyDetail.tsx:462`, `PaymentMethodsPanel.tsx` (états vides honnêtes).

### H. E-mail transactionnel — CIBLE (hors périmètre pilote)

Aucun serveur d'envoi : les codes de vérification s'affichent dans le pilote
(`PilotCode`) avec la mention « Le jour où un serveur d'envoi existe ». L'envoi
réel (transactionnel, notifications e-mail) n'est pas livré.

Preuves : `components/auth/VerifyEmailForm.tsx:18-21`, `StatusNote.tsx`.

## 4. Stockage et données

| Élément | Statut | Preuve |
|---|---|---|
| Comptes, biens, rôles, permissions | RÉEL | SQLite unique, le serveur décide avant le rendu (BACKEND.md §1) |
| Photos des biens (envoi réel) | RÉEL | Octets contrôlés côté serveur, `data/uploads/`, servis par `/api/uploads/…` (`app/api/properties/[id]/photos/upload/route.ts`, CURRENT_STATE LOT 8) |
| Mandats, visites, candidatures, contrats, historique | RÉEL | 10 services, `audit_log` et `authorization_events` |
| Pièces justificatives de vérification | À FINALISER | Déclaratif uniquement (`declareDocument`, colonne en base, pas de réception de fichiers) |
| SQLite : WAL, clés étrangères, `busy_timeout` | RÉEL | `lib/server/db/client.ts:61-65` |
| Sauvegardes | CIBLE | Aucun mécanisme en dépôt |
| Charge et concurrence | À AUDITER | `better-sqlite3` synchrone + WAL : sain pour le pilote, à mesurer avant montée en charge |
| Migration PostgreSQL | CIBLE (conditionnelle) | Décision après audit : accès concurrents, persistance des fichiers, sauvegardes, besoins du déploiement |

SQLite n'impose pas à lui seul une migration immédiate : types simples,
contraintes explicites, dates ISO 8601 UTC — le schéma est écrit pour rester
portable (BACKEND.md §1).

## 5. Infrastructure et déploiement

| Élément | Statut | Preuve |
|---|---|---|
| Exécution locale (développement) | RÉEL | Garde `check-deps.mjs`, installation ~10 s sans toolchain (`.npmrc`), base réinitialisable (`db:reset` : 36 biens, 5 comptes) |
| Hébergement de production, domaine HOMERA | CIBLE | Rien en dépôt |
| HTTPS, sauvegardes, surveillance de production | CIBLE | Rien en dépôt |
| CI/CD | CIBLE | Aucun workflow (`.github/workflows` absent) |
| Tests E2E navigateur | CIBLE (outillage) | Playwright inaccessible depuis l'environnement ; socle serveur 222/0, scénarios API 13/13 |
| Publication mobile | CIBLE | Voir §2 |

## 6. Ordre de priorité recommandé

1. Finaliser la vérification des biens : téléversement réel des justificatifs,
   mandats, statuts de publication.
2. Éprouver les parcours location/vente de bout en bout (navigateur) et trancher
   le périmètre paiement — sans simuler.
3. Auditer SQLite, les fichiers stockés et la stratégie de sauvegarde avant
   toute décision PostgreSQL.
4. Maintenir les batteries au vert (socle 222/0, scénarios 13/13, mouvement
   72/72, quality-gate 7/7) et outiller l'E2E navigateur.
5. Préparer le déploiement web de production (hébergement, domaine, HTTPS,
   sauvegardes, surveillance).
6. Développer l'application mobile native lorsque le socle commun est stable.

---

*Tout écart constaté entre ce document et le code est un bug de l'un ou de
l'autre : le signaler, puis aligner les deux dans le même geste.*
