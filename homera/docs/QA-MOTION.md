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
- **Site public entier** (`npm run audit:home`) : exploration des 105 adresses atteignables
  depuis l’accueil (catalogue, pages de projet, fiches, et les cinq écrans de compte), aucun lien interne cassé, ancres inter-pages résolues
  (`/services#gestion`, `/a-propos#protocole`…), un seul `h1` par page, images décrites,
  aucun `href="#"`, langue du document, titres et descriptions présents.
- **Contrat de carte** : le nombre de liens vers une fiche égale le nombre de cartes
  affichées — un seul arrêt de tabulation par carte, trois auparavant.
- Catalogue : filtres par projet et par type réellement restrictifs, `?page=2` servant
  deux écrans sans JavaScript, état vide explicite, page hors bornes servie.
- 404 : statut HTTP réel, contenu éditorial, sorties de secours présentes.
- **Comptes (phase 4)** : le socle client présent dans les trois rôles, le cumul des rôles sur
  un même compte (ajout sans identité ni mot de passe, fusion du profil, relecture tolérante de
  `roles`), les trois rôles et leurs champs réellement distincts, la politique
  de mot de passe (longueur, casse, chiffre, refus d’un mot de passe identitaire), les
  validations d’inscription des trois rôles, les codes (génération, expiration, cinq essais),
  la relecture tolérante du stockage, le hachage PBKDF2 (verrouillé, jamais en clair) et le
  parcours de bout en bout inscription → vérification → mot de passe changé.

### Phase 2 — à contrôler à la main

- [ ] **Carte de bien** : un seul arrêt `Tab` par carte, focus visible sur toute la
  surface, `Entrée` **et** `Espace` ouvrent la fiche, retour arrière au même endroit.
- [ ] **Favori** : `aria-pressed` bascule, retour visuel immédiat, annonce unique au
  lecteur d’écran, survit au rechargement, disparaît après effacement des données du site.
- [ ] **Explorateur** : filtres, tri et suppression de puce mettent l’adresse à jour sans
  rechargement ; le retour arrière du navigateur restaure l’état attendu.
- [ ] **Tiroir de filtres (mobile)** : plein écran, `Échap` ferme, le focus revient au
  bouton d’ouverture, le défilement de la page reste verrouillé.
- [ ] **/favoris** : sélection et recherches se réaffichent après un aller-retour sur le
  catalogue ; deux onglets ouverts restent cohérents.
- [ ] **Contrastes en situation** : petit texte sur carte et sur fond crème, boutons
  pleins dans les deux thèmes, texte clair sur les scènes nocturnes.
- [ ] **En-tête** : `PublicHeader` lisible sur toutes les pages intérieures ; l’accueil
  garde son en-tête transparent sur la vidéo.
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

### Phase 4 — les cinq écrans de compte, dans un vrai navigateur

Ce que l’automatisation ne couvre pas (elle teste les règles, pas le rendu) :

- [ ] **Inscription** : choisir Client, puis Propriétaire, puis Agent — les champs changent
  réellement, l’identité déjà saisie est conservée, le reste est remis à zéro ; l’adresse se
  met à jour (`?role=`) et le rechargement garde le rôle.
- [ ] **Saisie guidée** : le curseur de robustesse et la liste des critères réagissent à la
  frappe ; le bouton « Afficher » montre le mot de passe sans sortir du champ ; un formulaire
  fautif place le focus sur le premier champ signalé et l’erreur est annoncée.
- [ ] **Confirmation d’adresse** : le code s’affiche (pilote), un code faux fait décroître le
  compteur d’essais, un code expiré propose un renvoi immédiat, le changement d’adresse
  invalide l’ancien code.
- [ ] **Mot de passe oublié → réinitialisation** : le lien affiché fonctionne, le jeton est
  refusé une seconde fois après usage, un code saisi à la main produit le même effet, et
  l’ancien mot de passe ne permet plus de se connecter.
- [ ] **Session** : « Rester connecté » décoché, la session disparaît à la fermeture de
  l’onglet ; cochée, elle survit à une fermeture du navigateur puis expire au bout de 30 jours.
- [ ] **En-tête** : la commande de compte remplace « Se connecter » après connexion, le
  panneau s’ouvre au clavier (Entrée, Échap, Tab), le badge d’adresse à confirmer est visible
  dans les deux thèmes, et la déconnexion referme le panneau.
- [ ] **Cumul des rôles** : un compte client affiche « Ajouter un autre rôle », l’ajout de
  « Propriétaire » ne redemande ni identité ni mot de passe ; le panneau montre ensuite les
  deux rôles, et le socle client reste intact (favoris, recherches enregistrées) ; après le
  troisième rôle, le message « tous les rôles sont déjà rattachés » remplace le formulaire.
- [ ] **Étiquettes de capacité** : « Ouvert » et « Avec l’API » lisibles dans les deux thèmes,
  sur téléphone, sans que la liste écrase la fiche du compte.
- [ ] **Stockage refusé** : en navigation privée stricte, l’inscription échoue avec un message
  explicite plutôt qu’un faux succès.
- [ ] **Lecteur d’écran** : les trois rôles s’annoncent comme un groupe de boutons radio, le
  champ de code est utilisable au collage, les messages d’état sont lus une seule fois.
- [ ] **Mobile** : le sélecteur de rôle et les formulaires restent lisibles et cliquables à
  360 px, sans zoom involontaire sur les champs.

## Périmètre métier

Les biens, statistiques et dossier sont une démonstration explicitement signalée :
chaque page de catalogue rappelle que les biens et visuels du pilote ne sont pas
commercialisés. Les fiches ne constituent pas des offres de vente réelles.

Depuis la phase 2, il n’existe plus d’ancre sans destination : `/connexion` remplace
l’ancienne ancre `#login`. Depuis la phase 4, cet écran sert réellement : les comptes
s’ouvrent, se connectent, se confirment et se réinitialisent — dans ce navigateur uniquement,
et chaque écran le dit. Les comptes ne sont ni partagés entre appareils ni envoyés à un
serveur ; vider les données du navigateur les efface.
Favoris et recherches enregistrées fonctionnent **sans compte**, dans le navigateur
uniquement (`homera.visiteur.v1`). Les demandes de services et de visite ouvrent le
client de messagerie, sans envoi automatique. La vue carte de l’explorateur et
l’espace éditorial complet (articles) restent hors périmètre.
