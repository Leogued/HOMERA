# AUDIT — HOMERA, inventaire réel et problèmes classés

> **Date de l’audit** : 12 octobre 2026 — branche `arena/87b15d6d-homera`, commit `45a5572`
> **Périmètre** : dépôt complet, 27 081 lignes TS/TSX, 48 routes, 4 espaces + site public,
> scripts de tests (`scripts/test-motion.mjs`, `quality-gate.mjs`, `audit-home.mjs`).
> **Méthode** : lecture du code et des documents de gouvernance, vérification des commandes
> (`npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`), puis classement par gravité.

---

## 1. Ce qui a été examiné

| Zone | Fichiers clés | Constat de lecture |
|---|---|---|
| Site public | `app/(site)/*` (24 routes), `components/home/*` (9 scènes), `components/catalog/*` | Riche, cohérent, servi par `lib/content.ts` (36 biens) et `lib/properties.ts` (moteur de filtrage) |
| Auth | `lib/auth.ts` (1 263 l.), `lib/accounts.ts` (623 l.), `components/providers/AuthProvider.tsx` (649 l.) | Règles pures excellentes, **persistance 100 % `localStorage`/`sessionStorage`** |
| Espaces | `app/(workspace)/*` + `app/(client)/*`, `components/workspace/*` | Navigation unifiée (`WorkspaceShell`), data via `WorkflowProvider` → `localStorage` (`homera.workflow.v1.<id>`) |
| Données métier | `lib/workflow.ts` (1 023 l.), `lib/portal-data.ts` (316 l.) | Modèle de domaine **déjà très complet** (visites, candidatures, contrats, mandats, vérification, paiements) mais non persisté |
| Backend | — | **Aucun schéma, aucune API, aucune session serveur, aucune migration** |
| Docs | `AGENTS.md`, `PROJECT.md`, `CURRENT_STATE.md`, `ROADMAP.md`, `docs/*` | Gouvernance très aboutie ; **dérive documentaire** (routes décrites qui n’existent plus) |

État de référence avant travaux : `npm test` 64/64, `npm run lint` 0 erreur, `tsc --noEmit` 0 erreur,
`npm run build` OK (48 routes).

---

## 2. Problèmes classés

Légende : **B** = bloquant (empêche une mise en production honnête), **I** = important
(fonctionnalité annoncée mais non fiable), **A** = amélioration (qualité perçue, confort, dette).

### 2.1 Bloquants

| # | Problème | Preuve dans le code | Décision / action |
|---|---|---|---|
| **B1** | **Aucune source de vérité serveur.** Comptes, visites, demandes, contrats, notifications et favoris vivent dans le navigateur. Deux appareils ne partagent rien ; vider le cache efface tout l’historique. | `lib/accounts.ts` (`ACCOUNTS_STORAGE_KEY = "homera.comptes.v1"`), `WorkflowProvider` (`homera.workflow.v1.<id>`), `lib/persistence.ts` | LOT 2 : base SQLite + migrations + services serveur (`lib/server/**`), API `/api/**`. |
| **B2** | **Aucun contrôle d’accès côté serveur.** `/proprietaire/*`, `/agent/*`, `/admin/*` rendent un composant client qui lit le stockage local. N’importe qui peut ouvrir l’URL ; rien ne vérifie le rôle au moment du rendu. | `app/(workspace)/proprietaire/[section]/page.tsx`, `admin/page.tsx` (aucun `requireRole`), `WorkspaceShell.tsx` (client) | LOT 2 : sessions `httpOnly` + garde serveur dans les layouts + `middleware` + refus d’accès réel (403/redirect). |
| **B3** | **Le rôle administrateur est un champ de profil modifiable par le client.** `hasWorkspaceAccess()` accorde l’administration si `profile.demoRole === "admin"`. Un utilisateur peut s’attribuer l’admin en éditant le stockage. | `lib/auth.ts` (`hasWorkspaceAccess`, `accessibleWorkspaces`) | LOT 2 : rôles en table `user_roles`, jamais dérivés d’un profil ; `admin`/`superadmin` distincts. |
| **B4** | **Autorisations d’agents déclaratives.** L’espace agent est filtré par une liste de démonstration : pas de mandat, pas de statut serveur, pas d’expiration, pas de révocation, pas de contestation traçable. | `lib/portal-data.ts` (`DEMO_AGENT_AUTHORIZATIONS`), `AgentWorkspace.tsx` | LOT 2/3 : table `authorizations` + workflow (demande → acceptation admin → activation → révocation/expiration) + `authorization_events`. |
| **B5** | **Aucune validation serveur.** Tous les contrôles sont côté client ; aucune API n’existe donc rien ne protège la cohérence des données. | `lib/auth.ts` (`validateSignUp`, `validateSignIn`…) appelés uniquement par `AuthProvider` | LOT 2 : schémas Zod exécutés dans les services serveur, erreurs par champ renvoyées telles quelles. |
| **B6** | **Données de démonstration affichées comme des faits.** 36 biens avec `verifiedOn`, stats d’accueil « 250+ biens vérifiés », alors qu’aucun contrôle n’a eu lieu. `DEMO_DATA = true` n’est pas visible sur les fiches. | `lib/content.ts` (`DEMO_DATA`, `STATS`, `PROPERTIES[].verifiedOn`), `PropertyCard`/`PropertyDetail` | LOT 2 : données désormais servies par la base, statut de vérification dérivé d’un vrai dossier (`verifications` + `verification_steps`) ; mention « vérification » conditionnée au dossier réel. |
| **B7** | **Photos et pièces jamais stockées.** Le wizard propriétaire ne conserve que des noms de fichiers (`photoNames`, `documentNames`) : aucun téléversement, aucun contrôle de droits, aucun ordre de galerie. | `lib/workflow.ts` (`PropertyDraft.photoNames`), `AdminWorkspace.tsx` (« aucun document n’a été téléversé ») | LOT 3 : `property_photos` (position, image principale) + `documents` ; stockage local `data/uploads` contrôlé par les droits, ordre persistant. |
| **B8** | **Aucun journal d’audit, historique réinscriptible.** Les changements de statut de visite/dossier sont libres et silencieux. | `WorkflowProvider` (`updateData` écrit directement l’état) | LOT 2 : tables `audit_log`, `visit_events`, `authorization_events` (immuables, horodatées, auteur enregistré). |

### 2.2 Importants

| # | Problème | Preuve | Action |
|---|---|---|---|
| **I1** | Vérification réduite à une décision unique : pas d’étapes, pas de responsable, pas de demande de pièces, pas de distinction « documentaire » / « sur place ». | `lib/workflow.ts` (`recordVerificationDecision`, `VerificationDecision`) | LOT 5 : `verifications` + 8 étapes `verification_steps` (statut, acteur, date, commentaire interne). LOT 2 crée les tables. |
| **I2** | Notifications locales non événementielles : `makeNotification` écrit dans le stockage de l’utilisateur courant ; l’agent et l’administration ne reçoivent jamais rien. | `lib/workflow.ts` (`makeNotification`), `CommunicationPages.tsx` | LOT 2 : table `notifications` + service `notify()` appelé par les services métier (affectation, visite, vérification). |
| **I3** | Disponibilité réduite à un booléen : pas de créneaux, pas de conflits détectés, pas de double réservation empêchée, pas de durée d’indisponibilité. | `lib/content.ts` (`availabilityStatus?: "disponible" \| "indisponible"`) | LOT 2 : `property_availability` + `visit_slots` (capacité, statut) ; LOT 4 : détection de conflit et reprogrammation. |
| **I4** | Localisation plate : `city` + `district` seulement. « Fidjrossè » apparaît à la fois comme ville et comme quartier ; aucune table de référence pays/département/commune/arrondissement. | `lib/content.ts` (`SEARCH_SELECTS.location`), `lib/content.ts` `Property` | LOT 2 : colonnes `country`, `department`, `commune`, `district` + table `locations` de référence (Bénin) ; LOT 6 : saisie avec suggestions. |
| **I5** | Espace client scindé en deux groupes de routes avec deux layouts quasi identiques (`/client/*` dans `(client)`, `/client/paiements` dans `(workspace)`). | `app/(client)/layout.tsx`, `app/(workspace)/layout.tsx`, `app/(workspace)/client/paiements/page.tsx` | LOT 7 : regroupement des routes client dans `(workspace)` ; un seul layout. |
| **I6** | Pas d’atterrissage par rôle après connexion : l’utilisateur passe par `/verification-email` puis `redirectTo`, sans sélection d’espace pertinente. | `components/auth/SignInForm.tsx`, `ConnexionView.tsx` | LOT 2 : `/api/me/spaces` renvoie les espaces réellement accessibles + destination par défaut ; LOT 7 : switch d’espace dans le menu de profil. |
| **I7** | Hero d’accueil : vidéo de 4,3 Mo en lecture automatique (`public/video/background_video.mp4`), coût de bande passante et de batterie, lisibilité du texte réduite. | `components/home/Hero.tsx` (`<source src="/video/background_video.mp4">`) | LOT 6/7 : image forte à la place (route de l’Amazonie si une image vérifiable est disponible), vidéo retirée du chemin critique. |
| **I8** | Deux systèmes de favoris : `/favoris` (visiteur, `localStorage`) et `/client/favoris` (compte). | `app/(site)/favoris/page.tsx`, `app/(client)/client/favoris/page.tsx`, `lib/persistence.ts` | LOT 7 : table `favorites` (créée en LOT 2) + fusion des deux vues. |
| **I9** | Administration alimentée par des tableaux statiques : pas de compteurs réels, pas d’actions groupées, pas de vue détaillée serveur. | `components/workspace/AdminWorkspace.tsx` (`AdminRecords`, `DEMO_VERIFICATION_CASES`) | LOT 5 : `/api/admin/overview` (créé en LOT 2) alimenté par requêtes SQL ; actions groupées et vues détaillées. |
| **I10** | Messagerie statique : aucun fil de discussion réel, indicateur de nouveaux messages non fiable. | `components/workspace/CommunicationPages.tsx` (`MessagesPage`) | LOT 7 : tables `threads`/`messages` ; en LOT 2, la page reste marquée « à venir » plutôt que de simuler. |
| **I11** | Paiements simulés sans rapprochement serveur (soldes, retraits, quittances). | `components/workspace/PaymentMethodsPanel.tsx`, `lib/workflow.ts` (transactions de démo) | LOT 4+ : conserver l’affichage pédagogique mais **l’adosser à des écritures serveur** ; aucun paiement fictif présenté comme réel. |

### 2.3 Améliorations

| # | Problème | Preuve | Action |
|---|---|---|---|
| **A1** | Fiche de bien mono-visuel : un seul média par bien (`media: string`), pas de galerie, pas de plein écran, pas de biens similaires servis par les données. | `lib/content.ts` (`Property.media`), `PropertyDetail.tsx` | LOT 6 (+ `property_photos` dès LOT 2). |
| **A2** | Résultats et pagination calculés côté client ; pas de compteur serveur ni de tri en base. | `components/catalog/CatalogExplorer.tsx`, `lib/properties.ts` | LOT 6 : pagination et facettes côté serveur via `/api/properties`. |
| **A3** | Dérive documentaire : `CURRENT_STATE.md` et `PROJECT.md` décrivent `/aide`, `/confidentialite`, `/inscription/[role]`, `/biens/[slug]`, `/reinitialiser-mot-de-passe` — ces routes n’existent pas ou ont changé. | `CURRENT_STATE.md` §1 vs `app/**` | LOT 1 : `PROJECT.md` corrigé ; `CURRENT_STATE.md` remplacé par `AUDIT.md` + `ROADMAP.md` synchronisés. |
| **A4** | Aucun test d’intégration serveur, aucun test E2E navigateur. | `scripts/test-motion.mjs` (uniquement pures fonctions + DOM statique) | LOT 2 : `scripts/test-backend.mts` (scénarios métier réels sur la base) ; E2E Playwright reporté (binaire Chromium indisponible dans l’environnement). |
| **A5** | Redondances d’intitulés dans les espaces (« Espace client », « Espace propriétaire » répétés en en-tête, sidebar et pied). | `components/workspace/WorkspaceShell.tsx` (`ROLE_LABEL`), `Primitives.tsx` | LOT 7 : rôle identifiable une fois, switch d’espace dans le menu de profil. |
| **A6** | Menus déroulants avec barres de défilement décoratives sur certaines largeurs ; panneaux de largeur variable. | `components/layout/PublicHeader.tsx`, `Navbar.tsx` | LOT 7 : harmonisation (largeur fixe, `max-height` maîtrisée). |
| **A7** | Certaines capacités sont annoncées `available: false` dans le référentiel mais restent accessibles dans l’interface (visites, dépôt de bien). | `lib/auth.ts` (`CAPABILITIES`), `ClientJourneys.tsx` | LOT 3/4 : ces parcours deviennent réels (serveur) ; le référentiel est mis à jour au fur et à mesure. |

---

## 3. Décisions structurantes prises à l’issue de l’audit

1. **Un seul backend, pas deux.** Supabase n’est ni configuré ni prévu dans le dépôt. L’environnement
   de développement ne permet pas d’atteindre un PostgreSQL managé ; HOMERA adopte donc
   **SQLite (fichier local, `better-sqlite3`) derrière une couche d’accès isolée**, avec un schéma
   et des types **portables vers PostgreSQL/Supabase** : le passage se fait en remplaçant le pilote,
   pas en réécrivant les services. Consigné dans [`BACKEND.md`](./BACKEND.md).
2. **Le backend devient la source de vérité avant toute refonte d’interface.** Les pages publiques
   et les espaces consomment les données du serveur dès que la table correspondante existe ;
   les données de démonstration servent uniquement à l’amorçage et sont marquées comme telles.
3. **Aucune autorisation n’est déduite du client.** Rôles, mandats et vérifications sont décidés
   côté serveur ; le client affiche ce que le serveur a tranché.
4. **Rien n’est annoncé comme fait.** Chaque fonctionnalité non branchée est marquée « à venir »
   dans l’interface plutôt que simulée (messagerie, paiements, suppression de compte).

---

## 4. Suivi

| Lot | Contenu | État |
|---|---|---|
| LOT 1 | Audit, architecture, inventaire | ✅ Terminé (ce document) |
| LOT 2 | Modèle de données, authentification serveur, permissions, sécurité | ✅ Terminé — socle décrit et mesuré dans [`BACKEND.md`](./BACKEND.md) (§8 : preuves exécutées) |
| LOT 3 | Biens, photos, publication, propriétaires, agents, autorisations | ⏳ À venir |
| LOT 4 | Disponibilités, visites, annulations, demandes de location, notifications | ⏳ Partiel (tables et services créés en LOT 2, interface à brancher) |
| LOT 5 | Outils de contrôle administratif et workflow de vérification | ⏳ Partiel (tables et API d’aperçu créées en LOT 2) |
| LOT 6 | Refonte des fiches de biens et d’Explorer | ⏳ Partiel (les pages publiques lisent déjà la base ; filtres et pagination encore côté client) |
| LOT 7 | Navigation, espaces, messagerie, responsive, design system | ⏳ À venir |
| LOT 8 | Tests complets, performances, documentation finale | ⏳ À venir |

> Les statuts de ce tableau sont mis à jour à la fin de chaque lot. Les preuves
> (commandes exécutées et résultats) sont consignées dans `BACKEND.md` §8, une seule
> fois, et complétées lot par lot.
