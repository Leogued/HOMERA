# PROJECT — Architecture & Cartographie de HOMERA

## 1. Vue d'ensemble technique

| Dimension | Choix technique | Détails |
| --- | --- | --- |
| **Framework** | Next.js 16.3.5 (App Router, Turbopack) | Rendu statique & hybride (Server + Client Components) |
| **UI Library** | React 19.2.8 | Hooks modernes (`useSyncExternalStore`, `useMemo`, `useId`) |
| **Langage** | TypeScript 5 (mode `strict`) | `npx tsc --noEmit` obligatoire avant toute validation |
| **Styling** | Tailwind CSS v4 (`@tailwindcss/postcss`) | Tokens CSS centralisés dans `app/globals.css` (`:root`, `.dark`, `@theme inline`) |
| **Thèmes** | `next-themes` (`class` strategy) | Clair (`#faf6ef`) et Sombre (`#1e120c`) + surfaces fixes (`--homera-night`, `--homera-paper`) |
| **Icônes** | `lucide-react` | Icônes systématiquement décorées de `aria-hidden="true"` |
| **Polices** | `next/font/local` (auto-hébergées) | *Manrope*, *DM Serif Display*, *Cormorant Garamond Italic*, *Cakecafe* (`public/fonts/`) |
| **Animations** | Moteur natif `lib/motion.ts` + `lib/motion-frame.ts` | Zéro dépendance externe d'animation ; `requestAnimationFrame` à la demande |
| **QR Code** | Encodeur interne `lib/qr.ts` + `components/ui/QrCode.tsx` | ISO/IEC 18004 niveau M, SVG pur sans état, zéro dépendance externe |
| **Tests** | Node.js Test Runner (`scripts/test-motion.mjs`) | Tests unitaires, géométriques, contrastes AA, design system, auth, workflows, hydratation, QR |
| **Audit HTTP/DOM** | `scripts/audit-home.mjs` + `scripts/quality-gate.mjs` | Crawl complet des routes publiques, validation HTML/ARIA/h1/liens/ancres/CSS/images |

---

## 2. Structure du dépôt

```text
HOMERA/
├── AGENTS.md                  # Cerveau opérationnel de l'agent frontend autonome
├── PROJECT.md                 # Architecture, cartographie et sources de vérité
├── VISION.md                  # Vision produit, positionnement et piliers HOMERA
├── DESIGN_SYSTEM.md           # Tokens, typographie, couleurs, espacements, rayons, motion
├── FRONTEND_RULES.md          # Règles d'ingénierie React/Next.js, accessibilité et UX
├── QUALITY_GATE.md            # Checklist objective et bloquante avant toute validation
├── ROADMAP.md                 # Plan d'évolution frontend et produit par jalons
├── CURRENT_STATE.md           # État vérifié actuel, métriques et couverture de tests
│
├── docs/
│   ├── AUTH-HOMERA.md         # Spécification détaillée des comptes et rôles cumulables
│   ├── DESIGN-SYSTEM-AUDIT.md # Historique de l'audit des 5 étapes du design system
│   ├── MOTION-HOMERA.md       # Grammaire du mouvement et décisions d'animation
│   ├── NAVIGATION-HOMERA.md   # Règles de routage et interdiction des fragments d'espaces
│   ├── PROCHAINES-ETAPES.md   # Feuille de route vers le socle serveur (API/DB)
│   ├── QA-MOTION.md           # Checklist QA automatisée et manuelle
│   ├── pages/                 # Documentation détaillée par famille de pages
│   ├── components/            # Documentation détaillée des composants et contrats UI
│   └── interactions/          # Documentation détaillée des flux, états et micro-interactions
│
├── app/
│   ├── globals.css            # Source unique des tokens CSS, thèmes et classes d'animation
│   ├── layout.tsx             # Layout racine (polices, Theme/Auth/Visitor/Workflow/Search providers)
│   ├── page.tsx               # Page d'accueil en 9 scènes cinématiques
│   ├── error.tsx              # Boundary d'erreur globale éditoriale
│   ├── not-found.tsx          # Page 404 éditoriale
│   ├── (site)/                # Pages publiques (catalogue, fiches, projets, services, auth, légal)
│   ├── (client)/              # Espace client (/client, /client/visites, /client/demandes, /client/contrats…)
│   └── (workspace)/           # Espaces propriétaire (/proprietaire/*), agent (/agent/*), admin (/admin/*), /messages, /notifications
│
├── components/
│   ├── home/                  # Les 9 scènes de la page d'accueil + SearchModule + PropertyPreview
│   ├── layout/                # Navbar, PublicHeader, Footer, NotFoundView
│   ├── catalog/               # CatalogExplorer, CatalogFilters, PropertyCard, PropertyDetail, FavoritesView…
│   ├── auth/                  # SignInForm, SignUpForm, RoleChoice, RoleUpgrade, AccountControl, CodeField…
│   ├── client/                # ClientDashboard (vue d'ensemble de l'espace client)
│   ├── workspace/             # WorkspaceShell, Primitives, PaymentMethodsPanel, ClientJourneys, OwnerWorkspace, AgentWorkspace, AdminWorkspace, PropertyWizard…
│   ├── site/                  # ServiceDetail, LegalDocument, LegalAlias
│   ├── providers/             # ThemeProvider, AuthProvider, VisitorProvider, WorkflowProvider, SearchProvider
│   └── ui/                    # Button, Visual, Reveal, Scene, ChapterRail, CustomCursor, TextRoll, CopyReference, QrCode
│
├── lib/
│   ├── content.ts             # Catalogue de biens (36 biens), statistiques, services, éditorial
│   ├── media.generated.ts     # Manifeste des images optimisées et blurDataURL (GÉNÉRÉ — ne pas éditer)
│   ├── properties.ts          # Moteur de recherche, filtres, facettes, tri, pagination, URL
│   ├── nav.ts                 # Déclaration unique de la navigation publique et des routes
│   ├── pages.ts               # Contenus éditoriaux des pages institutionnelles, légales et auth
│   ├── auth.ts                # Règles pures d'authentification, rôles cumulables, permissions d'espaces, codes
│   ├── accounts.ts            # Stockage local des comptes, hachage PBKDF2-SHA-256, sessions
│   ├── demo-accounts.ts       # Comptes de démonstration pré-configurés (admin, user, agent, prop)
│   ├── persistence.ts         # Favoris et recherches sauvegardées sans compte (homera.visiteur.v1)
│   ├── workflow.ts            # État métier local, modèle économique (computeFinancialBreakdown, canClientPayContract, canClientPayVisit, computeActorBalances), moyens de paiement/retrait
│   ├── portal-data.ts         # Données de démonstration des espaces (mandats agents, dossiers admin, biens propriétaire, transactions financières de référence)
│   ├── qr.ts                  # Encodeur et décodeur QR ISO/IEC 18004 sans dépendance
│   ├── motion.ts              # Hooks de mouvement, observers, sticky timelines, préférences
│   ├── motion-frame.ts        # Ordonnanceur requestAnimationFrame mutualisé à la demande
│   ├── motion-math.ts         # Fonctions mathématiques pures de mouvement et d'inertie
│   ├── floating.ts            # Positionnement géométrique des dropdowns dans le viewport
│   ├── format.ts              # Formatage des prix FCFA, surfaces, dates et compteurs
│   └── search-params.ts       # Utilitaires de lecture des searchParams Next.js 16
│
├── public/
│   ├── fonts/                 # Polices WOFF2/TTF auto-hébergées + licences
│   ├── images/                # 23 visuels JPEG optimisés + dérivés AVIF/WebP via next/image
│   └── video/                 # Vidéo d'ouverture du Hero (background_video.mp4)
│
└── scripts/
    ├── test-motion.mjs        # Suite complète de tests automatisés (TAP)
    ├── audit-home.mjs         # Crawler et auditeur HTML/ARIA/CSS/Images du site
    ├── quality-gate.mjs       # Vérificateur automatisé des critères de QUALITY_GATE.md
    └── build-images.mjs       # Pipeline de génération des visuels et LQIP
```

---

## 3. Sources de vérité par domaine

| Domaine | Fichier source unique | Règle d'or |
| --- | --- | --- |
| **Tokens visuels & Thèmes** | `app/globals.css` | Ne jamais coder de couleur hex (`#...`), de `stone-*`, ni de courbe `cubic-bezier` en dur dans un `.tsx`. |
| **Navigation & URLs** | `lib/nav.ts` | Toute nouvelle route ou entrée de menu s'enregistre ici et doit correspondre à un `page.tsx` réel. |
| **Catalogue & Filtres** | `lib/properties.ts` + `lib/content.ts` | Serveur et client utilisent exactement les mêmes fonctions de filtrage et de sérialisation d'URL. |
| **Rôles & Authentification** | `lib/auth.ts` + `lib/accounts.ts` | Les rôles (`client`, `proprietaire`, `agent`) sont cumulatifs ; le socle client est partagé par tous. |
| **Parcours métiers (Espaces)** | `lib/workflow.ts` + `lib/portal-data.ts` | Transitions d'états validées par des fonctions pures (visite terminée requise avant candidature, mandat actif requis pour l'agent). |

---

## 4. Commandes de référence

Toutes les commandes s'exécutent depuis le répertoire de l'application Next.js (`homera/`) :

```bash
npm test                  # Suite de tests unitaires, design system, auth, workflows, QR, hydratation
npm run lint              # ESLint 9 (config Next.js + TypeScript) — 0 erreur, 0 warning toléré
npx tsc --noEmit          # Vérification stricte des types TypeScript
npm run quality:gate      # Audit statique complet des règles du QUALITY_GATE.md
npm run build             # Build de production Next.js (génération des routes statiques et dynamiques)
npm run audit:home        # Crawl HTTP complet (avec serveur démarré) ou --file sur le HTML de build
```
