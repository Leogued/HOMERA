# Pages du Site Public (`app/page.tsx` & `app/(site)/*`)

## 1. Accueil Cinématique (`/`)
- **Fichier route** : `app/page.tsx`
- **En-tête** : `components/layout/Navbar.tsx` (transparent sur la vidéo du Hero, fixe et lisible dans les deux thèmes) + `ChapterRail` (navigation par chapitre sur desktop).
- **Structure en 9 scènes** :
  1. `#hero` (`Hero.tsx`) : Vidéo d'ouverture avec contrôle de pause accessible, titre éditorial et `SearchModule` partagé.
  2. `#chiffres` (`StatsSection.tsx`) : Compteurs animés à l'entrée dans le viewport, avec mention explicite des données de démonstration.
  3. Transition éditoriale (`IdentityStatement.tsx`) : Phrase manifeste liée au scroll.
  4. `#explorer` (`ExplorerSection.tsx`) : Quatre portes d'intention expansibles (*Acheter*, *Louer*, *Séjourner*, *Investir*).
  5. `#biens` (`FeaturedProperties.tsx`) : Galerie photographique horizontale avec filtres rapides et modale d'aperçu (`PropertyPreview.tsx`).
  6. `#bien-homera` (`PropertyDossier.tsx`) : Récit sticky autour de la référence `HOM-CTN-000421` et ses 6 données reliées.
  7. `#protocole` (`VerificationProtocol.tsx`) : Récit sticky en 7 étapes illustrant le contrôle documentaire HOMERA.
  8. `#services` (`ServicesSection.tsx`) : Sommaire interactif des 4 services (*Gestion*, *Maintenance*, *Déménagement*, *Travaux*).
  9. `#magazine` (`EditorialSection.tsx`) & `#manifeste` (`TrustVisionSection.tsx`) : Magazine éditorial, convictions et projection finale nocturne.

## 2. Catalogue & Recherche (`/explorer`, `/acheter`, `/louer`, `/sejour`)
- **En-tête & Pied de page** : Hérités de `app/(site)/layout.tsx` (`PublicHeader` + cible `#contenu` + `Footer`).
- **`/explorer`** : Recherche complète avec filtres à facettes (`CatalogFilters`), carte vectorielle interactive des communes et quartiers du Sud-Bénin (`CommuneMapExplorer`), tri, pagination serveur (`?page=2` fonctionnel sans JS), sauvegarde de recherche (`SaveSearchButton`) et état vide explicite.
- **`/acheter`, `/louer`, `/sejour` & `/[projet]/[categorie]`** : Pages pré-filtrées par projet et par sous-catégorie, enrichies d'un guide de décision métier en 3 piliers, d'une FAQ dédiée par projet (`PROJECT_DECISION_GUIDES`) et de points de contrôle spécifiques par catégorie (`CATEGORY_VERIFICATION_NOTES`).

## 3. Fiche de Bien (`/biens/[id]`) & Traçabilité (`/historique/[reference]`, `/verification-agent`)
- **`/biens/[id]`** (`PropertyDetail.tsx`) : 36 fiches générées au build. Affiche la référence HOMERA copiable (`CopyReference`), le prix formaté en FCFA (`.homera-num`), la synthèse architecturale et d'usage (`buildPropertyEditorialSynthesis`), le profil complet du quartier (`getNeighborhoodContext` : vocation, résumé urbain, 3 repères territoriaux), l'aide à la décision financière et procédurale selon le projet (`getPropertyCommitmentGuide` : prix/m², lecture du titre foncier / ACD / bail, 3 étapes indispensables), la date de contrôle documentaire, le lien vers l'historique du bien, la vérification de l'agent autorisé et les biens similaires.
- **`/historique/[reference]`** (`PropertyHistory.tsx`) : Chronologie étape par étape des événements du dossier.
- **`/verification-agent`** (`AgentVerification.tsx`) : Contrôle public d'une habilitation agent par couple `(agent, bien)` avec formulaire de vérification interactif et exemples de mandats du pilote.

## 4. Pages Institutionnelles & Légales
- **`/services` & `/services/[slug]`** (`ServiceDetail.tsx`) : Présentation détaillée des quatre métiers HOMERA (*Gestion immobilière*, *Maintenance*, *Déménagement*, *Travaux*) avec périmètre d'exécution en 4 volets, profils accompagnés, livrables documentaires et FAQ métier (`SERVICE_DETAILED_GUIDES`).
- **`/a-propos` & `/contact`** : Mission, protocole en 7 étapes, les 4 publics accompagnés (`ABOUT_AUDIENCES`), frontière explicite entre le contrôle HOMERA et le rôle du notaire / de l'ANDF (`ABOUT_VERIFICATION_BOUNDARY`), et guide de préparation d'échange (`CONTACT_PREPARATION_GUIDES`).
- **`/legal`, `/legal/[slug]` & alias (`/mentions-legales`, `/politique-verification`, `/regles-visite`, `/regles-location`, `/cookies`)** : Corpus réglementaire et contractuel du pilote.
