# Le mouvement HOMERA

## Intention

**Ouvrir → révéler → relier → transmettre.** Le mouvement explique un changement
d’état : une intention devient une porte, une photo devient un bien, une référence
devient un dossier, puis ce dossier traverse un protocole. Il ne décore pas une liste.

L’identité existante est conservée : vidéo et mot-symbole, Manrope / DM Serif / Cormorant,
terre cuite, brun, crème, header transparent dans les deux thèmes. Les petits textes
utilisent le pigment foncé déjà présent dans la palette ; les surfaces et les grands
accents conservent la teinte principale.

## Grammaire commune

| Geste | Réponse | Raison |
| --- | --- | --- |
| Arriver | Décalage léger, rideau d’image, stagger limité | Établir l’ordre de lecture |
| Explorer | Expansion d’une porte, contraction des voisines | Donner de la place à une intention |
| Avancer dans une galerie | Profondeur photographique liée à la distance au centre | Identifier le bien dominant |
| Lire un dossier | Référence centrale, connexions qui se dessinent | Montrer le lien entre lieu et données |
| Vérifier | Même objet, nouveaux états et progression continue | Rendre la méthode compréhensible |
| Choisir un service | Expansion du sommaire, image en fondu, textes superposés | Découvrir sans déplacer le CTA |
| Agir | Translation de 1–2 px, compression à l’appui, roulement bref | Confirmer qu’une commande est disponible |

- Easing CSS : `--homera-ease`, `--homera-ease-out-soft`, `--homera-ease-in-out`.
- Micro-réponses : 180–240 ms. Transformations de composition : 520–640 ms.
- Rideaux d’image : environ 1 050 ms. Compteurs : 1 650 ms avec une courbe en S.
- Inertie JS : amortissement exponentiel, sans rebond, indépendant de 60 / 120 Hz.
- Pointeur : 5 px maximum sur le hero ; 2 px sur le CTA. Jamais sur tactile ou en
  mouvement réduit. Le pointeur natif reste toujours visible.
- Galerie : inclinaison maximale 2,4°, échelle 0,965–1. **Seule la photographie se
  transforme** ; légendes, prix et surfaces ne sont ni floutés ni inclinés.
- Hero : échelle vidéo 1–1,018, dérive verticale au maximum 5 px. Recherche et titre
  ont des sorties indépendantes ; la recherche ne s’efface pas avec le titre.
- Le blur est limité à l’entrée des informations du dossier et au changement
  d’étape du protocole. Pas de blur sur prix, commandes ou informations essentielles.

## Comparaison des patterns

Comparaison technique et de parcours avant implémentation, **pas un benchmark visuel
multi-navigateurs**. Les implémentations sont originales : aucun fichier d’un registre
Skiper, Motion ou GSAP n’a été importé ou recopié.

| Pattern examiné | Intérêt | Décision HOMERA |
| --- | --- | --- |
| Expand-on-hover | Mettre un sujet au premier plan sans quitter la scène | Retenu pour les quatre intentions, avec sélection tactile et lien d’action séparé |
| Perspective / coverflow | Foyer central et profondeur | Retenu uniquement comme profondeur légère d’une galerie native, pas comme rotation 3D |
| Card stack | Hiérarchie et superposition | Écarté pour les biens : masque les annonces et leur prix ; conservé comme discret dossier papier dans le protocole |
| Horizontal scroll | Contrôle direct, balayage naturel | Retenu : scroll natif, snap centré, drag souris borné, flèches / Home / End / repères |
| Sticky cards / scroll imposé pour les biens | Présentation produit immersive | Écarté : impose trop de scroll pour comparer plusieurs prix |
| Image reveal | Entrée photographique lisible | Retenu sur les grandes images, avec boîte d’observation non masquée |
| Sticky storytelling | Construire progressivement une information | Retenu pour l’identifiant et la vérification, pas pour toutes les sections |
| Scroll-linked text | Phrase forte qui accompagne l’avancée | Une seule transition éditoriale : « L’immobilier commence par un lieu. La confiance commence par HOMERA. » |

### Références techniques consultées

- Expansion : [ExpandOnHover — Skiper UI](https://skiper-ui.com/v1/skiper52).
- Galerie : [Perspective carousel — Skiper UI](https://skiper-ui.com/v1/skiper47).
- Stack / gestes : [1](https://skiper-ui.com/v1/skiper16), [2](https://skiper-ui.com/v1/skiper48).
- Texte scroll-linked : [4](https://skiper-ui.com/v1/skiper72).
- Progression, transformation, inertie : [1](https://motion.dev/docs/react-use-scroll),
  [2](https://motion.dev/docs/react-scroll-animations).
- Variantes responsives et retour à l’état statique :
  [1](https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/), [3](https://gsap.com/resources/a11y/).

Ces références servent à comparer les principes. La page n’adopte ni leur typographie,
ni leurs couleurs, ni leurs templates ; elle n’ajoute aucune dépendance d’animation.

## Parcours implémenté

1. **Hero** : vidéo existante, trois couches, stagger principal → information →
   recherche → repères secondaires. Sortie douce ; passage au clair avant la fin du hero.
2. **Repères** : compteurs à accélération / ralentissement, largeur finale réservée,
   valeur finale unique pour les lecteurs d’écran. Les données restent de démonstration.
3. **Transition éditoriale** : phrase révélée par le scroll, brun qui se fond dans les
   scènes claires, un trait vertical qui guide la lecture.
4. **Intentions** : Acheter / Louer / Séjourner / Investir se partagent une même surface.
   Le clavier sélectionne avec les flèches ; le toucher ouvre, puis Explorer applique
   réellement le filtre. L’ancien pan de trois écrans est remplacé pour ne pas cumuler
   les longues séquences imposées.
5. **Biens** : galerie photographique manuelle. Le bien dominant garde son prix et
   son type immédiatement lisibles. Consultation disponible par l’image et par le lien.
6. **Identité** : `HOM-CTN-000421` seul au centre, puis photographie et six données
   reliées (localisation, statut, propriétaire, vérification, agent, date). Les données
   précédentes restent présentes et lisibles. La propriété est indiquée sous la photo.
7. **Vérification** : 01–07 à gauche, narration au centre, même dossier illustratif à
   droite ; informations, pièces, mandataire et statut se construisent. Les commandes
   explicites utilisent exactement la même progression que le scroll.
8. **Services** : sommaire expansible, visuels chargés seulement lors de la découverte,
   hauteur du texte fixée naturellement par la grille du contenu le plus long. Les
   demandes ouvrent un brouillon dans la messagerie à l’adresse déjà présente dans le
   footer ; aucun envoi automatique ni fausse soumission à un backend.
9. **Magazine / manifeste / projection** : rubriques au rythme lent et contrôlable,
   reveals photographiques, plan de nuit en profondeur, action « Explorer HOMERA ».

## Quatre interactions utiles au-delà des effets demandés

- **Aperçu natif d’un bien** : éviter un changement de page pour comparer ; Échap,
  focus contenu, restauration du focus et de la position à la fermeture. Fiche et
  photographies explicitement illustratives, pas une offre commerciale réelle.
- **Copie de référence** : réutiliser l’identité d’un bien lors d’une prise de contact.
  Confirmation accessible ; si le presse-papiers est refusé, le code est sélectionné
  avec une instruction de copie manuelle.
- **Passer un récit / voir toute la fiche** : donner un contrôle aux visiteurs pressés
  et aux utilisateurs clavier. Aucune séquence sticky n’est obligatoire.
- **Contrôle des médias en mouvement** : pause vidéo et bandeau ; vidéo interrompue
  hors champ, dans un onglet masqué et en mouvement réduit. Le bandeau est statique
  sur tactile et s’arrête hors écran ou au survol.

## Moteur, accessibilité, performance

- `lib/motion-frame.ts` : ordonnanceur rAF à la demande et mesures de scroll mutualisées.
  Il ne maintient pas de boucle au repos. La séquence d’une inertie / d’un
  compteur est bornée puis désabonnée.
- `lib/motion.ts` : observers, timeline locale, préférences d’appareil, contrôles sticky,
  profondeur de pointeur et compteurs. Les valeurs continues sont des variables CSS,
  pas des rendus React par pixel. React met à jour les étapes et états interactifs.
- `lib/motion-math.ts` : phases, bornes, inertie et géométrie pures, testées sans navigateur.
- `lib/floating.ts` : placement des dropdowns dans le viewport visible et retour de focus
  qui ne rouvre pas la liste Montant. Le défilement d’un panneau ne le ferme pas.
- Les sticky sont réservés à **≥ 1 024 px de large et ≥ 700 px de haut**, sans préférence
  de mouvement réduit. Les écrans courts déplient le récit. Entre 700 et 780 px,
  les photographies du récit sont raccourcies pour conserver les contrôles à l’écran.
- Avec `prefers-reduced-motion`, pas de parallax, de roulement, de compteur animé,
  de curseur, de transition ou de fixation longue. Les sept étapes se lisent en entier.
- Sans JS, les reveals et les récits restent lisibles. Les interactions de recherche
  et les aperçus nécessitent naturellement l’hydratation React.
- Aucun prix ou statut essentiel n’est caché par un hover obligatoire. Les images ont
  une géométrie réservée, des `sizes`, des placeholders et le lazy loading natif.
- Menus avec identifiants uniques, références `aria` résolues, panneaux fermés `inert`,
  focus visible. Overlay mobile opaque immédiatement, au-dessus des commandes flottantes,
  focus contenu puis rendu au bouton d’ouverture.
- Les demandes de service, recherche et filtres restent utilisables ; une recherche
  validée affiche ses critères validés, pas les modifications encore non soumises.

## Vérification reproductible

```bash
npm test                  # moteur, inertie, géométrie, données et médias
npx tsc --noEmit
npm run lint
npm run build
npm run audit:home         # serveur local déjà démarré
# Structure du HTML de production sans démarrer de serveur supplémentaire :
node scripts/audit-home.mjs --file .next/server/app/index.html
```

L’audit HTTP contrôle la structure rendue, les ancres, références `aria`, CSS compilés
et l’optimisation d’une image. **Ce n’est pas un test de rendu visuel, de gestes réels
ou de lecteur d’écran.** Voir [QA-MOTION.md](QA-MOTION.md) pour le contrôle manuel restant.
