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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
