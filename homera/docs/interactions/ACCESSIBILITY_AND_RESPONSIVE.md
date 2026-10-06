# Accessibilité (WCAG AA) & Comportement Responsive

## 1. Navigation Clavier & Focus Management

- **Liens d'évitement** : Présents en tête de `Navbar`, `PublicHeader`, `app/(client)/layout.tsx` et `app/(workspace)/layout.tsx` pour sauter directement au contenu principal (`#contenu`).
- **Menus déroulants (`Navbar`, `PublicHeader`, `SearchModule`, `AccountControl`, `WorkspaceShell`)** :
  - Ouverture sur `Entrée` / `Espace` / `ArrowDown`.
  - Fermeture sur `Escape` et au clic extérieur avec restitution du focus au bouton d'ouverture (`restoreFieldFocus`).
  - Positionnement géométrique borné dans le viewport (`fitDropdown` dans `lib/floating.ts`), y compris sur mobile en mode paysage ou avec clavier virtuel ouvert.
- **Modale d'aperçu (`PropertyPreview.tsx`)** :
  - Utilise l'élément natif `<dialog>` (`showModal()`) qui piège le focus, supporte `Escape` et restitue le focus à la carte d'origine sans saut de défilement.

## 2. Paliers Responsives (320 px → 1 920 px)

| Plage de largeur | Adaptations clés |
| --- | --- |
| **320 px – 639 px (Mobile)** | Grilles à 1 colonne, tiroir de filtres plein écran, barre latérale d'espace repliée dans un menu mobile superposé (`z-50`), 7 boutons d'étapes du protocole condensés pour tenir dès 320 px, tableaux administratifs remplacés par des cartes (`sm:hidden`). |
| **640 px – 1 023 px (Tablette)** | Grilles à 2 colonnes, récits sticky dépliés en flux vertical continu pour éviter tout blocage tactile. |
| **1 024 px – 1 439 px (Desktop)** | Activation des récits sticky (si hauteur `≥ 700 px`), barre latérale fixe (`264px` / `268px`) dans les espaces connectés, `WorkspaceFooter` décalé de `lg:pl-[268px]` pour rester parfaitement aligné avec la colonne principale. |
| **1 440 px – 1 920 px+ (Grand écran)** | Conteneurs plafonnés (`--container-max` à `--container-ultra`), rail de chapitres latéral (`ChapterRail`) sur l'accueil. |
