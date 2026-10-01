This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/api-reference/components/font) to self-host the four brand fonts (Manrope, DM Serif Display, Cormorant Garamond Italic, Cakecafe) — see the *Typographie* section below.

## Typographie

Quatre polices, quatre rôles — la hiérarchie est centralisée dans `app/globals.css`
(tokens `--font-*` et échelle `--text-display-*`) et déclarée dans `app/layout.tsx` :

| Rôle | Police | Poids | Usage |
| --- | --- | --- | --- |
| Mot-symbole | `Script MT Bold` (secours web `Cakecafe`) | unique | le mot « HOMERA » uniquement, via `.homera-brand` |
| Grands titres | DM Serif Display | 400 | `font-serif` + `text-display-xs → xl` : `h1`/`h2` de section, chiffres clés |
| Interface | Manrope | 400 · 500 · 600 | texte courant (Regular), menus & boutons (Medium), éléments importants (SemiBold) |
| Accents éditoriaux | Cormorant Garamond Italic | 400 | très ponctuel, via `.homera-accent` |

Règles : pas de `font-bold` sur `font-serif` (DM Serif n'existe qu'en 400, le navigateur
fabriquerait un faux gras) ; le script n'apparaît jamais ailleurs que sur le nom HOMERA ;
les titres utilisent l'échelle `text-display-*` pour que corps, interlignage, interlettrage
et graisse restent cohérents d'une page à l'autre. Les polices sont auto-hébergées
(`next/font/local`, sous-ensembles latin) — voir `public/fonts/README.md`.

---

## L’expérience de la page d’accueil

La page est conçue comme un **parcours en neuf scènes**, chacune avec son rythme, son
mouvement et sa transition vers la suivante :

| # | Scène | Fichier | Ce qui s’y passe |
| --- | --- | --- | --- |
| 01 | Immersion | `components/home/Hero.tsx` | Vidéo d’origine conservée, contenu en couches qui se dissipent au défilement, recherche toujours lisible |
| 02 | Repères | `components/home/StatsSection.tsx` | Compteurs déclenchés à l’entrée en scène (données de démonstration) |
| 03 | Intentions | `components/home/ExplorerSection.tsx` | Scène épinglée, quatre portes qui défilent horizontalement |
| 04 | Sélection | `components/home/FeaturedProperties.tsx` | Carrousel tactile / souris / clavier, filtres reliés à la recherche |
| 05 | Identité | `components/home/PropertyDossier.tsx` | L’identifiant du bien devient le centre d’un système |
| 06 | Vérification | `components/home/VerificationProtocol.tsx` | Sept mouvements racontés, étape dominante au centre du viewport |
| 07 | Écosystème | `components/home/ServicesSection.tsx` | Sommaire de services qui pilote une scène visuelle |
| 08 | Magazine | `components/home/EditorialSection.tsx` | Univers éditorial : rubriques en bandeau, sujets en couverture |
| 09 | Manifeste | `components/home/TrustVisionSection.tsx` | Convictions, piliers, projection finale en parallax |

Le passage d’une scène à l’autre est continu : fondus de teinte (`scene-bg-*`),
filets discrets (`scene-edge`), fondu du hero vers la scène suivante, rail de chapitres
et barre de progression de lecture (desktop).

## Où modifier quoi

| Besoin | Fichier |
| --- | --- |
| Textes, chiffres, biens, services, magazine | `lib/content.ts` |
| Visuels (chemin, dimensions, LQIP) | `lib/media.generated.ts` — **généré**, ne pas éditer |
| Système de mouvement (reveals, parallax, compteurs, pan) | `lib/motion.ts` |
| Recherche partagée (hero ↔ sélection) | `components/providers/SearchProvider.tsx` |
| Mouvement & matières (CSS) | `app/globals.css` (bloc *SYSTÈME DE MOUVEMENT*) |

### Chiffres de démonstration

`lib/content.ts` expose `DEMO_DATA` (actuellement `true`) et le tableau `STATS`. Tant que
les chiffres réels ne sont pas branchés sur l’API, la section **02 Repères** affiche
explicitement qu’il s’agit de données de démonstration du système pilote.

## Visuels — pipeline

```bash
npm run images     # sources : $HOMERA_MEDIA_SRC (défaut /tmp/homera-media)
```

`scripts/build-images.mjs` recadre, redimensionne, compresse (JPEG progressif, mozjpeg) et
génère un `blurDataURL` par visuel, puis écrit `lib/media.generated.ts`. Les fichiers
sources ne sont pas versionnés ; seuls les dérivés optimisés le sont (16 visuels,
≈ 1,8 Mo au total, servis en AVIF/WebP à la volée).

Les sujets couverts : quatre scènes d’intention (acheter, louer, séjourner, investir),
quatre biens, quatre services, trois couvertures éditoriales et le plan final de nuit.
En cas de clé manquante, `MEDIA_FALLBACKS` (`lib/content.ts`) renvoie vers le visuel
HOMERA le plus proche plutôt que d’afficher un vide.

## Mouvement

- **Une seule boucle `requestAnimationFrame`** partagée par toute la page (`lib/motion.ts`).
- **`prefers-reduced-motion: reduce`** : reveals affichés immédiatement, parallax, marquee,
  compteurs et curseur désactivés (CSS + hooks) ; la scène épinglée devient une piste
  défilable, sans mouvement automatique.
- **Mobile** : amplitudes réduites, effets de souris coupés, scène épinglée remplacée par
  une pile verticale, menu plein écran opaque.
- **Aucun overflow horizontal** : chaque effet vit dans un conteneur `overflow-hidden` ou
  utilise des unités calculées (`vw`, `svh`, `calc`).

## Accessibilité

Focus visible sur les scènes claires (terracotta) et sombres (ambre), navigation clavier
complète (menus, listes déroulantes, carrousel, sommaire de services), libellés `aria`
sur les commandes, contrastes texte vérifiés (`--muted` ≈ 6,5:1, `--muted-light` ≈ 4,6:1 sur
le crème), `inert` sur les panneaux fermés, et respect strict du mouvement réduit.

## Performance

Images servies en AVIF puis WebP aux bonnes largeurs (`sizes` réels), qualités limitées à
une liste autorisée (`next.config.ts`), `blurDataURL` pour chaque visuel, chargement
différé natif, animations limitées à `transform`/`opacity`/`filter`, aucune dépendance
d’animation ajoutée.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
