# DESIGN SYSTEM — HOMERA

> **Principe directeur** : *« Toutes les pages doivent donner l'impression d'appartenir au même produit. »*
> Toute décision visuelle passe par les tokens déclarés dans `app/globals.css` (`:root`, `.dark` et `@theme inline`). Aucune valeur arbitraire hors échelle n'est tolérée dans les composants.

---

## 1. Typographie

Quatre polices auto-hébergées (`public/fonts/`), quatre rôles strictement séparés :

| Rôle | Police | Poids | Classe / Token | Usage exclusif |
| --- | --- | --- | --- | --- |
| **Mot-symbole** | `Brush Script MT` / `Cakecafe` | 400 | `.homera-brand` + `text-brand*` | Le mot « HOMERA » / « Homera » **uniquement**. Jamais sur un autre texte. |
| **Grands titres & Chiffres** | `DM Serif Display` | 400 | `font-serif` + `text-display-*` / `text-figure*` | `h1`, `h2` de section, chiffres clés. **Interdiction absolue de `font-bold` / `font-semibold` sur `font-serif`** (faux gras synthétique). |
| **Interface & Corps** | `Manrope` | 400 · 500 · 600 | `font-sans` (par défaut) | Texte courant (400), navigation & boutons (500), intitulés & données clés (600). |
| **Accents éditoriaux** | `Cormorant Garamond Italic` | 400 | `.homera-accent` + `text-accent*` | Ponctuel, pour souligner un mot ou une respiration éditoriale. |

### Échelle typographique obligatoire (`@theme inline`)

Aucune classe `text-[...]` arbitraire ni classe Tailwind par défaut (`text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`) ne doit contourner cette échelle (seule exception autorisée : `text-[1.06em]` sur l'accent relatif du `h1` dans `components/home/Hero.tsx`).

| Catégorie | Classe Tailwind | Taille / Valeur | Line-height / Détails | Usage type |
| --- | --- | --- | --- | --- |
| **Display** | `text-display-2xl` | `clamp(2rem, 4.5vw, 4.2rem)` | `1.16` · `-0.015em` | Titre manifeste, scènes monumentales |
| **Display** | `text-display-xl` | `3.1rem` (~50 px) | `1.08` · `0.01em` | `h1` Hero d'ouverture |
| **Display** | `text-display-lg` | `2.5rem` (40 px) | `1.12` · `0.008em` | Grands `h1` de pages intérieures / dashboards |
| **Display** | `text-display-fluid` | `clamp(1.5rem, 2.6vw, 2.6rem)` | `1.15` · `0.006em` | Titres de récits sticky (Protocole, Dossier) |
| **Display** | `text-display-md` | `2rem` (32 px) | `1.16` · `0.006em` | `h1`/`h2` de section (desktop) |
| **Display** | `text-display-sm` | `1.75rem` (28 px) | `1.22` · `0.005em` | `h2` de section (mobile), cartes majeures |
| **Display** | `text-display-xs` | `1.375rem` (22 px) | `1.35` · `0.005em` | Sous-titres éditoriaux, modales, métriques |
| **Chiffres** | `text-figure-lg` | `3.5rem` (56 px) | `0.95` + `.homera-num` | Grands compteurs desktop |
| **Chiffres** | `text-figure` | `3rem` (48 px) | `0.95` + `.homera-num` | Compteurs mobile |
| **Chiffres** | `text-figure-fluid` | `clamp(1.1rem, 2.35vw, 2.1rem)` | `.homera-num` | Identifiant de dossier (`HOM-CTN-000421`) |
| **Corps & UI** | `text-body` | `0.9375rem` (15 px) | `1.65` | Texte courant principal |
| **Corps & UI** | `text-body-sm` | `0.84375rem` (13,5 px) | `1.7` | Textes denses, champs, introductions secondaires |
| **Corps & UI** | `text-note` | `0.78125rem` (12,5 px) | `1.7` |Boutons, liens de navigation, intitulés de cartes |
| **Corps & UI** | `text-caption` | `0.6875rem` (11 px) | `1.6` · `0.01em` | Légendes, métadonnées secondaires, dates |
| **Corps & UI** | `text-micro` | `0.625rem` (10 px) | `1.5` · `0.02em` | Badges compacts, compteurs de pastille (minimum absolu) |
| **Étiquette** | `text-label` | `0.6875rem` (11 px) | `1.4` · `600` · `0.16em` | Surtitres de section et en-têtes de colonnes |
| **Accents** | `text-accent` / `text-accent-lg` | `1.25rem` / `1.5rem` | `1.5` | Mots en *Cormorant Garamond Italic* |
| **Marque** | `text-brand` / `-compact` / `-sm` | `50px` / `40px` / `21px` | `.homera-brand` | Mot-symbole « Homera » selon l'espace |

---

## 2. Couleurs & Thèmes (Contraste AA garanti)

Tous les couples texte/fond sont vérifiés automatiquement par `scripts/test-motion.mjs` au seuil **WCAG AA (≥ 4,5:1)** dans les deux thèmes.

### 2.1 Surfaces et encres adaptatives (suivent `.dark`)

| Token CSS | Classe Tailwind | Mode Clair | Mode Sombre (`.dark`) | Rôle |
| --- | --- | --- | --- | --- |
| `--background` | `bg-background` | `#faf6ef` (crème clair) | `#1e120c` (brun nuit) | Fond de page principal |
| `--card` | `bg-card` | `#fffdf9` (ivoire chaud) | `#2b1a12` (brun carte) | Cartes, panneaux, modales |
| `--surface-hover` | `bg-surface-hover` | `#f2e9dc` | `rgba(245, 237, 224, 0.08)` | Survol de ligne, de bouton secondaire ou d'onglet |
| `--foreground` | `text-foreground` | `#3e2418` (brun profond) | `#f5ede0` (crème) | Encre principale |
| `--muted` | `text-muted` | `#6b5545` (6,5:1) | `#c3b09e` | Texte secondaire |
| `--muted-light` | `text-muted-light` | `#7f6a58` (4,6:1) | `#a8927f` | Mentions tertiaires, placeholders |
| `--border` | `border-border` | `#e8dccb` | `#4a2f22` | Filets et bordures de carte |
| `--ring` | `ring-ring` | `#c65d3b` | `#d9734e` | Anneau de focus clavier |
| `--overlay` | `bg-overlay` | `rgba(28, 17, 11, 0.74)` | `rgba(12, 7, 4, 0.8)` | Voile d'arrière-plan des modales |

### 2.2 Pigments de marque et surfaces invariantes

| Token CSS | Classe Tailwind | Valeur | Comportement au changement de thème |
| --- | --- | --- | --- |
| `--homera-terracotta` | `text-homera-terracotta` / `bg-homera-terracotta` | `#b3502c` (clair) / `#d9734e` (sombre) | Suit le thème pour maintenir ≥ 4,75:1 de contraste |
| `--homera-brown` | `bg-homera-brown` / `text-homera-brown` | `#3e2418` | Brun identitaire |
| `--homera-night` | `bg-homera-night` | `#1c110b` | **Fixe (toujours sombre)** : barres latérales d'espaces, scènes nocturnes |
| `--homera-night-soft` | `bg-homera-night-soft` | `#2a1a12` | **Fixe (toujours sombre)** : nuances des scènes nocturnes |
| `--homera-amber` | `text-homera-amber` / `bg-homera-amber` | `#e0a45e` | **Fixe** : accent lumineux et anneau de focus sur fond nocturne |
| `--homera-paper` | `bg-homera-paper` / `text-homera-paper` | `#faf6ef` | **Fixe (toujours clair)** : papier du dossier dans le protocole |

### 2.3 États sémantiques (assertés AA en clair et sombre)

| État | Token | Mode Clair | Mode Sombre | Usage |
| --- | --- | --- | --- | --- |
| **Succès** | `--success` (`text-success`, `bg-success`) | `#4d7c3a` | `#8fbf6f` | Bien vérifié, visite confirmée, contrat signé |
| **Avertissement** | `--warning` (`text-warning`, `bg-warning`) | `#96621a` | `#e0b050` | En attente de contrôle, code à confirmer, mode pilote |
| **Erreur** | `--error` (`text-error`, `bg-error`) | `#b3261e` | `#ef7a6e` | Champ invalide, refus, suspension |
| **Information** | `--info` (`text-info`, `bg-info`) | `#3c6478` | `#86b6cd` | Note de transparence pilote (`DemoNotice`), aide contextuelle |

### 2.4 Couples de boutons pleins (CTA)

- `.homera-cta` : bouton plein sur une surface de page adaptative (`--action-bg` → brun `#3e2418` en clair, terracotta `#b85a37` en sombre, texte blanc).
- `.homera-cta-night` : bouton plein posé sur une surface **toujours sombre** (hero vidéo, scène finale, menu mobile nocturne).

---

## 3. Espacements & Conteneurs

| Token | Valeur | Rôle |
| --- | --- | --- |
| `--space-block` | `2rem` (32 px) | Respiration verticale entre deux sous-blocs |
| `--space-section` | `5rem` (80 px) | Padding vertical d'une scène standard sur mobile |
| `--space-section-lg` | `6rem` (96 px) | Padding vertical d'une scène standard sur desktop |
| `--space-section-scene` | `10rem` (160 px) | Scènes narratives monumentales (Protocole, Manifeste) |
| `--space-inline` | `clamp(1rem, 4vw, 3rem)` | Gouttière latérale fluide |
| `--container-max` | `80rem` (1 280 px) | Conteneur standard |
| `--container-wide` | `86rem` (1 376 px) | Conteneur large (header, catalogue) |
| `--container-ultra` | `92rem` (1 472 px) | Conteneur très large |

---

## 4. Rayons de bordure & Ombres

Chaque composant utilise le **token de rôle** correspondant (qui pointe vers l'échelle `--radius-sm` à `--radius-4xl`, jamais vers lui-même) :

| Rôle | Token CSS | Classe utilitaire | Valeur résolue |
| --- | --- | --- | --- |
| **Boutons** | `--radius-btn` | `rounded-btn` | `var(--radius-lg)` (`0.75rem` / 12 px) |
| **Champs de saisie** | `--radius-input` | `rounded-input` | `var(--radius-2xl)` (`1.5rem` / 24 px) |
| **Cartes & Panneaux** | `--radius-card` | `rounded-card` | `var(--radius-2xl)` (`1.5rem` / 24 px) |
| **Menus déroulants** | `--radius-menu` | `rounded-menu` | `var(--radius-2xl)` (`1.5rem` / 24 px) |
| **Photographies & Médias** | `--radius-media` | `rounded-media` | `var(--radius-2xl)` (`1.5rem` / 24 px) |
| **Modales & Dialogues** | `--radius-modal` | `rounded-modal` | `var(--radius-3xl)` (`1.75rem` / 28 px) |
| **Pastilles & Badges** | — | `rounded-full` | `9999px` |

**Ombres** :
- `--shadow-card` : `0 4px 20px rgba(62, 36, 24, 0.08)` (`shadow-card` ou `shadow-[var(--shadow-card)]`)
- `--shadow-card-hover` : `0 12px 35px rgba(62, 36, 24, 0.16)` (`shadow-card-hover` ou `shadow-[var(--shadow-card-hover)]`)

---

## 5. Système de mouvement (Motion)

**Intention** : *Ouvrir → Révéler → Relier → Transmettre.*

### Courbes d'accélération
- `--ease-standard` (`var(--homera-ease)`) : `cubic-bezier(0.22, 0.61, 0.28, 1)` — courbe principale (`ease-standard`).
- `--ease-soft` (`var(--homera-ease-out-soft)`) : `cubic-bezier(0.16, 1, 0.3, 1)` — révélations douces (`ease-soft`).
- `--ease-in-out` (`var(--homera-ease-in-out)`) : `cubic-bezier(0.65, 0, 0.35, 1)` — transitions symétriques (`ease-in-out`).

### Échelle de durées
- `--duration-instant` : `140ms` (dropdowns, micro-états)
- `--duration-quick` : `200ms` (boutons, survols)
- `--duration-base` : `380ms` (panneaux, cartes)
- `--homera-duration` : `520ms` (compositions)
- `--duration-scene` : `820ms` (scènes)
- `--duration-slow` / `--homera-duration-slow` : `1050ms` (rideaux photographiques)

### Règles d'or du mouvement
1. **Zéro boucle `requestAnimationFrame` au repos** : tout passe par `lib/motion-frame.ts`.
2. **Respect absolu de `prefers-reduced-motion: reduce`** : désactivation immédiate des parallax, compteurs animés, text-rolls, curseur personnalisé et fixations sticky longues.
3. **Lisibilité sacrée** : les prix, références et boutons d'action ne subissent jamais de flou (`blur`) ni d'inclinaison 3D.
4. **Gardes d'écran pour les séquences sticky** : réservées aux viewports `≥ 1024px` de large et `≥ 700px` de haut. En dessous, le récit se déplie naturellement.
