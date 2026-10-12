# ROADMAP — Plan d'Évolution HOMERA

Ce document structure la feuille de route du frontend et du produit HOMERA par jalons vérifiables.

---

## Jalon 1 — Accueil Cinématique & Design System (Livré & Vérifié)
- [x] Parcours d'accueil en 9 scènes narratives (`Hero`, `StatsSection`, `ExplorerSection`, `FeaturedProperties`, `PropertyDossier`, `VerificationProtocol`, `ServicesSection`, `EditorialSection`, `TrustVisionSection`).
- [x] Système de mouvement natif sans dépendance (`lib/motion.ts`, `lib/motion-frame.ts`, `lib/motion-math.ts`) avec respect strict de `prefers-reduced-motion`.
- [x] Tokens CSS unifiés dans `app/globals.css` (couleurs clair/sombre, typographie 4 polices, espacements, rayons par rôle, courbes).
- [x] Pipeline d'images optimisées (`scripts/build-images.mjs`, AVIF/WebP + `blurDataURL`).

## Jalon 2 — Catalogue Public & Exploration sans Compte (Livré & Vérifié)
- [x] Moteur unique de recherche et filtrage (`lib/properties.ts`) partagé serveur/client.
- [x] Pages projets (`/acheter`, `/louer`, `/sejour`), sous-catégories et 36 fiches détaillées (`/biens/[id]`).
- [x] Favoris et recherches sauvegardées dans le navigateur (`lib/persistence.ts`, `/favoris`).
- [x] Pages institutionnelles et légales (`/services`, `/services/[slug]`, `/a-propos`, `/contact`, `/legal`, `/mentions-legales`, `/politique-verification`, `/regles-visite`, `/regles-location`, `/cookies`).

## Jalon 3 — Authentification & Rôles Cumulables (Livré & Vérifié)
- [x] Cinq écrans de compte (`/connexion`, `/inscription`, `/mot-de-passe-oublie`, `/reinitialisation`, `/verification-email`).
- [x] Trois rôles cumulables (`client`, `proprietaire`, `agent`) avec socle client universel et ajout de rôle sans ressaisie d'identité (`RoleUpgrade`).
- [x] Hachage **scrypt** côté serveur (sel et paramètres par compte), codes temporisés à 6 chiffres (5 essais, 15 min) et comptes de démonstration (`admin`, `user`, `agent`, `prop`). L'ancien hachage PBKDF2 local a été remplacé par le service serveur — voir `BACKEND.md` §3.

## Jalon 4 — Espaces Métiers & Traçabilité (Livré & Vérifié)
- [x] Espace Client (`/client`, `/client/favoris`, `/client/visites`, `/client/demandes`, `/client/contrats`, `/client/profil`, `/client/parametres`).
- [x] Espace Propriétaire (`/proprietaire`, `/proprietaire/biens`, `/proprietaire/ajouter-bien` wizard 11 étapes, `/proprietaire/demandes`, `/proprietaire/visites`, `/proprietaire/locations`, `/proprietaire/agents`, `/proprietaire/documents`, `/proprietaire/abonnement`).
- [x] Espace Agent (`/agent`, `/agent/biens`, `/agent/visites`, `/agent/clients`, `/agent/documents`, `/agent/autorisations`, `/agent/profil`) avec accès strict par mandat actif et QR code ISO interne (`lib/qr.ts`).
- [x] Espace Administration (`/admin`, `/admin/verifications`, `/admin/utilisateurs`, `/admin/proprietaires`, `/admin/agents`, `/admin/biens`, `/admin/visites`, `/admin/demandes`, `/admin/signalements`, `/admin/documents`, `/admin/statistiques`, `/admin/parametres`).
- [x] Pages transverses (`/notifications`, `/messages`, `/verification-agent`, `/historique/[reference]`).

## Jalon 5 — Gouvernance Agent Frontend Autonome & Audit Qualité Expert (Livré & Vérifié)
- [x] Mise en place du cadre permanent (`AGENTS.md`, `PROJECT.md`, `VISION.md`, `DESIGN_SYSTEM.md`, `FRONTEND_RULES.md`, `QUALITY_GATE.md`, `ROADMAP.md`, `CURRENT_STATE.md` + `docs/pages/`, `docs/components/`, `docs/interactions/`).
- [x] Création du vérificateur automatisé `scripts/quality-gate.mjs` (`npm run quality:gate`).
- [x] Élimination complète des classes typographiques fantômes (`text-body-md`, `text-heading-lg`) et des ~38 classes `text-[...]` / `text-sm` / `text-base` / `text-xl` hors échelle.
- [x] Correction de l'affichage des champs de profil par rôle (`ProfileSettings.tsx`).
- [x] Synchronisation dynamique des compteurs de notifications (`/client`) et des vérifications admin (`WorkspaceShell.tsx`), fermeture clavier `Escape` et clic extérieur sur le menu de notifications.
- [x] Alignement responsive desktop du `WorkspaceFooter` avec les barres latérales fixes (`lg:pl-[268px]`).
- [x] Enrichissement UX de `/verification-agent` (formulaire de contrôle interactif + sélection rapide des mandats de démo) et du wizard propriétaire (ajout rapide de pièces d'exemple).
- [x] Correction des anomalies d'accessibilité HTML (`<label>` imbriqué dans `OwnerWorkspace.tsx`, `sr-only` d'IDs bruts dans `Primitives.tsx`).

---

## Jalon 6 — Socle serveur (LOT 2) — Livré & Vérifié

Référence technique : [`BACKEND.md`](./BACKEND.md). Aucune information n'est dupliquée ici.

- [x] **Base SQLite versionnée** (`lib/server/db/`) : 28 tables, migrations idempotentes, aucune migration destructive, schéma portable vers PostgreSQL.
- [x] **Authentification serveur** : mots de passe **scrypt** salés, sessions par jeton opaque en cookie `httpOnly` + `SameSite=Lax`, tentatives limitées (5 essais / 15 min), révocation des sessions au changement de mot de passe.
- [x] **Rôles décidés en base** (`user_roles`) : `client`, `proprietaire`, `agent`, plus les habilitations `admin` et `superadmin`. L'administration n'est plus déduite d'un champ de profil modifiable par le navigateur.
- [x] **Garde serveur** : `middleware.ts` (présence de session) + `guardWorkspace()` dans 21 pages + contrôle de rôle dans chaque route d'API (`401` / `403`, jamais de silence).
- [x] **33 routes d'API** et **7 services métier** validés par Zod **dans les services**, avec messages d'erreur par champ rendus tels quels.
- [x] **Journal d'audit immuable** (`audit_log`) et **notifications persistées** produites par les services, avec compteur de non-lues servi par `/api/auth/session`.
- [x] **Le site public lit la base** : accueil, `/explorer`, `/acheter`, `/louer`, `/sejour`, leurs catégories et les fiches `/biens/[id]` consomment `listProperties(getDb())` / `loadProperty(getDb(), id)`.
- [x] **Compte côté serveur** : `AuthProvider` ne stocke plus rien dans le navigateur, il lit `/api/auth/session`.

### 6.1 Enrichissements frontend
- [x] Comparateur côte à côte des biens favoris dans `/favoris` et `/client/favoris` (`components/catalog/PropertyComparison.tsx`).
- [x] Vue cartographique interactive des communes (Cotonou, Abomey-Calavi, Ouidah, Porto-Novo) dans `/explorer` (`components/catalog/CommuneMapExplorer.tsx`).
- [x] Filtre « logement meublé » dans l'explorateur (`lib/properties.ts` → `furnishedOnly`, paramètre `meuble=1`).
- [ ] Tests E2E navigateur multi-viewports (Playwright) dès qu'un binaire Chromium est disponible dans l'environnement.

### 6.2 Lots restants (ordre imposé)

| Lot | Contenu | État |
|---|---|---|
| LOT 3 | Biens, photos, publication, propriétaires, agents, autorisations | À venir |
| LOT 4 | Disponibilités, visites, annulations, demandes de location, notifications | Tables et services prêts, **interface à brancher** |
| LOT 5 | Outils de contrôle administratif et workflow de vérification | Tables et API d'aperçu prêtes, écrans à construire |
| LOT 6 | Refonte des fiches de biens et d'Explorer | Pages déjà alimentées par la base ; filtres et pagination à passer côté serveur |
| LOT 7 | Navigation, espaces, messagerie, responsive, design system | À venir |
| LOT 8 | Tests complets, performances, documentation finale | À venir |

### 6.3 Hors périmètre pilote, à décider avant production

- [ ] E-mails transactionnels (vérification, réinitialisation) : aujourd'hui le code est **affiché** à l'écran, jamais présenté comme envoyé.
- [ ] Hébergement réel des photos et des pièces justificatives.
- [ ] Encaissement de paiements et intégration Mobile Money (FedaPay / KkiaPay) : aucun paiement fictif n'est présenté comme réel.
- [ ] Messagerie interne (fils de discussion persistés).
