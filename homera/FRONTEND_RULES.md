# FRONTEND RULES — Standards d'Ingénierie & UX HOMERA

Ce document fixe les règles permanentes que tout développeur ou agent frontend autonome doit appliquer lorsqu'il crée ou modifie un composant dans HOMERA.

---

## 1. Architecture React 19 & Next.js 16 (App Router)

1. **Séparation Server / Client Components** :
   - Les `page.tsx` dans `app/` restent des Server Components chaque fois que possible pour exposer `metadata` (`title`, `description`, `robots`) et pré-rendre la structure HTML initiale.
   - La directive `"use client"` est réservée aux composants interactifs (`components/auth/*`, `components/workspace/*`, `components/client/*`, filtres dynamiques, scènes animées).
2. **Lecture des `searchParams` (Next.js 16)** :
   - Dans Next.js 16, `params` et `searchParams` passés aux pages serveur sont des **Promises** (`await searchParams`). Utiliser systématiquement `lib/search-params.ts` (`firstParam`) pour normaliser les paramètres d'URL.
3. **Hydratation sans divergence (Zéro Hydration Mismatch)** :
   - **Interdiction absolue** de placer un nœud texte d'espaces (`{" "}`) directement sous `<html>`, `<head>`, `<table>`, `<thead>`, `<tbody>`, `<tfoot>`, `<tr>` ou `<colgroup>` (vérifié par l'AST TypeScript dans `scripts/test-motion.mjs`).
   - **Interdiction de calculer une date ou l'origine du navigateur pendant le rendu initial serveur/client** : utiliser `useMounted()` (`lib/motion.ts`) ou `useSyncExternalStore` avec un snapshot serveur déterministe (voir `ClientJourneys.tsx` et `AgentWorkspace.tsx`).
4. **Zéro dépendance superflue** :
   - Ne jamais installer de bibliothèque externe d'animation (GSAP, Framer Motion), d'icônes supplémentaire ou de générateur de QR code (`qrcode.react`, `qrcode`). Utiliser les moteurs internes éprouvés (`lib/motion.ts`, `lib/qr.ts`).

---

## 2. Design System & Styling (Zéro fuite)

1. **Tokens obligatoires** :
   - Aucune classe `stone-*`, `gray-*`, `slate-*`, `zinc-*`, `neutral-*` de Tailwind par défaut.
   - Aucune couleur hexadécimale (`#...`) codée en dur dans un fichier `.tsx`.
   - Aucune courbe `ease-[cubic-bezier(...)]` recopiée à la main : utiliser `ease-standard`, `ease-soft`, `ease-in-out`.
   - Aucun rayon arbitraire `rounded-[...]` : utiliser `rounded-btn`, `rounded-input`, `rounded-card`, `rounded-menu`, `rounded-media`, `rounded-modal`, `rounded-xl`, `rounded-2xl`, `rounded-3xl`, `rounded-4xl` ou `rounded-full`.
2. **Typographie strictement contrôlée** :
   - Utiliser exclusivement l'échelle `text-micro`, `text-caption`, `text-note`, `text-body-sm`, `text-body`, `text-label`, `text-display-xs` → `2xl`, `text-display-fluid`, `text-figure*`, `text-accent*`, `text-brand*`.
   - Aucune classe `text-[...]` arbitraire (hors l'unique `text-[1.06em]` relatif du `h1` dans `Hero.tsx`), ni classe inexistante (`text-body-md`, `text-heading-lg`), ni taille Tailwind brute (`text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`).
   - Ne jamais combiner `font-serif` avec `font-semibold` ou `font-bold`.
   - Toujours ajouter `.homera-num` (`font-variant-numeric: tabular-nums`) sur les prix, surfaces, compteurs et références.

---

## 3. Navigation & Contrats de liens

1. **Toute cible `href="/..."` doit correspondre à une route réelle dans `app/`** :
   - Vérifié automatiquement par `scripts/test-motion.mjs` et `scripts/audit-home.mjs`.
   - Aucun lien mort `href="#"`.
2. **Zéro navigation par fragment dans les espaces et en-têtes** :
   - Les fichiers `ClientDashboard.tsx`, `WorkspaceShell.tsx`, `CommunicationPages.tsx`, `AccountControl.tsx`, `Navbar.tsx`, `PublicHeader.tsx` et `Footer.tsx` naviguent vers des routes dédiées (`/client/favoris`, `/client/visites`, `/notifications`, `/messages`, etc.), jamais par `#fragment` local.
3. **Destination après connexion adaptée au rôle** :
   - Utiliser `workspaceHref` / `workspaceLabel` selon les rôles détenus (`/admin`, `/proprietaire`, `/agent`, `/client`) et préserver les retours internes sûrs via `safeReturnTo()` (`lib/nav.ts`).
4. **Contrat de la carte de bien (`PropertyCard.tsx`)** :
   - Un seul arrêt de tabulation (`Tab`) vers la fiche du bien par carte (`data-card`).
   - Clic sur toute la surface + activation au clavier (`Entrée` et `Espace`).
   - Bouton favori (`FavoriteButton`) indépendant avec `aria-pressed`, placé hors du lien principal.

---

## 4. Accessibilité (WCAG AA) & Sémantique HTML

1. **Structure documentaire** :
   - Exactement **un seul `<h1>` par page rendue**.
   - Lien d'évitement « Aller au contenu » en premier élément focusable pointant vers `#contenu`.
   - Langue du document `lang="fr"`, `<title>` explicite et `<meta name="description">` de 20 caractères minimum sur toutes les pages publiques.
2. **Interdiction des éléments interactifs ou labels imbriqués** :
   - Jamais de `<button>` ou `<input>` dans un `<a>`, jamais de `<a>` dans un `<button>`, jamais de `<label>` dans un `<label>`.
3. **Références ARIA résolues** :
   - Tout attribut `aria-controls`, `aria-labelledby`, `aria-describedby` ou `aria-owns` doit pointer vers un `id` réellement présent et unique dans le DOM rendu au même instant (si un panneau est conditionnel, `aria-controls` ne doit être posé que lorsque le panneau est monté, ou le panneau doit rester monté avec `hidden`/`inert`).
4. **Navigation clavier et gestion du focus** :
   - Focus visible partout : anneau terracotta (`focus-visible:ring-ring`) sur fond clair, anneau ambre (`focus-visible:ring-homera-amber`) sur fond nocturne (`--homera-night`).
   - Tout menu déroulant, tiroir mobile ou boîte de dialogue se ferme avec `Escape` et restitue le focus au bouton déclencheur.
5. **Formulaires accessibles** :
   - Chaque champ possède un `<label htmlFor="...">` explicite.
   - Les messages d'erreur utilisent `role="alert"` ou `aria-live="polite"` et sont reliés au champ sans polluer la lecture vocale par des identifiants techniques bruts.

---

## 5. États d'interface & Responsive Design

1. **Couverture complète des états** :
   - Chaque vue ou composant de données prévoit : **Loading state** (`.homera-skeleton` + `aria-busy="true"`), **Empty state** (`EmptyPanel` / `EmptyState` avec explication et CTA pertinent), **Error state** (message clair + action de reprise), **Success state** (`role="status"`).
2. **Responsive de 320 px à 1 920 px** :
   - Cibles tactiles d'au moins `40×40 px` (`min-h-10` / `min-h-11` sur tous les boutons et liens d'action).
   - Tableaux larges encapsulés dans `overflow-x-auto` ou remplacés par des cartes sur mobile (`sm:hidden` / `hidden sm:block`).
   - Alignement des pieds de page et contenus principaux avec les barres latérales fixes (`lg:pl-[268px]` / `lg:pl-[264px]`) pour éviter tout recouvrement sur grand écran.

---

## 6. Vitesse, Fluidité & Performance Technique (`GLOBAL SPEED & FLUIDITY DIRECTIVE`)

1. **Priorité absolue du contenu critique (`Critical content first`)** :
   - Le titre principal et les outils de recherche critiques au-dessus de la ligne de flottaison doivent être visibles dès le premier rendu HTML SSR (ne jamais les masquer derrière un état JS `opacity: 0` en attente d'hydratation).
   - Les premières images visibles (`index < 3` dans les grilles du catalogue, image principale d'une fiche de bien) reçoivent `priority={true}` ; les images sous la ligne de flottaison restent en `loading="lazy"` avec `placeholder="blur"`.
   - Les vidéos d'arrière-plan utilisent `preload="metadata"` et un attribut `poster` léger afin de préserver la bande passante mobile et d'éviter tout écran noir au chargement.
2. **Réactivité immédiate des interactions (`réponse immédiate > transition courte > animation décorative`)** :
   - Toute saisie de recherche ou action de filtrage en mémoire met à jour les résultats immédiatement via `useTransition`, avec possibilité d'effacement instantané.
   - Chaque groupe de routes dynamiques (`(site)`, `(client)`, `(workspace)`) fournit un fichier `loading.tsx` stable (`.homera-skeleton`) pour garantir un retour visuel instantané lors de la navigation sans saut de mise en page (`CLS = 0`).
3. **Isolation des re-renders et du stockage local** :
   - Les fournisseurs de contexte (`AuthProvider`, `VisitorProvider`, `WorkflowProvider`) filtrent strictement les événements `storage` sur leurs clés respectives afin qu'une action locale (ex. clic sur un favori) ne déclenche jamais de re-render global inutile.

---

## 7. Système de navigation unifié des espaces & Switch d'espace par permissions

1. **Un seul système de navigation commun (`WorkspaceShell`)** :
   - Tous les espaces HOMERA (`Client` sur `/client` et `/client/*`, `Propriétaire` sur `/proprietaire/*`, `Agent` sur `/agent/*`, `Admin` sur `/admin/*`, ainsi que `/notifications` et `/messages`) partagent le **même composant de navigation (`WorkspaceShell.tsx`)**.
   - Toute évolution de navigation s'applique automatiquement à tous les espaces, seuls les éléments visibles, permissions et destinations variant selon le rôle.
2. **Zone unique entièrement défilante (`.homera-nav-scroll`)** :
   - Le panneau latéral (`<aside>`) et le tiroir mobile (`#workspace-mobile-nav`) fonctionnent comme **une seule zone continue et entièrement défilante** (`overflow-y: auto; overscroll-behavior: contain; scrollbar-width: none;`), sans pied de page fixe (`mt-auto border-t`), sans double barre de défilement et sans barre de défilement visible inutile.
3. **Architecture UX en 3 niveaux** :
   - **Switch d'espace** : affiché uniquement lorsque les permissions réelles du compte (`accessibleWorkspaces(roles, profile)`) donnent accès à plusieurs espaces (`Client` simple → uniquement `Espace client` ; `Propriétaire`, `Agent` et `Admin` → bascule immédiate en 1 clic sans retour à l'accueil ni passage par le profil, aussi bien depuis le panneau latéral que depuis l'en-tête supérieur).
   - **Navigation principale** : pages métier principales de l'espace actif et échanges (`Notifications`, `Messages`), sans duplication des liens de compte.
   - **Actions secondaires** : fiche compacte du compte connecté, `Profil`, `Paramètres`, `Aide & assistance`, `Retour au site` et `Se déconnecter`, intégrés dans le même flux défilant.

---

## 8. Modèles d'Interfaces Produit (`UI PATTERNS & PRODUCT INTERFACE MODELS`)

1. **Choix du modèle selon le rôle, la fréquence et l'action (`Le modèle sert l'expérience`)** :
   - **Dashboard overview** (`/client`) : vue synthétique centrée sur l'état du projet, les échéances à payer autorisées par le workflow, les prochaines visites et les favoris.
   - **Dashboard opérationnel** (`/proprietaire`, `/agent`) : priorité aux dossiers à traiter, créneaux à confirmer, mandats actifs et opérations financières.
   - **Dashboard hybride & Command center** (`/admin`, `/admin/[section]`) : indicateurs de supervision, file de contrôle documentaire et registres filtrables avec bascule responsive `Table` (desktop) $\leftrightarrow$ `Cartes` (mobile).
2. **Modèles de listes et de fiches** :
   - **Grid** réservée aux biens immobiliers visuels (`/explorer`, `/acheter`, `/louer`, `/sejour`).
   - **Liste / Liste compacte** pour l'historique, les visites, les notifications et l'activité récente.
   - **Table responsive** pour l'administration, la traçabilité financière et la comparaison structurée.
   - **Fiche de bien (`/biens/[id]`)** structurée selon le parcours `découvrir → comprendre → vérifier → comparer → agir` avec panneau latéral sticky desktop et barre d'action sticky mobile (`lg:hidden`).

---

## 9. Modèle Économique, Paiements & Flux Financiers (`MODÈLE ÉCONOMIQUE, PAIEMENTS ET FLUX FINANCIERS`)

1. **Règle fondamentale (`Zéro bouton financier hors workflow`)** :
   - Ne jamais ajouter un bouton `Payer`, un bouton `Retirer` ou un simulateur libre sans opération économique réelle définie dans le workflow (`Qui paie ? Qui reçoit ? Pourquoi ? Combien ? À quel moment ? Selon quelle règle économique ? Disponible ou en attente ? Qui peut retirer ?`).
   - Le bouton `Payer` doit toujours être contextualisé (`Payer la location · X FCFA`, `Payer le dépôt de garantie · X FCFA`, `Payer les frais de visite · 5 000 FCFA`, `Payer la réservation · X FCFA`) et conditionné par `canClientPayContract` (contrat `signe`) ou `canClientPayVisit` (visite `confirmee`).
2. **Flux financier réel & séparation des canaux** :
   - Toute transaction suit le flux **`CLIENT → HOMERA → Attribution (Commission HOMERA / Part Agent éventuelle / Net Propriétaire) → Disponibilité → Retrait`** (`computeFinancialBreakdown`).
   - Séparation stricte entre `CLIENT_PAYMENT_PROVIDERS` (5 canaux client) et `PAYOUT_RECEPTION_PROVIDERS` (4 canaux de réception excluant la carte bancaire).
3. **Confidentialité financière & Règle Agent (`computeActorBalances`)** :
   - **Client** : voit uniquement ce qu'il doit payer et ses reçus.
   - **Propriétaire** : voit ses revenus bruts, la commission HOMERA, ses montants en attente (jamais confondus avec du disponible) et son solde disponible au retrait.
   - **Agent** : applique la règle **`autorisation sur un bien ≠ droit automatique à recevoir de l'argent`** ; ne voit et ne peut retirer que les rémunérations explicitement rattachées à son matricule et à une opération confirmée.
   - **Admin / HOMERA** : supervise l'intégralité du flux financier et de la traçabilité anti-contournement.



