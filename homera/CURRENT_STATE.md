# CURRENT_STATE — État Actuel & Journal d'Audit HOMERA

> **Dernière mise à jour** : 2026-10-06
> **Branche active** : `arena/a6134f99-homera`
> **Statut global** : `QUALITY_GATE.md` 100 % validé (Fonctionnel, Design System, UX, Accessibilité/Technique, Custom Design & Creative Quality)

---

## 1. Vue d'ensemble de l'application

HOMERA est une plateforme immobilière béninoise de confiance construite avec **Next.js 16.3.5 (App Router)**, **React 19.2.8**, **TypeScript 5** et **Tailwind CSS v4**.

### Périmètre opérationnel actuel
- **Site public (`app/(site)/*`)** :
  - Accueil éditorial animé (`/`) : Hero, Manifeste, Scène cinématique 4 chapitres (`VerifiedJourneyScene`), Biens vérifiés (`PropertyPreview`), Services (`Services`), Témoignages (`Testimonials`), Bandeau CTA (`CtaBanner`).
  - Catalogue immobilier vérifié (`/explorer`, `/acheter`, `/louer`, `/sejour`) avec filtres multicritères, recherche, tri, facettes dynamiques et pagination.
  - Fiches détaillées (`/biens/[slug]`) pour les 36 biens du catalogue, plus alias historique `/biens/[slug]/historique` et page canonique `/historique-bien/[id]`.
  - Pages institutionnelles et confiance : `/services`, `/a-propos`, `/aide`, `/contact`, `/mentions-legales`, `/confidentialite`, `/cgu`, `/verification-agent`.
- **Authentification (`app/(auth)/*`)** :
  - `/connexion`, `/inscription`, `/inscription/[role]` (`client`, `proprietaire`, `agent`), `/verification-email`, `/mot-de-passe-oublie`, `/reinitialiser-mot-de-passe`.
- **Espaces métiers (`app/(workspace)/*` & `/client`)** :
  - **Client** : `/client`, `/client/favoris`, `/client/recherches`, `/client/visites`, `/client/demandes`, `/client/contrats/[id]`, `/client/messages`, `/client/notifications`, `/client/profil`, `/client/parametres`, `/biens/[slug]/visite`, `/biens/[slug]/demande`.
  - **Propriétaire** : `/proprietaire`, `/proprietaire/biens`, `/proprietaire/biens/nouveau`, `/proprietaire/visites`, `/proprietaire/demandes`, `/proprietaire/contrats`, `/proprietaire/agents`, `/proprietaire/messages`, `/proprietaire/abonnement`, `/proprietaire/notifications`, `/proprietaire/profil`, `/proprietaire/parametres`.
  - **Agent** : `/agent`, `/agent/biens`, `/agent/visites`, `/agent/clients`, `/agent/messages`, `/agent/notifications`, `/agent/profil`, `/agent/parametres`.
  - **Administration** : `/admin`, `/admin/verifications`, `/admin/utilisateurs`, `/admin/litiges`, `/admin/parametres`.

---

## 2. Cadre documentaire permanent (Étapes 1 à 3)

Le dépôt dispose désormais d'un système de gouvernance markdown complet synchronisé à la racine du dépôt (`/`) et dans `/homera/` :
- `AGENTS.md` — Cerveau opérationnel permanent de l'agent frontend autonome :
  - Manifeste cardinal (« *HOMERA ne cherche pas à avoir beaucoup de contenu. HOMERA cherche à avoir exactement le bon contenu.* »).
  - Rôle quadruple (**Senior Frontend Engineer + Product Designer + UX Engineer + Directeur Artistique**).
  - Boucle d'exécution autonome en **7 phases** (*1. Compréhension → 2. Recherche & Inspiration → 3. Audit & Direction → 4. Conception & Implémentation → 5. Critique & Suppression → 6. Tests & Validation → 7. Mise à jour de l'état*).
   - Bloc complet **`HOMERA — CUSTOM DESIGN & VISUAL DIRECTION`** en 17 sections (*Principe fondamental, Conception avant implémentation, Content Before Layout, Inspiration externe obligatoire, Borrow Patterns Not Interfaces, Recherche comparative, Architecture des sections, Nombre de sections, Densité et rythme visuel, Contenu sur mesure, Direction visuelle, Images et photographie, Motion design, Auto-critique obligatoire, Test de suppression, Test de nécessité, Standard final*).
   - Bloc complet **`HOMERA — PRODUCT QUALITY & AUTONOMOUS DESIGN INTELLIGENCE`** en 15 sections : identité simultanée à 10 rôles (*Senior Frontend Engineer, Senior Product Designer, Senior UX Designer, UI Designer, Content Designer, Information Architect, UX Writer, Accessibility Specialist, Conversion / Product Experience Specialist, Visual Quality Director*), audit en 15 questions avec pouvoir explicite de décision (`OUI, AJOUTER`, `OUI, MODIFIER`, `OUI, SUPPRIMER`, `NON, CONSERVER`), 10 dimensions de qualité et boucle autonome en 11 étapes (`COMPRENDRE → ANALYSER → RECHERCHER → DÉCIDER → IMPLÉMENTER → TESTER → VISUALISER → CRITIQUER → CORRIGER → VALIDER → DOCUMENTER`).
   - Bloc complet **`HOMERA — GLOBAL SPEED & FLUIDITY DIRECTIVE`** en 15 sections (*Tout doit être rapide, Règle de réactivité, Ne pas confondre vitesse et animation, Éliminer les attentes inutiles, Performance technique, Performance perçue, Priorité du contenu, Navigation sans friction, Mobile first pour la rapidité, Stabilité, Erreurs, Mesure globale, Test utilisateur, Optimisation continue, Critère final*).
   - Garde-fous Next.js 16 (`<!-- BEGIN:nextjs-agent-rules -->`).
- `VISION.md` — Positionnement éditorial, piliers de confiance immobilière au Bénin, axiomes `UTILITÉ > QUANTITÉ`, `Content Before Layout`, `Borrow Patterns, Not Interfaces` et discipline de suppression.
- `PROJECT.md` — Architecture technique, cartographie des routes et flux de données (`content.ts`, `editorial-guides.ts`, `auth.ts`, `workflow.ts`, `portal-data.ts`, `qr.ts`).
- `DESIGN_SYSTEM.md` — Palette (`#faf6ef`, `#3e2418`, `#b3502c`), typographie à 4 familles, échelle stricte `--text-*`, rayons `--radius-*`, ombres et mouvement.
- `FRONTEND_RULES.md` — Standards de code React 19 / Next.js 16 / Tailwind v4, hydratation déterministe, accessibilité WCAG AA, directive de vitesse & fluidité et anti-patterns interdits.
- `QUALITY_GATE.md` — Checklist objective de validation en **7 catégories** (1. Fonctionnel, 2. Design System & Cohérence Visuelle, 3. UX & États d'interface, 4. Accessibilité & Qualité Technique, 5. **Custom Design & Creative Quality** : `5.1` à `5.8`, 6. **Product Quality & Autonomous Design Intelligence** : `6.1` à `6.4`, 7. **Global Speed & Fluidity Directive** : `7.1` à `7.3`) bloquante avant toute livraison.
- `ROADMAP.md` — Feuille de route incrémentale (Paliers 1 à 4).
- `CURRENT_STATE.md` — Présent journal d'état et d'audit.
- `docs/pages/` (`README.md`, `PUBLIC_SITE.md`, `AUTH_FLOWS.md`, `WORKSPACES.md`).
- `docs/components/` (`README.md`, `PRIMITIVES_AND_LAYOUT.md`, `CATALOG_AND_HOME.md`, `WORKSPACE_AND_AUTH.md`).
- `docs/interactions/` (`README.md`, `MOTION_AND_SCROLL.md`, `WORKFLOWS_AND_STATE.md`, `ACCESSIBILITY_AND_RESPONSIVE.md`).

---

## 3. Audit complet & Corrections réalisées (Étape 4)

Lors de l'exécution du workflow `AGENTS.md` sur HOMERA, un audit exhaustif statique et dynamique a permis d'identifier et de corriger les anomalies suivantes :

### 3.1 Fonctionnel & Logique métier
1. **Profil d'espace (`components/workspace/ProfileSettings.tsx`)** :
   - *Constat* : `ProfilePage` filtrait `describeProfile(account.roles, account.profile)` avec d'anciens libellés (`Téléphone`, `Commune`, `Projet`) qui ne correspondaient pas aux libellés réels de `describeProfile` (`Téléphone principal`, `Ville de recherche`, `Projet principal`, `Agence ou cabinet`, `Biens déclarés`, etc.), rendant la liste des informations complémentaires systématiquement vide pour les propriétaires et agents.
   - *Correction* : Appel direct à `describeProfile(role, account.profile)` (avec repli sur `describeProfile(account.roles, account.profile)`), affichant désormais les informations exactes du rôle actif.
2. **Badge de vérifications Admin (`components/workspace/WorkspaceShell.tsx`)** :
   - *Constat* : Le compteur de la barre latérale Admin sur « Vérifications » était figé à `3` en dur au lieu de refléter la file réelle.
   - *Correction* : Calcul dynamique de `openVerificationCount` à partir des dossiers propriétaire en attente (`en-verification` / `corriger`) et des entrées `DEMO_VERIFICATION_QUEUE` non clôturées (`decision !== "valide" && decision !== "refuse"`).
3. **Synchronisation des notifications Client (`components/client/ClientDashboard.tsx`)** :
   - *Constat* : Le compteur `pendingActions` et la section `#notifications` du tableau de bord `/client` ignoraient les notifications non lues issues de `workflow.data.notifications`.
   - *Correction* : Intégration de `unreadWorkflowNotifications` dans `pendingActions`, affichage des alertes `workflow.data.notifications` dans `#notifications` avec action « Tout marquer comme lu » et marquage individuel au clic.
4. **Raccourci « Mon profil » dans la barre latérale (`components/workspace/WorkspaceShell.tsx`)** :
   - *Constat* : Le lien « Mon profil » en bas de la barre latérale redirigeait vers `/client/profil` lorsqu'un compte multi-rôles consultait `/proprietaire` ou `/agent`.
   - *Correction* : Résolution du profil selon le rôle actif de l'espace (`activeRoleForProfile`).
5. **Recherche interactive sur `/verification-agent` (`components/workspace/AgentVerification.tsx`)** :
   - *Constat* : Un visiteur accédant à `/verification-agent` sans paramètres d'URL ne disposait d'aucun formulaire pour saisir un matricule d'agent et une référence de bien.
   - *Correction* : Ajout d'un formulaire `GET` accessible (`agent` + `bien`), normalisation de la casse/espaces et boutons d'exemples rapides issus de `DEMO_AGENT_AUTHORIZATIONS`.
6. **Ajout rapide de pièces d'exemple dans l'assistant de dépôt (`components/workspace/PropertyWizard.tsx`)** :
   - *Constat* : Aux étapes 4 (Photos) et 7 (Documents), tester le parcours complet sans fichiers locaux nécessitait obligatoirement l'ouverture du sélecteur de fichiers système.
   - *Correction* : Conservation du `<input type="file">` natif et ajout d'un bouton d'ajout rapide de noms de fichiers d'exemple pour fluidifier les tests du pilote.
7. **Comparateur côte à côte des favoris & suppression du bouton mort (`components/catalog/PropertyComparison.tsx`, `FavoritesView.tsx`, `ClientFavorites.tsx`)** :
   - *Constat (Phase 5 — Critique & Suppression)* : `/client/favoris` affichait un bouton désactivé « Comparer · bientôt » sans valeur utilisateur, et `/favoris` listait les biens sans synthèse comparative.
   - *Correction (Phase 4 — Conception sur mesure)* : Suppression du placeholder mort et création de `PropertyComparison.tsx` permettant de comparer jusqu'à 3 biens côte à côte (prix, prix/m², surface, configuration, foncier/durée minimale, date de contrôle HOMERA, disponibilité, équipements et actions directes) dès que 2 biens sont mis en favoris.
8. **Continuité contextuelle des parcours publics (`PropertyDetail.tsx`, `ServiceDetail.tsx`, `services/page.tsx`, `contact/page.tsx`)** :
   - *Constat* : Sur `/biens/[id]`, la carte latérale « Organiser une visite » restait active même lorsque le bien était marqué `indisponible` (contredisant l'en-tête), et le bouton « Poser une question » ne transmettait pas `?bien=${property.homeraId}` à `/contact`. De plus, `/services/[slug]` envoyait `?service=...` alors que `/contact` lisait uniquement `?sujet=...`.
   - *Correction* : Adaptation de la carte latérale aux biens indisponibles, transmission automatique de `?bien=${property.homeraId}`, unification de `?sujet=${service.id}` et ajout de liens directs vers les fiches `/services/[slug]` depuis `/services`.
9. **Exploration cartographique interactive des communes et quartiers (`components/catalog/CommuneMapExplorer.tsx`, `CatalogExplorer.tsx`)** :
   - *Conception sur mesure (Phase 4 — Custom Design)* : Création d'une carte vectorielle éditoriale du littoral et du bassin lagunaire sud-béninois (**Ouidah**, **Abomey-Calavi**, **Cotonou**, **Porto-Novo**, *Route des Pêches*, *Lac Nokoué*, *Océan Atlantique*) intégrée dans `/explorer` et activable sur toutes les vues catalogue. Permet de filtrer en un clic par commune ou par quartier vérifié avec compteurs dynamiques.
10. **Suppression du bouton mort dans `/proprietaire/abonnement` et synchronisation temps réel des espaces Propriétaire, Agent et Admin (`OwnerWorkspace.tsx`, `AdminWorkspace.tsx`, `AgentWorkspace.tsx`, `CommunicationPages.tsx`)** :
   - *Constat (Phase 5 — Critique & Suppression)* : `/proprietaire/abonnement` affichait un bouton désactivé « Continuer vers le paiement · bientôt disponible » sans utilité, `OwnerDashboard` et `AdminDashboard` omettaient les biens soumis localement (`data.listings`) dans leurs listes récapitulatives, `/admin/visites` et `/admin/demandes` affichaient une ligne statique au lieu des visites et candidatures enregistrées dans `WorkflowProvider`, et `/agent/profil` n'affichait pas les champs métier complets de `describeProfile("agent", account.profile)`.
   - *Correction* : Remplacement du bouton mort de `/proprietaire/abonnement` par des actions contextuelles directes (`/proprietaire/ajouter-bien` pour la formule gratuite *Essentiel*, `/contact?sujet=gestion` pour les formules sur devis *Gestion* et *Portefeuille* + lien vers `/services/gestion-immobiliere`), synchronisation complète de `data.listings`, `data.visits` et `data.applications` dans `OwnerDashboard`, `AdminDashboard` et `AdminRecords`, enrichissement de `/agent/profil` avec tous les champs du profil agent et lien vers `/client/parametres`, et ajout d'un lien direct vers la fiche du bien (`/biens/[id]`) depuis l'en-tête d'une conversation dans `/messages`.
11. **Enrichissement éditorial, territorial et d'aide à la décision sur l'ensemble du site public (`lib/editorial-guides.ts`, `PropertyDetail.tsx`, `ProjectPage.tsx`, `CategoryPage.tsx`, `ServiceDetail.tsx`, `a-propos/page.tsx`, `contact/page.tsx`)** :
   - *Diagnostic (`COMPRENDRE → ANALYSER → DÉCIDER : OUI, AJOUTER / OUI, MODIFIER`)* : Plusieurs pages publiques manquaient de substance textuelle et de repères concrets pour aider un acheteur, un locataire ou un membre de la diaspora à décider (une seule phrase sous « Le bien » dans `/biens/[id]`, aucun contexte de quartier, pas d'explication des titres fonciers / ACD / compteurs SBEE-SONEB sur `/acheter` et `/louer`, fiches `/services/[slug]` réduites à 3 cartes génériques).
   - *Implémentation* :
     - Création de `lib/editorial-guides.ts` (zéro statistique inventée, 100 % ancré dans la réalité immobilière béninoise).
     - Sur les **36 fiches `/biens/[id]`** (`PropertyDetail.tsx`) : synthèse architecturale complète, bloc **« Cadre de vie & localisation »** propre à chacun des 13 quartiers de Cotonou, Abomey-Calavi, Porto-Novo et Ouidah, et bloc **« Repères financiers & cadre d'engagement »** (prix/m² calculé, lecture du statut foncier ou locatif, 3 précautions indispensables avant de s'engager).
     - Sur **`/acheter`, `/louer`, `/sejour`** (`ProjectPage.tsx`) et les **11 pages `/[projet]/[categorie]`** (`CategoryPage.tsx`) : guide de décision en 3 piliers + FAQ métier interactive (`<details>`) et points de contrôle par catégorie.
     - Sur les **4 fiches `/services/[slug]`** (`ServiceDetail.tsx`) : périmètre d'exécution en 4 étapes, profils accompagnés, livrables documentaires et FAQ dédiée à chaque métier.
     - Sur **`/a-propos`** et **`/contact`** : section **« À qui s'adresse HOMERA »** (4 profils), tableau comparatif **« Ce que couvre le contrôle HOMERA — et ce qui relève du notaire et de l'ANDF »**, et guide de préparation des demandes de contact.
12. **Optimisation globale de la vitesse, de la réactivité et de la fluidité (`GLOBAL SPEED & FLUIDITY DIRECTIVE` — `CatalogExplorer.tsx`, `Hero.tsx`, `AuthProvider.tsx`, `app/(site)/loading.tsx`)** :
   - *Diagnostic (`COMPRENDRE → ANALYSER`)* :
     - La saisie dans la barre de recherche de l'explorateur (`CatalogExplorer.tsx`) attendait la soumission manuelle du formulaire au lieu de filtrer instantanément au fil de la frappe, et ne proposait pas de bouton d'effacement rapide (`×`).
     - Les 3 premières cartes de biens de l'explorateur n'avaient pas `priority={index < 3}`, retardant le LCP des pages catalogue, et la carte des communes ouverte par défaut sur `/explorer` repoussait les résultats sous la ligne de flottaison sur mobile.
     - Le Hero (`Hero.tsx`) masquait initialement son `<h1>` et son `SearchModule` (`entered = false`) jusqu'à l'hydratation JS et chargeait la vidéo en `preload="auto"` sans `poster`.
     - Les routes dynamiques de `app/(site)/` ne disposaient pas de `loading.tsx`, et `AuthProvider.tsx` recalculait les comptes sur tout événement `storage` `homera.*`.
   - *Implémentation* :
     - Filtrage instantané au fil de la frappe (`onTermChange` + `useTransition`) et bouton d'effacement immédiat dans `CatalogExplorer.tsx`.
     - Priorité d'affichage aux résultats (`Critical content first`) : `priority={index < 3}` sur les 3 premières cartes du catalogue et ouverture à la demande de `CommuneMapExplorer`.
     - Affichage SSR immédiat du titre et de la recherche dans `Hero.tsx` + `preload="metadata"` et `poster="/images/page-cotonou.jpg"` sur la vidéo d'accueil.
     - Création de `app/(site)/loading.tsx` (`.homera-skeleton` stable) et filtrage strict des clés `ACCOUNTS_STORAGE_KEY` / `SESSION_STORAGE_KEY` dans `AuthProvider.tsx`.
13. **Refonte du système de navigation unifié des espaces & Switch d'espace global par permissions (`lib/auth.ts`, `WorkspaceShell.tsx`, `ClientDashboard.tsx`, `AccountControl.tsx`, `app/globals.css`)** :
   - *Diagnostic* :
     - `/client` (`ClientDashboard.tsx`) maintenait son propre `<aside>`, `<header>` et menu mobile séparés de `WorkspaceShell.tsx`.
     - Le profil et le bouton « Se déconnecter » restaient bloqués en permanence dans un pied de page fixe (`mt-auto border-t`), découpant artificiellement la barre latérale avec une double zone de défilement.
     - Les comptes autorisés à plusieurs espaces (`Propriétaire`, `Agent`, `Admin`) devaient revenir à l'accueil public (`/`) et ouvrir l'icône profil pour changer d'espace.
   - *Implémentation* :
     - Création de `hasWorkspaceAccess(roles, target, profile)` et `accessibleWorkspaces(roles, profile)` dans `lib/auth.ts` : un **Client** simple ne voit que `Espace client` (`/client`), tandis qu'un **Propriétaire**, un **Agent** ou un **Admin** (`Admin → Propriétaire → Agent → Client`) bascule en 1 clic entre ses espaces autorisés.
     - Unification complète : `ClientDashboard.tsx` utilise désormais `<WorkspaceShell role="client" section="dashboard">`, garantissant un **seul système de navigation commun** pour tous les espaces.
     - Panneau de navigation entièrement défilant en une seule zone continue (`.homera-nav-scroll` sans barre de défilement visible ni pied de page fixe), structuré en 3 niveaux UX : **Switch d'espace** (et accès rapide dans l'en-tête), **Navigation principale**, et **Actions secondaires** (`Profil`, `Paramètres`, `Aide & assistance`, `Retour au site`, `Se déconnecter`).

### 3.2 Accessibilité (WCAG AA) & Sémantique HTML
1. **Lecteurs d'écran sur `FormField` (`components/workspace/Primitives.tsx`)** :
   - *Constat* : `FormField` injectait `<span className="sr-only">{describedBy}</span>`, faisant lire aux technologies d'assistance les identifiants techniques DOM (`field-xxx-hint field-xxx-error`).
   - *Correction* : Suppression du `<span>` parasite ; les paragraphes `#field-${name}-hint` et `#field-${name}-error` sont déjà liés au champ via `aria-describedby`.
2. **Imbrication illégale de `<label>` (`components/workspace/OwnerWorkspace.tsx`)** :
   - *Constat* : Dans `ContractEditor`, un `<label>` englobait `FormField` qui génère déjà son propre `<label htmlFor="contract-Listing">`.
   - *Correction* : Suppression du `<label>` englobant redondant.
3. **Fermeture clavier et clic extérieur du menu de notifications (`components/workspace/WorkspaceShell.tsx`)** :
   - *Constat* : Le panneau `#workspace-notifications-menu` ne se fermait ni avec la touche `Escape` ni au clic à l'extérieur.
   - *Correction* : Ajout d'un gestionnaire `keydown` (`Escape`) et `pointerdown` extérieur via `notificationsMenuRef`.

### 3.3 Système de Design, Typographie & Mise en page
1. **Purge intégrale des classes typographiques hors échelle (21 fichiers)** :
   - *Constat* : 3 classes inexistantes (`text-heading-lg` dans `app/error.tsx`, `text-body-md` dans `Primitives.tsx` et `CommunicationPages.tsx`), 4 tailles Tailwind génériques (`text-sm`, `text-base`, `text-xl` dans `Button.tsx`, `Hero.tsx`, `PropertyCard.tsx`, `PropertyPreview.tsx`) et 39 tailles arbitraires `text-[0.58rem]` à `text-[0.68rem]` contournaient l'échelle `--text-*` de `globals.css`.
   - *Correction* : Remplacement systématique par les tokens officiels (`text-micro`, `text-caption`, `text-note`, `text-body-sm`, `text-body`, `text-display-xs`, `text-display-sm`, `text-display-md`). Seul `text-[1.06em]` (proportion relative sur l'accent italique Cormorant dans le H1 de `Hero.tsx`) est conservé et documenté.
2. **Ombres Tailwind v4 (`app/globals.css`, `PropertyCard.tsx`, `PropertyPreview.tsx`)** :
   - *Constat* : Dans `@theme inline` (`app/globals.css`), `--shadow-card: var(--shadow-card)` et `--shadow-card-hover: var(--shadow-card-hover)` étaient auto-référentiels.
   - *Correction* : Définition des valeurs concrètes dans `@theme inline` (`0 4px 20px rgba(62, 36, 24, 0.08)` et `0 12px 35px rgba(62, 36, 24, 0.16)`).
3. **Alignement desktop du `WorkspaceFooter` (`components/workspace/WorkspaceFooter.tsx`)** :
   - *Constat* : En vue desktop (`lg+`), `WorkspaceFooter` n'appliquait pas le décalage `lg:pl-[268px]` de la barre latérale fixe, provoquant un recouvrement des colonnes de gauche par la sidebar sombre. De plus, `new Date().getFullYear()` créait un risque de divergence temporelle SSR/CSR.
   - *Correction* : Ajout de `lg:pl-[calc(268px+1.5rem)] xl:pr-9` et mention déterministe `© 2026 HOMERA · Espaces pilote`.
4. **Hygiène du dépôt** :
   - Suppression du fichier parasite `/azerty` à la racine du dépôt.
   - Mise en place du script automatisé `homera/scripts/quality-gate.mjs` (`npm run quality:gate`).

---

## 4. Résultats des vérifications (`QUALITY_GATE.md`)

| Commande | Périmètre | Statut |
|---|---|---|
| `npm test` | Suite `scripts/test-motion.mjs` (mouvement, catalogue, contrastes AA, tokens CSS, auth, workflows, QR ISO 18004, gouvernance documentaire, échelle typographique) | **PASS** |
| `npm run quality:gate` | Vérification automatisée de tous les critères de `QUALITY_GATE.md` (fichiers requis, hygiène Git, typographie, accessibilité statique, routes) | **PASS** |
| `npm run lint` | ESLint 9 (`eslint-config-next/core-web-vitals` + `typescript`) | **PASS (0 erreur, 0 warning)** |
| `npx tsc --noEmit` | Vérification stricte TypeScript 5 | **PASS (0 erreur)** |
| `npm run build` | Compilation de production Next.js 16.3.5 | **PASS** |
| `npm run audit:home` | Audit DOM & crawl de l'ensemble des routes publiques | **PASS (0 anomalie)** |
