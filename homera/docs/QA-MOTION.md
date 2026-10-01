# QA du mouvement HOMERA

## Couvert par les vérifications automatisées

- TypeScript strict et lint Next / React.
- Build de production statique de `/`.
- Ordonnanceur : mutualisation des frames, annulation / réabonnement, repos sans
  boucle résiduelle, événements scroll regroupés, onglet masqué.
- Géométrie des dropdowns sur écran court / viewport de clavier, garde du retour
  de focus Montant, contrat de scroll interne et navigation roving.
- Courbes bornées, inertie équivalente à 60 / 120 Hz, progression sticky et commandes
  des sept étapes ; révélations du dossier terminées avant sa sortie.
- Géométrie théorique des photos de 320 à 1 920 px ; prix non transformés par le CSS.
- Filtrage immobilier, données de démonstration, existence des 16 images et LQIP.
- Contrastes calculés des pigments de texte sur les fonds connus (clair / sombre).
- HTML rendu : unicité des identifiants, résolution des `aria-controls`,
  `aria-labelledby`, `aria-describedby`, ancres et absence d’interactifs imbriqués.
- Présence des chapitres, quatre intentions, six données du dossier, sept étapes,
  quatre services, vidéo d’origine et CTA.
- CSS des scènes réellement compilé ; endpoint `next/image` avec une qualité autorisée.

## Contrôles manuels restant à faire

Pas de navigateur graphique disponible dans cet environnement. Les cases ci-dessous
ne sont **pas** marquées comme validées par compilation ou par calcul.

### Écrans / thèmes

- [ ] 320 × 667, 390 × 844, 768 × 1 024, 1 024 × 700, 1 440 × 900, 1 920 × 1 080.
- [ ] Paysage court, zoom navigateur 200 %, rotation mobile.
- [ ] Aucun overflow de page ; seul le rail de biens défile horizontalement.
- [ ] Titres, recherche, prix et commandes non coupés ; code du dossier lisible.
- [ ] Thèmes clair et sombre : header toujours transparent, menus opaques.
- [ ] Activation de « réduire les mouvements » avant le chargement et pendant un récit.

### Gestes / transitions

- [ ] Scroll lent puis rapide : aucun scroll forcé ou blocage au passage des sticky.
- [ ] Hero : cadrage, recherche dominante, disparition des couches indépendantes.
- [ ] Intentions : hover stable ; toucher pour ouvrir, puis Explorer pour filtrer.
- [ ] Galerie : swipe natif iOS / Android, drag souris et relâchement ; un glissement
  ne doit jamais ouvrir un aperçu. Première et dernière photos correctement centrées.
- [ ] Dossier : code seul puis photographie / données ; lecture complète à la sortie.
- [ ] Protocole : étapes 01–07, boutons alignés avec le scroll, visualisation cohérente.
- [ ] Services : absence de saut de hauteur dans la scène, premières images chargées
  à la demande, mêmes boutons après hover / focus / toucher.
- [ ] Fin : action claire, expansion légère, retour effectif à la sélection.

### Clavier / accessibilité

- [ ] Tab, Maj+Tab, flèches, Home, End ; focus toujours visible.
- [ ] Chaque dropdown du header navigue dans son propre panneau, Échap restitue le focus.
- [ ] Menu mobile opaque immédiatement ; Tab ne traverse pas la page en arrière-plan.
- [ ] Aperçu d’un bien : ouverture, Échap, clic extérieur, Tab contenu, retour au bien
  sans déplacement vertical de la page. Refaire après une ouverture au clavier.
- [ ] Copie de référence réussie ; permission refusée / presse-papiers indisponible.
- [ ] « Passer le récit » et « Voir toute la fiche » réellement utiles au clavier.
- [ ] Lecteur d’écran : un libellé par text-roll, valeurs finales des chiffres sans
  annonces répétées, états sélectionnés / dépliés compréhensibles.
- [ ] Tactile et mouvement réduit : aucune annotation de curseur.

### Performance réelle

- [ ] Téléphone d’entrée de gamme, CPU ralenti, réseau mobile.
- [ ] Profiler navigateur : aucune activité rAF de mesure de scroll au repos ; vidéo
  suspendue hors champ / onglet masqué ; pas de longue tâche pendant le défilement.
- [ ] Vérifier CLS et LCP dans Lighthouse / DevTools, plutôt que les déduire du build.
- [ ] Safari iOS : sticky, viewport dynamique, ouverture / fermeture du menu et dialog.

## Périmètre métier

Les biens, statistiques et dossier sont une démonstration explicitement signalée.
L’aperçu n’est pas une offre de vente réelle. `#login` reste une ancre préexistante sans
page d’authentification. Les demandes de services ouvrent le client mail, sans envoi
automatique. L’espace éditorial présente des couvertures / extraits ; les articles
complets et le backend immobilier ne font pas partie de ce travail de motion design.
