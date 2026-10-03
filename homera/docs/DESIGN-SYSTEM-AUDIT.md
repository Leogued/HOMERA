# Design system HOMERA — audit des 5 étapes et correctifs appliqués

Vérification demandée : couleurs, typographie, espacements, rayons, motion.
Objectif : « toutes les pages doivent donner l'impression d'appartenir au même produit ».

Base auditée : commit `88ae01b`. Les correctifs décrits en partie 2 sont appliqués sur la
branche `arena/01a1028f-homera`. Chaque chiffre est un comptage `grep`/`node` sur le code
réel, pas une estimation.

---

## 1. Constat initial

| Étape | État au départ | Ce qui manquait |
| --- | --- | --- |
| 1. Couleurs | ⚠️ | `--info` absent · `success`/`warning`/`error` définis mais 0 usage · pas de tokens d'état · 45 classes `stone-*` · 67 hex codés en dur |
| 2. Typographie | ⚠️ | `display` OK · `caption`/`labels` sans token · H2/H3 hors échelle · 186 classes `text-[…]` arbitraires |
| 3. Espacements | ❌ | aucun token d'espacement, aucun rythme de section documenté |
| 4. Rayons | ⚠️ | tokens OK mais aucun rôle fixé · 13 usages hors échelle · modale en dur |
| 5. Motion | ⚠️ | easing/reveal/hover/modal/dropdown OK · 30 durées codées en dur · `loading` absent · transition de page inexistante |

Deux défauts cachés trouvés au passage, invisibles à l'œil mais réels :

- **17 usages de `homera-amber` ne produisaient aucun CSS.** `--color-homera-amber` n'était
  pas exposé dans `@theme inline` : `text-homera-amber`, `bg-homera-amber`,
  `ring-homera-amber`, `to-homera-amber` (7 fichiers : icône de service actif, mentions
  « Vérifié », anneaux de focus du header, point pulsé de la recherche, dégradé du rail)
  n'étaient tout simplement pas stylés. Vérifié sur le CSS compilé d'origine : 0 règle.
- **La règle `prefers-reduced-motion` du dropdown ciblait `.homera-dropdown-menu`**, qui ne
  porte aucune animation (`globals.css:18-30` à l'époque) : règle morte, rattrapée de
  justesse par le garde global.

---

## 2. Correctifs appliqués

### 2.1 Couleurs

| Ajout | Valeur | Contrôle |
| --- | --- | --- |
| `--info` | `#3c6478` (clair) / `#86b6cd` (sombre) | 5,93:1 sur crème · 8,36:1 sur nuit — assertés AA dans `scripts/test-motion.mjs` |
| `--ring` | `#c65d3b` / `#d9734e` | remplace l'outline codé en dur (`globals.css:1033`) |
| `--surface-hover` | `#f2e9dc` / `rgba(245,237,224,.08)` | survol de surface, remplace `stone-100` |
| `--overlay` | `rgba(28,17,11,.74)` / `rgba(12,7,4,.8)` | voile de modale |
| `--homera-paper`, `--homera-paper-muted` | `#faf6ef`, `#6b5545` | pigments des surfaces toujours claires (dossier du protocole, étiquette du curseur) — non redéfinis par `.dark` |
| `--action-bg`, `--action-bg-hover` | `#3e2418`/`#5a3726` (clair) · `#b85a37`/`#a04d2e` (sombre) | couple fond/encre des boutons pleins : blanc dessus = 14,3:1 · 10,5:1 (clair), 4,6:1 · 5,8:1 (sombre) |
| `--action-night`, `--action-night-hover` | `#b85a37` / `#a04d2e` | bouton plein posé sur une surface TOUJOURS sombre (menus mobiles, scène finale) : blanc dessus = 4,6:1 · 5,8:1, identique dans les deux thèmes |

**Phase 2 — contraste.** Le terracotta clair passe de `#c65d3b` à **`#b3502c`** : la teinte
d'origine ne tenait que 3,9:1 sur le crème et 4,2:1 sur une carte, donc sous le seuil AA dès
qu'elle servait d'encre. La teinte de marque reste `--homera-terracotta-dark` pour les petits
textes et `--homera-terracotta` pour les aplats décoratifs (filets, halos, pastilles).
`--warning` passe de `#b7791f` à `#96621a` (3,4:1 → 4,8:1).

Les boutons pleins n'écrivent plus leur couleur en classes : ils consomment `.homera-cta`
(surface de page, suit le thème) ou `.homera-cta-night` (surface toujours sombre, fixe).
Une seule décision à changer, à un seul endroit, au lieu de 19 listes de classes.

Les pigments nocturnes (`--homera-night`, `--homera-night-soft`, `--homera-amber`,
`--homera-halo`) ont été remontés dans le bloc palette : un seul endroit où lire les
couleurs. Tous sont désormais exposés à Tailwind.

**Fuites supprimées :**

- `stone-*` : 45 → **0** (vérifié dans le HTML servi : 0 occurrence).
- Hex codés en dur dans les `.tsx` : 67 → **0**. Les cinq plus fréquents (`#3e2418`,
  `#e0a45e`, `#ebdcc6`, `#faf6ef`, `#c65d3b`) sont remplacés par leur token ; ils suivent
  maintenant le thème au lieu de le contourner.
- Dans `globals.css`, plus aucun hex hors des blocs de définition de la palette (les 4
  restants — fond du manifeste, ses deux dégradés de fondu, le filet du manifeste —
  pointent vers `var(--homera-brown)` / `var(--homera-amber)`).

Toujours vrai : `--success`, `--warning`, `--error`, `--info` sont complets et exposés, mais
**aucune interface ne les consomme encore**. Depuis la phase 2, leurs quatre valeurs sont
cependant assertées AA (≥ 4,5:1 sur le fond) : le jour où un formulaire ou un message d’état
les utilisera, la lisibilité sera déjà prouvée par les tests.

### 2.2 Typographie

Échelle complète, dans `@theme inline` :

| Rôle | Token | Corps |
| --- | --- | --- |
| Surtitres de scène | `--text-display-2xl` | `clamp(2rem, 4.5vw, 4.2rem)` |
| Titres de récit | `--text-display-fluid` | `clamp(1.5rem, 2.6vw, 2.6rem)` |
| Titres fixes | `--text-display-xs → xl` | 22 → 50 px (inchangés) |
| Chiffres clés | `--text-figure` / `-lg` / `-fluid` | 48 / 56 px / fluide |
| Accents Cormorant | `--text-accent` / `-lg` | 20 / 24 px |
| Corps | `--text-body` | 15 px |
| Textes denses | `--text-body-sm` | 13,5 px |
| Textes secondaires | `--text-note` | 12,5 px |
| Légendes | `--text-caption` | 11 px |
| Mentions minimales | `--text-micro` | 10 px |
| Étiquettes | `--text-label` | 11 px / 600 / .16em (graisse et interlettrage inclus) |
| Mot-symbole | `--text-brand` / `-compact` / `-sm` | 50 / 40 / 21 px |

- **186 classes `text-[…]` arbitraires → 1** : `text-[1.06em]` (`Hero.tsx:91`), conservé
  parce qu'il est volontairement relatif au corps du `h1`.
- H1 inchangé (unique, `Hero.tsx:89`). H2 du manifeste → `text-display-2xl`. H3 du
  protocole → `text-display-fluid`. Les 8 autres H3 sont ramenés sur `display-*`,
  `body-sm` ou `body` (écart maximal observé : 1,6 px).
- Les 3 `<h2>` de `Footer.tsx` gardent leur niveau sémantique (colonnes de navigation du
  pied de page) mais prennent `text-label` au lieu de `text-[11px] font-semibold
  tracking-[0.14em]` recomposé à la main.

### 2.3 Espacements

Échelle créée (elle n'existait pas) :

```
--space-block            32px   entre deux blocs
--space-section          80px   scène standard (mobile)
--space-section-lg       96px   scène standard (desktop)
--space-section-scene   160px   scène cinématique
--space-inline           clamp(1rem, 4vw, 3rem)
--container-max / -wide / -ultra   1280 / 1376 / 1472 px
```

Les cinq scènes standard (`ExplorerSection`, `FeaturedProperties`, `ServicesSection`,
`EditorialSection`, `PropertyDossier`) lisent `py-[var(--space-section)]
sm:py-[var(--space-section-lg)]` — mêmes valeurs qu'avant, mais une seule source. Le
protocole, le manifeste et leurs variantes mobiles sont exprimés depuis
`--space-section-scene`. Les trois largeurs de conteneur du header sont tokenisées.

### 2.4 Rayons

Échelle complétée (`--radius-3xl: 1.75rem`, `--radius-4xl: 2rem`) et six rôles créés,
chacun pointant vers l'échelle :

| Rôle | Token | Utilitaires |
| --- | --- | --- |
| Boutons | `--radius-btn` → `--radius-lg` | `rounded-btn` (`Button.tsx`) |
| Champs | `--radius-input` → `--radius-2xl` | `rounded-input` (2 champs de recherche) |
| Cartes | `--radius-card` → `--radius-2xl` | `rounded-card` (portes, dossier, protocole) |
| Menus | `--radius-menu` → `--radius-2xl` | `rounded-menu` (navbar, recherche) |
| Médias | `--radius-media` → `--radius-2xl` | `rounded-media` (photo de bien, squelettes) |
| Modales | `--radius-modal` → `--radius-3xl` | `rounded-modal` + `border-radius: var(--radius-modal)` (`globals.css:1373`) |

- 13 rayons hors échelle → **0** : `rounded-[1.5rem]` et `rounded-3xl` (tous deux 24 px)
  → `rounded-2xl`, `rounded-[1.75rem]` → `rounded-3xl`, `rounded-[2rem]` → `rounded-4xl`.
  Aucun changement de rendu sur ces six premiers ; les pills (`rounded-full`) restent des
  pills.
- Les alias de rôle pointent vers l'échelle et **jamais vers eux-mêmes** : une déclaration
  `--radius-x: var(--radius-x)` hors `@theme` se compile en valeur invalide (voir 2.6).

### 2.5 Motion

- **Durées** : échelle de six crans — `--duration-instant` 140 · `-quick` 200 · `-base`
  380 · `--homera-duration` 520 · `--duration-scene` 820 · `--homera-duration-slow`
  1050 ms. 20 déclarations de `globals.css` la suivent désormais (dropdown, reveal,
  presse, protocole, services, navigation). Les zooms photographiques (900–1 100 ms)
  restent des exceptions assumées et commentées.
- **Easing** : trois courbes exposées à Tailwind (`--ease-standard`, `--ease-soft`,
  `--ease-in-out`). **19 `ease-[cubic-bezier(.22,.61,.28,1)]` recopiés à la main et
  8 `ease-out` natifs → 0** ; `ease-standard` apparaît 93 fois dans le HTML servi.
- **Dropdown** : `140ms ease-out` → `var(--duration-instant) var(--homera-ease)`, et la
  règle `prefers-reduced-motion` cible enfin `.homera-dropdown-enter`.
- **Chargement** : primitive `.homera-skeleton` (rayon du média, balayage au rythme des
  scènes, neutralisée en mouvement réduit) et `aria-busy` branché sur la région des
  résultats (`FeaturedProperties.tsx:256`). La classe n'est pas encore consommée : la
  recherche est synchrone, aucun squelette ne serait honnête avant le branchement API.
- **Transition de page** : toujours inexistante, et pour cause — `npm run build` ne
  génère que `/` et `/_not-found`. Rien à définir tant qu'il n'y a qu'une route.

### 2.6 Le piège rencontré (et la garde ajoutée)

Une passe de remplacement a produit `--duration-instant: var(--duration-instant)` dans
`globals.css` : déclaration circulaire, donc valeur invalide, donc **plus aucune durée dans
le CSS compilé** (`grep 140ms` → 0). Corrigé, et deux gardes ajoutées pour que ça ne
repassse pas :

- `scripts/test-motion.mjs` — « chaque token de design porte une valeur concrète » :
  vérifie que chaque token a au moins une déclaration non auto-référente, et que les six
  rôles de rayon suivent l'échelle.
- `scripts/audit-home.mjs` — même contrôle sur le **CSS compilé** servi par le serveur.

Les deux gardes ont été falsifiées pour vérifier qu'elles échouent vraiment : token cassé
→ `not ok … --duration-instant n'a aucune valeur concrète` ; `text-stone-300` réintroduit
→ `not ok … palette Tailwind par défaut`.

---

## 3. Vérifications exécutées

```
npm test                     → 36 tests / 36 pass, 0 fail   (23 avant la phase 2, 13 ajoutés)
npx tsc --noEmit             → 0 erreur
npm run lint                 → 0 erreur
npm run build                → ✓ 61 pages ; accueil, pages institutionnelles, projets,
                               catégories et 36 fiches de biens générées
npm run audit:home           → 90 pages publiques explorées, 1 547 identifiants uniques,
                               aucun lien interne cassé, ancres inter-pages résolues,
                               un seul h1 par page, cartes à un seul lien,
                               CSS compilé, image AVIF 50 814 octets
CSS compilé                  → .text-homera-amber, .bg-surface-hover, .text-label,
                               .text-note, .text-micro, .text-figure-fluid, .rounded-card,
                               .rounded-menu, .rounded-modal, .rounded-input, .rounded-btn,
                               .ease-standard, .homera-skeleton, .homera-cta,
                               .homera-public-header, .homera-filter-dialog : toutes générées
HTML servi (curl /)          → stone- : 0 · text-homera-amber : 41 · ease-standard : 93
```

Falsifications : `--duration-instant` cassé → test 22 échoue ; `text-stone-300` réintroduit
→ test 23 échoue. Les deux gardes sont donc actives.

## 4. Ce qui reste ouvert

- **Étiquettes** : 19 valeurs de `tracking-[…]` distinctes subsistent (.06em → .42em). Seules
  les trois du pied de page sont passées sur `text-label`. Les normaliser suppose de trancher
  entre deux ou trois crans d'interlettrage : c'est un choix de direction artistique, pas un
  remplacement mécanique.
- **Durées côté composants** : 53 classes `duration-*` utilisent encore l'échelle numérique
  de Tailwind (150/200/280/300/500/700 et quelques `duration-[…ms]`). L'échelle de tokens
  existe ; la migration est possible mais modifie le ressenti au millième.
- **Dimensions arbitraires** : 29 `w-[…]` / `h-[…]` (hauteurs de scènes, largeurs de
  panneaux). Elles relèvent d'une grille, pas de l'échelle d'espacement.
- **États sémantiques** : `--info`, `--success`, `--warning`, `--error` sont prêts mais
  inutilisés faute de formulaires, toasts ou statuts de dossier.
- **`.homera-skeleton`** : primitive prête, non consommée (recherche synchrone).
- **Transition de page** : à définir quand une deuxième route existera.
- **Non vérifié** : le rendu réel. Aucun navigateur graphique ici — contrastes perçus,
  gestes tactiles, lecteur d'écran et Lighthouse restent à faire avec `docs/QA-MOTION.md`.
  Les écarts de corps introduits (≤ 1,6 px sur quelques titres, `.14em` → `.16em` sur les
  colonnes du pied de page) sont à valider visuellement.
