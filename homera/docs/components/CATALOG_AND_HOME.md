# Composants d'Accueil & Catalogue (`components/home/*` & `components/catalog/*`)

## 1. Scènes de la Page d'Accueil (`components/home/*`)

| Composant | Responsabilité |
| --- | --- |
| `Hero.tsx` | Scène 01 : Vidéo auto-hébergée, bouton pause/lecture accessible, titre en couches et `SearchModule`. |
| `SearchModule.tsx` | Barre de recherche multi-critères (Projet, Lieu, Type, Budget) avec dropdowns positionnés par `lib/floating.ts` et navigation clavier roving. |
| `StatsSection.tsx` | Scène 02 : Quatre indicateurs chiffrés animés par `useCountUp`, avec mention explicite du jeu de démonstration. |
| `IdentityStatement.tsx` | Transition éditoriale entre les repères et les intentions. |
| `ExplorerSection.tsx` | Scène 03 : Quatre portes d'intention expansibles au survol, au clavier et au toucher. |
| `FeaturedProperties.tsx` | Scène 04 : Galerie horizontale avec profondeur photographique, filtres d'intention et ouverture de `PropertyPreview`. |
| `PropertyPreview.tsx` | Aperçu rapide d'un bien dans un `<dialog>` natif avec restitution du focus à la fermeture. |
| `PropertyDossier.tsx` | Scène 05 : Récit sticky autour de la référence `HOM-CTN-000421` et ses 6 données reliées. |
| `VerificationProtocol.tsx` | Scène 06 : Récit sticky en 7 étapes (barre d'étapes à gauche, explication au centre, dossier papier à droite). |
| `ServicesSection.tsx` | Scène 07 : Accordéon des 4 services avec chargement d'image à la demande et hauteur stable. |
| `EditorialSection.tsx` | Scène 08 : Magazine éditorial avec filtre par rubrique. |
| `TrustVisionSection.tsx` | Scène 09 : Manifeste, piliers de confiance et projection nocturne finale. |

## 2. Composants du Catalogue (`components/catalog/*`)

- **`PropertyCard.tsx`** :
  - **Contrat strict** : Un seul lien `<Link href="/biens/...">` par carte (`data-card`), clic sur toute la carte, ouverture sur `Entrée` ou `Espace`, bouton `FavoriteButton` (`aria-pressed`) hors du lien, référence et date de vérification toujours visibles sans survol.
- **`CatalogExplorer.tsx`, `CatalogFilters.tsx` & `CommuneMapExplorer.tsx`** :
  - Synchronisation bidirectionnelle avec l'URL (`replaceState`), facettes comptées en temps réel, tiroir de filtres plein écran sur mobile avec fermeture `Escape`, et **carte vectorielle interactive du corridor littoral sud-béninois** (`CommuneMapExplorer.tsx` : Ouidah, Abomey-Calavi, Cotonou, Porto-Novo + quartiers vérifiés).
- **`PropertyComparison.tsx`** :
  - Comparateur côte à côte sur mesure (jusqu'à 3 biens) intégré dans `/favoris` (`FavoritesView.tsx`) et `/client/favoris` (`ClientFavorites.tsx`) dès que 2 biens sont mis en favoris (prix, prix au m², surface, configuration, foncier, date de contrôle HOMERA, disponibilité, équipements).
- **`PropertyDetail.tsx`** :
  - Fiche complète d'un bien : faits clés, équipements, statut de disponibilité, copie de référence, lien vers `/historique/[reference]`, demande de visite et biens proches.
- **`PageHero.tsx`** :
  - En-tête éditorial réutilisé sur toutes les pages intérieures publiques (fil d'Ariane, surtitre, `h1`, introduction, faits clés, actions).
