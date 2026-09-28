# Polices de marque HOMERA

Police **Cakecafe** (Khurasan), utilisée uniquement pour le mot-symbole « HOMERA »
via la classe `font-brand` (voir `app/globals.css`) :

- `Cakecafe.woff2` — servi en priorité (≈ 20 Ko, généré à partir du `.ttf` avec fontTools)
- `Cakecafe.ttf` — secours pour les navigateurs sans WOFF2 (≈ 41 Ko)

Ordre de la pile `--font-brand` : Script MT Bold (police système Windows / Office)
→ Cakecafe → Brush Script MT → cursive. Cakecafe prend donc le relais sur tous les
appareils où Script MT Bold n'existe pas (Android, iOS, macOS, Linux).

## Équivalents web des polices Windows du header

Perpetua et Brush Script MT (choisies pour le header) n'existent que sur Windows / Office.
Ces fichiers, chargés par `next/font/local` dans `app/layout.tsx`, prennent le relais
uniquement quand la police système manque (Android, iOS, macOS, Linux) :

| Fichier | Remplace | Licence |
|---|---|---|
| `CormorantGaramond-latin-wght.woff2` (variable 300–700, ≈ 65 Ko) | Perpetua | `LICENSE-CormorantGaramond-OFL.txt` |
| `Yellowtail-latin.woff2` (≈ 18 Ko) | Brush Script MT | `LICENSE-Yellowtail-Apache-2.0.txt` |

Sources : dépôt `google/fonts` (mêmes fichiers que ceux servis par Google Fonts), sous-ensemble
« latin » (accents français inclus) généré avec `pyftsubset --layout-features='*' --flavor=woff2`.
Le build ne dépend donc pas d'un accès à Google Fonts pour le header.

Licence Cakecafe : vérifier les conditions sur https://khurasanstudio.com/license/
