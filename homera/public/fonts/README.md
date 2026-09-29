# Polices de marque HOMERA

Le site repose sur **quatre rôles typographiques**, un seul par usage. Rien de décoratif
n'est ajouté ailleurs.

| Rôle | Police | Poids utilisés | Déclaration |
|---|---|---|---|
| Mot-symbole « HOMERA » | **Script MT Bold** (police système) + `Cakecafe` en secours | 400 (grasse par nature) | `--font-brand` + classe `.homera-brand` (`app/globals.css`) |
| Grands titres | **DM Serif Display** | 400 uniquement | `--font-dm-serif` → `font-serif` + `text-display-*` (`app/layout.tsx`) |
| Menus, boutons, textes | **Manrope** | Regular 400 · Medium 500 · SemiBold 600 | `--font-manrope` → `font-sans` / base du `body` |
| Accents éditoriaux | **Cormorant Garamond Italic** | 400 | `--font-cormorant` → classe `.homera-accent` |

## Fichiers

| Fichier | Rôle | Licence |
|---|---|---|
| `Manrope-latin-wght.woff2` — variable 200–800 (≈ 25 Ko) | police principale | `LICENSE-Manrope-OFL.txt` |
| `DMSerifDisplay-latin-400.woff2` (≈ 25 Ko) | grands titres | `LICENSE-DMSerifDisplay-OFL.txt` |
| `CormorantGaramond-latin-wght-italic.woff2` — variable 300–700 (≈ 39 Ko) | accents éditoriaux | `LICENSE-CormorantGaramond-OFL.txt` (OFL, couvre romain + italique) |
| `Cakecafe.woff2` (≈ 20 Ko) puis `Cakecafe.ttf` | secours du mot-symbole quand Script MT Bold est absente (Android, iOS, macOS, Linux) | à vérifier : https://khurasanstudio.com/license/ |

Les trois premières polices sont chargées par `next/font/local` dans `app/layout.tsx` et les
deux suivantes par un `@font-face` de `app/globals.css`. Les fichiers sont des sous-ensembles
« latin » (accents français inclus) fournis par [Fontsource](https://fontsource.org) — le build
ne dépend donc d'aucun accès à Google Fonts et fonctionne hors ligne.

## Règles à respecter

- **Script MT Bold / `Cakecafe` ne servent qu'au mot « HOMERA ».** Aucun autre texte, aucun
  titre, aucun bouton.
- **DM Serif Display = titres uniquement** (`h1`/`h2` de section, grands chiffres). Jamais de
  paragraphe, de menu, de prix ou de libellé de carte. La police n'existe qu'en 400 : ne jamais
  y ajouter `font-bold` / `font-extrabold` (le navigateur fabriquerait un faux gras) — utiliser
  l'échelle `text-display-*`, qui porte déjà le bon graisse.
- **Cormorant Garamond Italic = accents courts** (un mot du hero, la citation du manifeste,
  un segment de titre). Via `.homera-accent`, taille réglée par une classe utilitaire.
- Tout le reste est en Manrope : 400 pour les textes courants, 500 pour les menus et boutons,
  600 pour les éléments importants.

## Historique

`Yellowtail` (secours de Brush Script MT) et `CormorantGaramond-latin-wght.woff2` (romain,
secours de Perpetua dans l'ancien header) ne sont plus chargés : la refonte typographique a
supprimé les accents manuscrits des boutons et le serif du header au profit de Manrope.
