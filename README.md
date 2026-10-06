# HOMERA — Plateforme Immobilière de Confiance au Bénin

> **Vérifier avant de s’engager.**
> Plateforme immobilière éditoriale et transactionnelle (location, achat, séjour courte durée) pensée pour le marché béninois (Cotonou, Abomey-Calavi, Porto-Novo, Ouidah).

---

## 1. Cadre de Gouvernance & Agent Frontend Autonome

Ce dépôt intègre un système de travail permanent en markdown pour piloter le développement, le design et l'assurance qualité du frontend sans dépendre de prompts ponctuels :

| Fichier | Rôle |
|---|---|
| [`AGENTS.md`](./AGENTS.md) | **Cerveau opérationnel permanent** : rôle (Senior Frontend Engineer + Product Designer + UX Engineer + Directeur Artistique), boucle en 7 phases, direction créative en 17 points, garde-fous Next.js 16 |
| [`VISION.md`](./VISION.md) | Positionnement éditorial, piliers de confiance immobilière, principe *Content Before Layout* et direction esthétique sur mesure |
| [`PROJECT.md`](./PROJECT.md) | Architecture technique, cartographie des routes et flux de données |
| [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) | Palette de couleurs, typographie à 4 familles, échelle stricte `--text-*`, rayons `--radius-*`, ombres et mouvement |
| [`FRONTEND_RULES.md`](./FRONTEND_RULES.md) | Standards de code React 19 / Next.js 16 / Tailwind v4, hydratation déterministe, accessibilité WCAG AA |
| [`QUALITY_GATE.md`](./QUALITY_GATE.md) | **Checklist objective de validation en 5 catégories** (Fonctionnel, Design System, UX, Accessibilité/Technique, Custom Design & Creative Quality) |
| [`ROADMAP.md`](./ROADMAP.md) | Feuille de route incrémentale par paliers |
| [`CURRENT_STATE.md`](./CURRENT_STATE.md) | État actuel de l'application, journal d'audit et statut des vérifications |
| [`docs/pages/`](./docs/pages/README.md) | Spécifications détaillées des pages publiques, parcours d'authentification et espaces métiers |
| [`docs/components/`](./docs/components/README.md) | Contrats des primitives UI, composants du catalogue/accueil et briques d'espace |
| [`docs/interactions/`](./docs/interactions/README.md) | Moteur de mouvement, machines à états (`lib/workflow.ts`), accessibilité et responsive |

> Les mêmes fichiers de gouvernance sont également présents dans [`homera/`](./homera/) (racine de l'application Next.js).

---

## 2. Démarrage rapide & Commandes de vérification

Toutes les commandes s'exécutent depuis le dossier [`homera/`](./homera/) :

```bash
cd homera
npm ci

# Serveur de développement
npm run dev

# Suite de tests unitaires & d'intégration (mouvement, catalogue, contrastes AA, tokens, auth, workflows, QR ISO 18004)
npm test

# Contrôle automatisé du QUALITY_GATE.md
npm run quality:gate

# Linter ESLint 9 & Typage strict TypeScript 5
npm run lint
npx tsc --noEmit

# Build de production Next.js 16
npm run build

# Audit DOM & crawl de toutes les pages publiques
npm run audit:home
```
