# VISION — HOMERA

> **« L'immobilier commence par un lieu. La confiance commence par HOMERA. »**
>
> HOMERA ne cherche pas à avoir beaucoup de contenu.
> HOMERA cherche à avoir exactement le bon contenu.
>
> HOMERA ne cherche pas à reproduire les sites modernes.
> HOMERA étudie leurs meilleures idées pour construire sa propre expérience.
>
> HOMERA ne remplit jamais une page.
> HOMERA construit une expérience.

---

## 1. Mission produit

**HOMERA** est la plateforme immobilière de référence conçue pour le marché béninois (**Cotonou**, **Abomey-Calavi**, **Ouidah**, **Porto-Novo**), pensée pour instaurer un standard de **transparence documentaire**, de **clarté éditoriale** et de **confiance vérifiable** entre quatre acteurs :

1. **Les Clients & Résidents (locaux et diaspora)** qui cherchent à acheter, louer à l'année, séjourner à la nuitée ou investir au Bénin sans craindre les annonces fantômes, les intermédiaires non mandatés ou les frais opaques.
2. **Les Propriétaires & Bailleurs** qui souhaitent confier, valoriser et suivre leurs biens avec un dossier structuré, des mandats encadrés et une traçabilité complète des visites, candidatures et contrats.
3. **Les Agents immobiliers habilités** dont la légitimité repose sur un matricule vérifiable et des **autorisations nominatives par bien** (jamais un droit d'accès vague à tout le catalogue), prouvables par QR code ISO et page de contrôle publique.
4. **L'Administration & Contrôle HOMERA** qui instruit les pièces déclarées, valide ou suspend les dossiers, suit les signalements et garantit la tenue du registre.

---

## 2. Direction de Conception Visuelle & Éditoriale Sur Mesure

HOMERA ne doit jamais être construit comme un assemblage de sections génériques provenant d'un template immobilier, ni ressembler à une landing page SaaS froide ou à une copie identifiable d'Airbnb, Zillow ou Booking.

### 2.1 Les 5 axiomes de conception HOMERA

```text
UTILITÉ     > QUANTITÉ
CLARTÉ      > COMPLEXITÉ
HIÉRARCHIE  > DÉCORATION
QUALITÉ     > QUANTITÉ
EXPÉRIENCE  > TEMPLATE
```

### 2.2 « Content Before Layout »

Le contenu n'est jamais inventé pour remplir une grille ou une maquette. Toute page découle de la chaîne :

```text
BESOIN UTILISATEUR → CONTEXTE → INFORMATION → DÉCISION → ACTION → COMPOSITION ADAPTÉE
```

Il n'existe aucun nombre minimum de sections : une page courte de 4 sections parfaitement ciblées est toujours préférable à une page de 12 sections diluée par du remplissage.

### 2.3 Rythme éditorial et visuel

Lorsqu'une page accompagne une découverte et une prise de décision, son rythme naturel suit une progression maîtrisée :

```text
IMMERSION → COMPRÉHENSION → EXPLORATION → PREUVE → ACTION
```

Chaque section doit remplir au moins une fonction explicite : **compréhension**, **découverte**, **comparaison**, **confiance**, **preuve**, **décision**, **action**, **navigation**, **conversion** ou **storytelling utile**. Toute section qui n'appartient à aucune de ces fonctions est supprimée.

### 2.4 « Borrow Patterns, Not Interfaces »

Pour chaque page majeure, la conception s'appuie sur l'étude comparative d'au moins **3 références modernes pertinentes** (immobilier haut de gamme, hospitality, architecture, e-commerce premium, studios digitaux récompensés). HOMERA emprunte des **patterns d'usage et d'interaction** (logique de filtrage, présentation d'une preuve, hiérarchie de galerie, continuité de lecture), mais les recompose intégralement dans sa propre identité visuelle :
- Terre cuite (`#b3502c`), brun profond (`#3e2418`), papier crème (`#faf6ef`) et nuit (`#1a100b`).
- Quatuor typographique : *DM Serif Display* (titres), *Manrope* (interface), *Cormorant Garamond Italic* (accents), *Cakecafe* / *Brush Script MT* (mot-symbole « HOMERA » uniquement).
- Photographie éditoriale cadrée et mouvement fonctionnel au service de la compréhension et de l'orientation.

### 2.5 Discipline de suppression (Test de suppression & Test de nécessité)

Chaque section et chaque composant doivent survivre à deux épreuves :
1. **Test de suppression** : *« Si cette section disparaît, l'utilisateur perd-il une information, une capacité, une preuve, une compréhension ou une action importante ? »* — Si non, elle est supprimée ou fusionnée.
2. **Test de nécessité** : *« Pourquoi cet élément est-il ici ? »* — La réponse doit être une utilité utilisateur mesurable (ex. *« permet de vérifier la période de validité du mandat avant la visite »*), jamais une justification cosmétique (*« pour remplir la page »*, *« parce que les sites immobiliers le font »*).

---

## 3. Les 6 piliers non négociables de HOMERA

### Pilier 1 — Référence unique et traçabilité par bien
Chaque bien possède un identifiant canonique (`HOM-CTN-000421`, `HOM-CAL-...`, `HOM-OUH-...`, `HOM-PRN-...`), une date de vérification documentaire affichée sans survol, un statut de disponibilité clair et un historique chronologique (`/historique/[reference]`).

### Pilier 2 — Habilitation agent par mandat précis
Un agent n'est jamais « autorisé en général » sur toute la plateforme : son habilitation lie **un matricule agent + une référence de bien + un périmètre + une période de validité**. Ce lien est vérifiable publiquement sur `/verification-agent` et encodé dans un QR code généré sans dépendance externe (`lib/qr.ts`).

### Pilier 3 — Rôles cumulables avec socle client universel
Un propriétaire cherche aussi à se loger ; un agent peut aussi acheter ou louer pour lui-même. Tout compte HOMERA inclut le **socle client** (favoris, recherches enregistrées, visites, demandes) et peut cumuler les rôles **Client**, **Propriétaire** et **Agent** sans recréer de compte ni perdre son historique.

### Pilier 4 — Consultation publique ouverte et sans friction
Le catalogue (`/explorer`, `/acheter`, `/louer`, `/sejour` et leurs sous-catégories, ainsi que les 36 fiches `/biens/[id]`) est intégralement consultable **sans compte**. Les favoris et recherches sauvegardées fonctionnent dès la première visite dans le navigateur (`homera.visiteur.v1`), et le premier écran de résultats reste fonctionnel même sans JavaScript.

### Pilier 5 — Honnêteté du produit (Zéro dark pattern, zéro faux semblant)
Tant qu'une brique serveur (API, base de données, envoi d'e-mails/SMS, paiement Mobile Money, signature électronique légale) n'est pas branchée, l'interface l'indique clairement (`DemoNotice`, badges `Prototype local`, code de confirmation affiché à l'écran en mode pilote). Aucune action ne simule un faux envoi serveur silencieux.

### Pilier 6 — Excellence d'exécution frontend & artistique
Toutes les pages — de la scène d'ouverture vidéo jusqu'au lecteur de contrat ou au wizard en 11 étapes du propriétaire — doivent donner l'impression d'appartenir **au même produit**, conçu par une équipe senior exigeante :
- Zéro débordement horizontal involontaire de 320 px à 1 920 px.
- Contrastes WCAG AA (≥ 4,5:1) prouvés par test automatisé en thème clair comme en thème sombre.
- Zéro couleur codée en dur hors tokens, zéro classe typographique hors échelle, zéro lien interne mort, zéro élément décoratif sans fonction.
