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
| LOT 3 | Biens, photos, publication, propriétaires, agents, autorisations | **Livré** |
| LOT 4 | Disponibilités, visites, annulations, demandes de location, notifications | **Livré** |
| LOT 5 | Outils de contrôle administratif et workflow de vérification | **Livré** |
| LOT 6 | Refonte des fiches de biens et d'Explorer | ✅ Livré — exploration servie par la base (filtres, tri, facettes, pagination) ; fiche : galerie, disponibilité, interlocuteur vérifié, signalement, biens comparables |
| LOT 7 | Navigation, espaces, messagerie, responsive, design system | ✅ Livré — voir jalon 10 |
| LOT 8 | Tests complets, performances, documentation finale | En cours — garde-fous de poids, 196 assertions serveur, 67 assertions mouvement, audit HTTP |

---

## Jalon 7 — LOT 3 : biens, photos, mandats (Livré & Vérifié)

Référence technique : [`BACKEND.md`](./BACKEND.md) §8.1.

- [x] Assistant de dépôt 11 étapes (`PropertyWizard`) écrit en base : brouillon, photos, pièces, soumission.
- [x] Galerie réordonnable : l'ordre est traduit côté serveur (`media_key` → identifiant) puis relu.
- [x] Dix natures de pièces justificatives reconnues par `documents.ts` ; vocabulaire unique côté serveur.
- [x] Validation des visuels contre le manifeste `lib/media.generated.ts` : un visuel inconnu est refusé.
- [x] Espace propriétaire branché sur `/api/owner/properties` (dashboard, biens, agents).
- [x] Espace agent branché sur `/api/agent/properties` et `/api/authorizations` : accepter, refuser ou contester un mandat, motif obligatoire pour refuser ou contester.
- [x] **Fuite corrigée** : les pièces d'un bien ne sont plus lisibles par un agent non mandaté (`403`).

## Jalon 8 — LOT 4 : visites et candidatures (Livré & Vérifié)

- [x] Demandes de visite écrites en base, avec détection des conflits de créneaux côté serveur.
- [x] Cycle de vie complet : demandée → confirmée → reprogrammée → effectuée, ou refusée / annulée / absence constatée.
- [x] Chaque mouvement exigeant un motif (refus, annulation, reprogrammation, absence) est refusé sans motif.
- [x] Candidatures de location (`/api/applications`) : une seule par visite, jamais sans visite effectuée, jamais sur un bien qui n'est pas à louer.
- [x] Instruction par le propriétaire, l'agent mandaté « location » ou l'administration ; refus motivé obligatoire.
- [x] Notifications réelles à chaque transition, pour chaque acteur concerné.

## Jalon 10 — LOT 7 : navigation, espaces, messagerie (Livré & Vérifié)

Référence technique : [`BACKEND.md`](./BACKEND.md) §8.3.

- [x] **Messagerie interne persistée** (`lib/server/services/messaging.ts`, `/api/messages`) : conversation adossée à un bien, lecture, envoi, marquage comme lu, compteur de non-lus. Distincte des notifications système et des alertes d'administration.
- [x] **Contrats de location réels** (`lib/server/services/contracts.ts`) : référence `CTR-<année>-<n>`, rédaction après acceptation de la candidature, signature réservée au locataire désigné, contrat signé non annulable, notification du locataire.
- [x] **Hiérarchie béninoise réelle** : les biens portent un département et une commune issus de la table des 12 départements ; `?departement=` et `?commune=` filtrent réellement (ils étaient ignorés par la route) et resserrent les facettes.
- [x] **Bascule d'espace depuis le menu de profil** : espaces réellement accessibles, avec description et espace courant marqué `aria-current`, dans le menu déroulant comme dans le menu mobile.
- [x] **Responsive** : filtres en feuille mobile (`<dialog>`), navigation d'espace repliable, en-tête public à volets.
- [x] **Favoris servis par le serveur** : `/api/favorites`, fusion du panier visiteur à la connexion.
- [x] **Retour aux résultats** sans perdre le contexte (`components/catalog/BackToResults.tsx`).
- [x] **Aucune simulation financière** : `/client/paiements`, espaces propriétaire et agent n'affichent plus ni solde, ni retrait, ni bouton « Payer ». Seuls les montants écrits dans un contrat signé sont montrés, avec la marche à suivre pour régler.
- [x] **Contrôle public d'un mandat** (`/verification-agent`) et **historique public d'un bien** (`/historique/[reference]`) : les deux lisent le serveur (registre des autorisations, journal d'audit) au lieu de jeux d'exemple.

## Jalon 9 — LOT 5 : administration et vérification (Livré & Vérifié)

- [x] Dashboard administratif sur `/api/admin/overview` : plus aucun indicateur fictif.
- [x] File de vérification branchée sur `/api/admin/verifications` avec les **8 étapes** réelles, commentaire interne, demande de pièces.
- [x] Décisions « accepter / refuser / suspendre / pièces manquantes / réexaminer » : le bien passe `publie` + `verifie`, le propriétaire est notifié.
- [x] Comptes (`/api/admin/users`) : suspension et réactivation motivées ; rôle d'administration réservé au super-administrateur.
- [x] Catalogue administratif (`/api/admin/properties`) : remettre en ligne, suspendre, archiver ou renvoyer en instruction, avec motif obligatoire pour toute mesure défavorable.
- [x] Statistiques : uniquement ce que la base sait compter. Aucun revenu, commission ou retrait n'est affiché plutôt que d'être simulé.

### 6.3 Hors périmètre pilote, à décider avant production

- [ ] E-mails transactionnels (vérification, réinitialisation) : aujourd'hui le code est **affiché** à l'écran, jamais présenté comme envoyé.
- [ ] Hébergement réel des photos et des pièces justificatives.
- [ ] Encaissement de paiements et intégration Mobile Money (FedaPay / KkiaPay) : aucun paiement fictif n'est présenté comme réel.
- [ ] Messagerie interne (fils de discussion persistés). → **livrée au LOT 7**, retiré de la liste d'attente.
