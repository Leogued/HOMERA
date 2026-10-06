# Primitives UI & Composants de Layout

## 1. Primitives UI (`components/ui/*`)

| Composant | Rôle & Contrat |
| --- | --- |
| `Button.tsx` | Bouton générique avec variantes (`primary` → `.homera-cta`, `outline`, `ghost`), `rounded-btn` et `text-note`. |
| `Visual.tsx` | Wrapper `next/image` lisant `lib/media.generated.ts` (dimensions, `blurDataURL`, repli `MEDIA_FALLBACKS`) avec voile optionnel. |
| `Reveal.tsx` | Révélation progressive à l'entrée dans le viewport, neutralisée automatiquement sous `prefers-reduced-motion`. |
| `Scene.tsx` | Conteneur de section d'accueil gérant le rythme vertical (`--space-section*`), les bordures et l'identifiant de chapitre. |
| `ChapterRail.tsx` | Rail vertical de repérage des 9 chapitres de l'accueil (desktop) et barre de progression de lecture. |
| `CustomCursor.tsx` | Annotation contextuelle du pointeur sur desktop à pointeur fin (`data-cursor="property"`, etc.), désactivée sur tactile et en mouvement réduit. |
| `TextRoll.tsx` | Micro-transition de libellé au survol, exposant un unique libellé aux lecteurs d'écran. |
| `CopyReference.tsx` | Bouton de copie d'une référence `HOM-...` dans le presse-papiers avec repli de sélection manuelle si l'API Clipboard est refusée. |
| `QrCode.tsx` | Composant SVG pur et sans état traçant la matrice ISO/IEC 18004 générée par `lib/qr.ts` (zone silencieuse de 4 modules, `shapeRendering="crispEdges"`). |

## 2. Layout Public (`components/layout/*`)

- **`Navbar.tsx`** : En-tête de la page d'accueil (`/`), transparent sur la vidéo d'ouverture puis adaptatif au défilement. Menus déroulants accessibles au clavier (`Entrée`, `Flèches`, `Échap`), commutateur de thème, favoris et `AccountControl`.
- **`PublicHeader.tsx`** : En-tête de toutes les pages intérieures publiques (`app/(site)/layout.tsx`), avec lien d'évitement `#contenu`.
- **`Footer.tsx`** : Pied de page éditorial structuré en colonnes (`<h2>` en `text-label`), liens vers les projets, services, pages légales et coordonnées à Cotonou.
- **`NotFoundView.tsx`** : Vue 404 éditoriale proposant des sorties directes vers l'accueil, l'explorateur et le contact.

## 3. Coquille et Primitives des Espaces (`components/workspace/WorkspaceShell.tsx` & `Primitives.tsx`)

- **`WorkspaceShell.tsx`** : Barre latérale fixe (`268px`, `--homera-night`) sur desktop, tiroir mobile accessible (`Escape`), en-tête sticky avec menu de notifications déroulant, bannière hors-ligne et contrôle d'accès par rôle.
- **`Primitives.tsx`** :
  - `WorkspaceHeading` : En-tête standardisé d'espace (`eyebrow`, `h1` en `font-serif text-display-md sm:text-display-lg`, `description`, `actions`).
  - `WorkspacePanel` : Carte de section avec icône, titre (`text-body font-semibold`), description et action.
  - `MetricCard` : Carte d'indicateur chiffré (`font-serif text-display-sm homera-num`).
  - `StatusBadge` : Pastille sémantique (`success`, `warning`, `error`, `neutral`) pour tous les statuts métiers.
  - `EmptyPanel` : État vide structuré avec icône, explication et bouton d'action.
  - `DemoNotice` : Bandeau d'information rappelant la nature locale du prototype.
  - `FormField` : Champ de formulaire standardisé avec `<label htmlFor>`, aide et message d'erreur `role="alert"`.
