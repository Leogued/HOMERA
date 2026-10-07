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
- [x] Hachage PBKDF2-SHA-256 (150 000 itérations), codes temporisés à 6 chiffres (5 essais) et comptes de démonstration (`admin`, `user`, `agent`, `prop`).

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

## Jalon 6 — Prochaines étapes Frontend & Branchement Serveur (À venir)

### 6.1 Enrichissements Frontend optionnels
- [x] Comparateur côte à côte des biens favoris dans `/favoris` et `/client/favoris` (`components/catalog/PropertyComparison.tsx`).
- [x] Vue cartographique interactive des communes (Cotonou, Abomey-Calavi, Ouidah, Porto-Novo) dans `/explorer` (`components/catalog/CommuneMapExplorer.tsx`).
- [x] Frontend complet des moyens de paiement Bénin / UEMOA (`MTN MoMo`, `Moov Money`, `Celtiis Cash`, `Carte Visa/Mastercard`, `Virement UEMOA`) et quittances de démonstration (`components/workspace/PaymentMethodsPanel.tsx`, `/client/paiements`, `/client/contrats`, `/proprietaire/abonnement`).
- [ ] Tests E2E navigateur multi-viewports automatisés (Playwright) dès qu'un binaire Chromium est disponible dans l'environnement CI.

### 6.2 Socle Serveur & Production (voir `docs/PROCHAINES-ETAPES.md`)
- [ ] Base de données PostgreSQL + API / Server Actions pour persister les biens, visites, candidatures, contrats et événements.
- [ ] Authentification serveur (sessions `httpOnly`, e-mails transactionnels de vérification et réinitialisation).
- [ ] Stockage sécurisé des mandats PDF signés et génération serveur des contrats/quittances PDF.
- [ ] Intégration de paiement Mobile Money Bénin (FedaPay / KkiaPay).
