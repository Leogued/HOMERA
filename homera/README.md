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
| 03 | Intentions | `components/home/ExplorerSection.tsx` | Quatre portes expansibles, survol / clavier / toucher |
| 04 | Sélection | `components/home/FeaturedProperties.tsx` | Galerie photographique en profondeur, filtres et aperçu natif de chaque bien |
| 05 | Identité | `components/home/PropertyDossier.tsx` | Identifiant sticky, puis six informations reliées progressivement |
| 06 | Vérification | `components/home/VerificationProtocol.tsx` | Récit sticky : étapes à gauche, narration au centre, dossier à droite |
| 07 | Écosystème | `components/home/ServicesSection.tsx` | Sommaire expansible, images à la demande, scène de hauteur stable |
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
| Moteur, timeline et préférences | `lib/motion.ts` + `lib/motion-frame.ts` |
| Courbes / géométrie et tests | `lib/motion-math.ts` + `scripts/test-motion.mjs` |
| Recherche partagée (hero ↔ sélection) | `components/providers/SearchProvider.tsx` |
| Règles de compte, rôles cumulables et capacités (phase 4) | `lib/auth.ts` |
| Comptes, hachage du mot de passe, session | `lib/accounts.ts` |
| Copy des cinq écrans de compte | `lib/pages.ts` → `AUTH_PAGE` |
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
≈ 2,8 Mo au total, servis en AVIF/WebP à la volée).

Les sujets couverts : quatre scènes d’intention (acheter, louer, séjourner, investir),
quatre biens, quatre services, trois couvertures éditoriales et le plan final de nuit.
En cas de clé manquante, `MEDIA_FALLBACKS` (`lib/content.ts`) renvoie vers le visuel
HOMERA le plus proche plutôt que d’afficher un vide.

## Mouvement

**Ouvrir → révéler → relier → transmettre.** Une motion language commune, pas une
collection d’effets. Une transition éditoriale se glisse entre les repères et les
intentions : « L’immobilier commence par un lieu. La confiance commence par HOMERA. »

- Ordonnanceur `requestAnimationFrame` **à la demande**, mesures de scroll mutualisées
  (`lib/motion-frame.ts`). Pas de polling permanent au repos.
- Progressions continues écrites en variables CSS ; React ne met à jour que les étapes
  et états interactifs. Courbes et géométrie pures dans `lib/motion-math.ts`.
- **`prefers-reduced-motion`** : pas de parallax, curseur, roulement ou compteur animé.
  Les récits se déplient intégralement ; toutes les commandes restent disponibles.
- **Mobile / écran court** : pas de fixation longue. Les intentions s’ouvrent au toucher,
  la galerie conserve son inertie native, l’overlay du menu est opaque immédiatement.
- Les récits sticky nécessitent au moins **1 024 × 700 px**. Leurs visuels se raccourcissent
  entre 700 et 780 px de haut pour ne pas repousser les contrôles hors écran.
- Aucune dépendance d’animation ajoutée. Comparaison des patterns, amplitudes, raisons
  des mouvements et règles de contribution : **[docs/MOTION-HOMERA.md](docs/MOTION-HOMERA.md)**.

---

## Le site public (phase 2 — consultation sans compte)

Le catalogue est consultable **sans créer de compte**. Toutes les pages ci-dessous
existent réellement, sont liées depuis la navigation ou le pied de page, et aucune ne
renvoie vers une ancre morte.

| Adresse | Contenu | Rendu |
| --- | --- | --- |
| `/` | Accueil en neuf scènes, en-tête transparent sur la vidéo | statique |
| `/explorer` | Recherche : filtres, tri, cartes, affichage progressif, adresse partageable | serveur puis client |
| `/acheter`, `/louer`, `/sejour` | Pages de projet : familles, compteurs, sélection complète | serveur |
| `/<projet>/<catégorie>` | Maisons, appartements, terrains, locaux, studios, nuitée… | généré au build |
| `/biens/<identifiant>` | Fiche complète : faits, équipements, contrôle daté, biens proches | 36 pages générées |
| `/favoris` | Favoris et recherches enregistrées du visiteur | statique, lecture locale |
| `/services`, `/a-propos`, `/contact` | Écosystème, méthode, prise de contact | statique |
| `/connexion`, `/inscription`, `/mot-de-passe-oublie`, `/reinitialisation`, `/verification-email` | Comptes : connexion, rôles, mot de passe, confirmation d’adresse | statique + paramètres d’URL |
| `/legal` | Mentions, confidentialité et conditions | statique |
| *(toute autre adresse)* | Page introuvable éditoriale, avec sorties réelles | 404 serveur |

**Zones couvertes.** Quatre communes, décision produit validée : **Cotonou** (21 biens),
**Abomey-Calavi** (7), **Ouidah** (5) et **Porto-Novo** (3). Les filtres de commune, de
quartier et les bornes de prix dérivent du jeu de données : ajouter une commune se fait
en ajoutant des biens, pas en modifiant l’interface.

**Sources de vérité.**

- `lib/properties.ts` — moteur unique du catalogue : lecture et écriture d’URL, filtres,
  facettes comptées, tris, pagination, bornes de prix. Le serveur et le client passent par
  lui : aucun écart d’affichage entre les deux.
- `lib/nav.ts` — une seule déclaration pour le menu, les pages de projet et les catégories.
- `lib/pages.ts` — la copie des pages institutionnelles (services, à propos, contact) ;
  les pages ne sont que des mises en page.
- `lib/persistence.ts` — favoris et recherches enregistrées. **Tout reste dans le
  navigateur** (clé `homera.visiteur.v1`), rien n’est envoyé au serveur ; les données
  relues sont validées avant usage.

**Contrat de la carte de bien** (`components/catalog/PropertyCard.tsx`) : un seul arrêt
de tabulation pour consulter le bien, clic sur toute la surface, ouverture sur
Entrée ou Espace, un unique bouton favori (`aria-pressed`) hors du lien, et le libellé
« Voir la fiche » toujours lisible. La date de vérification et la référence s’affichent
sans survol. Aucun badge d’ancienneté.

**Sans JavaScript**, `/explorer` sert déjà un premier écran de résultats et
`?page=2` en affiche deux : la recherche reste utilisable, seule la mise à jour
progressive de l’adresse et les filtres instantanés nécessitent le client.

---

## Le compte (phase 4 — les comptes s’ouvrent, dans le navigateur)

Phase 4 ouvre réellement les comptes. L’API n’existant pas encore, ils vivent **dans le
navigateur**, comme les favoris de la phase 2 — et chaque écran le dit au lieu de le laisser
deviner. Rien n’est simulé pour autant : le mot de passe est haché (PBKDF2-SHA-256,
150 000 itérations, sel par compte), les codes expirent, les essais sont comptés, la session
se ferme.

| Adresse | Contenu |
| --- | --- |
| `/connexion` | Formulaire de connexion, ou fiche du compte connecté (rôle, adresse, profil, état de vérification) |
| `/inscription` | Choix du rôle — **Client**, **Propriétaire**, **Agent** — puis champs adaptés à ce rôle, en trois blocs : identité, profil, sécurité et accords |
| `/mot-de-passe-oublie` | Émission d’un lien (jeton 32 caractères) et d’un code de secours, valables 30 minutes |
| `/reinitialisation` | Nouveau mot de passe par lien (`?jeton=`) ou par code, lien consommé après usage |
| `/verification-email` | Code à six chiffres : 15 minutes, 5 essais, renvoi et changement d’adresse |

**L’inscription s’adapte au rôle.** Un client déclare son projet et son budget ; un
propriétaire, son portefeuille, la nature et la commune de ses biens, sa situation (résident
ou diaspora) et certifie être propriétaire ou mandataire ; un agent déclare sa structure, son
RCCM ou IFU, sa zone d’exercice et certifie détenir un mandat écrit par bien. Les champs
communs (identité, contact, mot de passe, conditions) restent identiques pour tous.

**Les rôles sont cumulatifs.** Un propriétaire cherche aussi un logement, un agent achète
aussi pour lui-même : **le socle client appartient à tous les rôles**, et un compte peut
détenir les trois. Depuis `/connexion`, un compte connecté ajoute un rôle sans reperdre son
identité, son mot de passe ni son profil — seuls le profil du nouveau rôle et son
consentement propre sont demandés (`RoleUpgrade`, `addRole`, `roles: AccountRole[]`). Chaque
capacité est étiquetée « Ouvert » (elle fonctionne déjà sans serveur) ou « Avec l’API » —
voir `CAPABILITIES` dans `lib/auth.ts`.

**Deux limites assumées, écrites sur les écrans :** aucun e-mail n’est envoyé — le code
s’affiche donc à l’écran (`PilotCode`) ; aucun serveur ne reçoit les comptes — ils ne sont
donc pas partagés entre appareils, et vider le navigateur les efface.

**Fichiers** : `lib/auth.ts` (règles pures : rôles, champs, validations, politique de mot de
passe, codes), `lib/accounts.ts` (stockage, hachage, session, relecture tolérante),
`components/providers/AuthProvider.tsx` (huit actions), `components/auth/*` (champs, rôle,
codes, messages, commande de compte de l’en-tête).

Détail complet, matrice des champs, limites et point de couture pour l’API :
**[docs/AUTH-HOMERA.md](docs/AUTH-HOMERA.md)**.

## Vérification

```bash
npm test                  # 48 tests : ordonnanceur, inertie, géométrie, filtres, médias,
                          # contrastes, comptes (rôles cumulables, mot de passe, codes, stockage)
npx tsc --noEmit
npm run lint
npm run build
npm run audit:home         # app déjà démarrée : explore le site et vérifie
                           # liens internes, ancres inter-pages, aria, h1, images
# HTML de production, sans serveur supplémentaire :
node scripts/audit-home.mjs --file .next/server/app/index.html
```

Ces contrôles ne remplacent pas un navigateur réel. Le contrôle visuel, les gestes
sur iOS / Android, le lecteur d’écran et les mesures Lighthouse restent à effectuer
avec la checklist **[docs/QA-MOTION.md](docs/QA-MOTION.md)**.

## Accessibilité

Focus visible sur les scènes claires (terracotta) et sombres (ambre), navigation clavier
complète (menus, listes déroulantes, carrousel, sommaire de services), libellés `aria`
sur les commandes, aperçus en `<dialog>` natif avec retour du focus, `inert` sur les
panneaux fermés, et respect strict du mouvement réduit.

Contrastes : **tous les couples texte/fond sont assertés AA (≥ 4,5:1) par les tests**, dans
les deux thèmes — encre et texte secondaire sur le fond comme sur une carte, terracotta et
accent, états sémantiques, texte clair des scènes nocturnes, et les deux couples de bouton
plein (`--action-bg` sur une page, `--action-night` sur une surface toujours sombre).
Le terracotta clair a été assombri (`#c65d3b` → `#b3502c`) pour tenir ce seuil : il reste
la teinte des aplats, tandis que `--homera-terracotta-dark` porte les petits textes.

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
