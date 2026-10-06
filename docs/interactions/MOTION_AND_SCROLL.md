# Moteur de Mouvement & Interactions de Défilement

## 1. Ordonnanceur à la demande (`lib/motion-frame.ts`)
- Toutes les lectures de scroll et animations continues passent par un unique ordonnanceur `requestAnimationFrame`.
- **Zéro boucle résiduelle au repos** : dès que le défilement ou l'inertie s'arrête, l'ordonnanceur se met en veille (aucun appel rAF inutile).
- Lorsque l'onglet du navigateur est masqué (`document.hidden`), les frames et la vidéo du Hero sont suspendues automatiquement.

## 2. Timelines Sticky (`PropertyDossier` & `VerificationProtocol`)
- Les séquences sticky ne s'activent que si le viewport mesure **au moins `1024 px` de large et `700 px` de haut**, et que `prefers-reduced-motion` n'est pas actif.
- Les valeurs continues (progression `0 → 1`) sont écrites dans des variables CSS (`--progress`, etc.) pour éviter les re-rendus React par pixel ; React ne met à jour que l'indice d'étape discret (`0` à `6`).
- Des boutons explicites (« Passer le récit », sélection directe d'étape `01` à `07`) permettent de piloter la séquence au clavier ou à la souris sans dépendre du défilement.

## 3. Galerie Photographique (`FeaturedProperties.tsx`)
- Défilement horizontal natif (`scroll-snap-type: x mandatory`) enrichi d'un glisser-déposer souris avec inertie amortie exponentiellement (identique à 60 Hz et 120 Hz).
- Un glissement (`drag`) au-delà du seuil de déplacement ne déclenche jamais l'ouverture accidentelle de la modale d'aperçu.
- Seule la photographie subit une subtile variation d'échelle (`0.965 → 1`) et d'inclinaison (`≤ 2.4°`) ; les prix, titres et badges restent parfaitement nets et droits.
