# HOMERA — le système de comptes (phase 4)

Ce document décrit ce que la phase 4 ouvre réellement, comment le parcours est construit,
et ce qu’il ne prétend pas être. Il est la référence des cinq écrans d’authentification :
`/connexion`, `/inscription`, `/mot-de-passe-oublie`, `/reinitialisation`,
`/verification-email`.

---

## 1. La position tenue

HOMERA n’a pas encore d’API. Le choix de la phase 4 est donc explicite :

> **Les comptes fonctionnent pour de vrai, mais dans le navigateur — et l’interface le dit
> à chaque écran.**

Conséquence directe : aucune fonction n’est simulée. Le mot de passe est réellement haché,
les codes expirent réellement, la vérification d’adresse bloque réellement le compte,
la session se ferme réellement. Ce qui change par rapport à une plateforme classique, c’est
que **rien ne quitte l’appareil** — ni envoi d’e-mail, ni base de données, ni jeton serveur.

Trois phrases reviennent donc sur les écrans concernés, jamais cachées dans une note de bas
de page :

- « Les comptes du pilote sont conservés dans ce navigateur — aucun serveur ne les reçoit. »
- « Aucun e-mail n’est envoyé : le code s’affiche ici. »
- « Le mot de passe n’y est jamais stocké en clair : une empreinte PBKDF2-SHA-256 est
  calculée localement. »

---

## 2. Les cinq adresses

| Adresse | Ce qu’on y fait | État servi | Renvois |
| --- | --- | --- | --- |
| `/connexion` | Se connecter, ou consulter la fiche du compte connecté | formulaire ou espace, selon la session | `/inscription`, `/mot-de-passe-oublie` |
| `/inscription` | Choisir un rôle, puis créer le compte | statique, rôle en paramètre (`?role=`) | `/connexion`, `/verification-email` |
| `/mot-de-passe-oublie` | Créer un lien + un code de réinitialisation | statique | `/reinitialisation?jeton=…`, `/connexion` |
| `/reinitialisation` | Choisir un nouveau mot de passe (lien **ou** code) | jeton en paramètre (`?jeton=`) | `/connexion?etat=reinitialise` |
| `/verification-email` | Confirmer l’adresse avec un code à six chiffres | statique | `/connexion?etat=verifie` |

Paramètres acceptés — et rien d’autre :

- `?role=client|proprietaire|agent` — validé par `roleFromParam()`, une valeur inconnue
  retombe sur `client` ;
- `?jeton=…` — accepté seulement s’il a la forme d’un jeton hexadécimal de 16 à 64
  caractères, puis vérifié contre les comptes stockés ;
- `?etat=reinitialise|verifie|deconnecte` — sert un message d’étape ; toute autre valeur
  n’affiche rien.

Aucune de ces pages n’est indexable (`robots: { index: false, follow: true }`).

---

## 3. L’inscription s’adapte au rôle

Le rôle se choisit **avant** la saisie, et il change réellement les champs demandés : les
informations d’identité déjà remplies sont conservées, les champs propres au rôle précédent
sont écartés (pas de mélange silencieux).

| Bloc | Client | Propriétaire | Agent |
| --- | --- | --- | --- |
| Identité et contact (commun) | Prénom · Nom · E-mail · Téléphone · Zone | idem | idem |
| Profil | Projet · Type de bien recherché · Budget indicatif · Horizon (facultatif) | Biens à confier · Nature des biens · Où se trouvent vos biens · Projet pour ces biens · Situation (Bénin / diaspora / mandataire) · IFU (facultatif) | Structure · RCCM ou IFU · Zone d’exercice · Expérience · Carte professionnelle (facultatif) |
| Sécurité (commun) | Mot de passe · Confirmation | idem | idem |
| Accords | Conditions (obligatoire) · Alertes (facultatif) | Conditions + **certification de propriété ou de mandat écrit** | Conditions + **certification de mandat écrit par bien** |

Chaque ligne du tableau est une donnée, pas du JSX : `lib/auth.ts` décrit les champs
(`roleFields(role)`), et le formulaire, la validation et la fiche du compte lisent la même
description. Ajouter un champ ne demande donc pas de toucher trois fichiers.

---

## 4. Le parcours, étape par étape

### 4.1 Inscription → vérification

1. `validateSignUp(role, values)` — champs obligatoires, format e-mail, format téléphone
   béninois, IFU à treize chiffres, RCCM/IFU à six caractères minimum, politique de mot de
   passe, confirmation, consentements. Le premier champ fautif reçoit le focus.
2. `hashPassword()` — PBKDF2-SHA-256, **150 000 itérations**, sel aléatoire de 16 octets par
   compte, via l’API Web Crypto. En contexte non sécurisé (http hors localhost), une
   empreinte de secours non cryptographique prend le relais **et le compte est marqué comme
   tel** (`kdf: "fallback-local"`) — jamais en silence.
3. Un code à six chiffres est émis : **15 minutes**, **5 essais**, compteur réel.
4. La session s’ouvre immédiatement, et l’écran `/verification-email` affiche le code —
   puisque rien ne peut l’envoyer.

### 4.2 Connexion

- Adresse inconnue dans ce navigateur → le message le dit, et propose la création du compte.
  Dans un pilote sans serveur, un « identifiants incorrects » générique serait seulement plus
  obscur.
- Mot de passe faux → erreur sur le champ, focus dessus.
- Compte non confirmé → la session s’ouvre, puis l’écran de vérification prend la main.
- « Rester connecté » change réellement de support : `localStorage` (30 jours, puis
  expiration vérifiée à la lecture) ou `sessionStorage` (le temps de l’onglet).

### 4.3 Mot de passe oublié → réinitialisation

1. L’adresse est vérifiée, puis un **jeton** (32 caractères hexadécimaux) et un **code** de
   secours sont émis ensemble : 30 minutes.
2. Comme aucun e-mail ne peut partir, les deux s’affichent à l’écran, copiables, avec un lien
   qui fonctionne réellement.
3. `/reinitialisation` accepte le jeton **ou** le code : le premier est vérifié contre le
   compte, le second aussi. Le lien est à usage unique : une fois le mot de passe changé, il
   est consommé.
4. Le nouveau mot de passe suit la même politique que l’inscription, et repasse par
   `hashPassword()`. L’ancien cesse instantanément de fonctionner.

### 4.4 Confirmation d’adresse

- Code faux → le compteur d’essais augmente, le message donne le nombre d’essais restants.
- Code expiré → demander un nouveau code (immédiatement affiché).
- Changer d’adresse → contrôle d’unicité dans ce navigateur, nouvelle empreinte, ancien code
  invalidé.
- Adresse déjà confirmée → l’écran le dit, sans reproposer un code.

---

## 5. Ce que le dispositif garantit — et ce qu’il ne garantit pas

**Vrai (et vérifié par les tests) :**

- le mot de passe n’est jamais conservé en clair ;
- le sel est différent pour chaque compte, et l’empreinte n’apparaît jamais dans la vue
  publique (`publicAccount()` ne transporte ni `password`, ni `verification`, ni `reset`) ;
- les comparaisons d’empreintes se font à longueur constante (`safeEqual`) ;
- les codes et jetons expirent, et le nombre d’essais est compté ;
- toute donnée relue du stockage est validée champ par champ : un enregistrement abîmé est
  écarté au lieu de casser l’écran ;
- un échec d’écriture (quota, navigation privée) est détecté après l’inscription et annoncé ;
- aucune donnée n’est envoyée à un serveur — il n’y en a pas.

**Faux, et jamais suggéré par l’interface :**

- ce n’est **pas** une sécurité serveur : quiconque accède à ce navigateur accède au
  stockage, et peut lire les données du compte (jamais le mot de passe en clair, mais les
  codes en attente) ;
- il n’y a pas de limitation de débit côté serveur, pas de journal d’accès, pas de révocation
  centralisée ;
- vider les données du navigateur efface le compte — le compte et l’appareil ne sont pas
  dissociables, ce que `/mot-de-passe-oublie` dit explicitement quand l’adresse est inconnue ;
- aucun e-mail n’est envoyé, donc aucune des protections qui reposent sur la boîte e-mail
  (reprise de compte, alerte de connexion) n’existe ici.

---

## 6. Où brancher l’API

Le point de couture est volontairement étroit — une seule couche parle au stockage :

| Fichier | Rôle | Ce qu’il faudra changer le jour de l’API |
| --- | --- | --- |
| `lib/auth.ts` | Règles pures : rôles, champs, validations, politique de mot de passe, codes | Rien. Les règles restent côté client pour le confort, et seront rejouées côté serveur. |
| `lib/accounts.ts` | Stockage local, hachage, lecture tolérante, session | Remplacer les fonctions d’écriture/lecture par des appels réseau ; `parseAccounts()` reste utile pour la relecture d’un cache. |
| `components/providers/AuthProvider.tsx` | Les 8 actions (`signUp`, `signIn`, `signOut`, `verifyEmail`, `resendVerification`, `changeEmail`, `requestPasswordReset`, `resetPassword`) | Le corps des actions devient un `fetch` ; la signature et les issues (`ok`, `message`, `fields`) ne bougent pas — les écrans n’ont pas à changer. |
| `components/auth/*` | Présentation, champs, messages | Rien, sauf retirer `PilotCode` et le texte d’affichage du code. |

Le jour où un serveur existe, les trois seules phrases à retirer sont celles du pilote — et
`PilotCode` avec elles. C’est exactement ce que promettent les écrans.

---

## 7. Accessibilité

- Chaque champ a un `<label for>` réel, et `aria-describedby` ne référence **que** des
  identifiants rendus — l’audit du site refuse toute référence orpheline.
- Une erreur n’est jamais seulement colorée : texte + `aria-invalid` + message relié au champ.
  Le résumé d’erreur est un `role="alert"`, et le premier champ fautif reçoit le focus.
- Le choix du rôle est un vrai groupe de boutons radio (flèches du clavier, annonce
  « 2 sur 3 ») présenté en cartes.
- L’afficheur de mot de passe est un bouton `aria-pressed` dont le libellé nomme le champ
  (« Afficher — Confirmer le mot de passe »).
- La robustesse du mot de passe est donnée en texte (« Solide »), en plus des segments ; la
  liste des critères est la même que celle qui valide.
- Le code à six chiffres reste un champ unique (`inputMode="numeric"`,
  `autocomplete="one-time-code"`) : collage et lecteurs d’écran fonctionnent sans traitement
  particulier.
- `prefers-reduced-motion` : aucune animation ajoutée par les écrans de compte en dehors des
  transitions déjà couvertes globalement.
- Les messages d’état utilisent les quatre pigments sémantiques (`--info`, `--success`,
  `--warning`, `--error`) assertés AA depuis la phase 2, dans les deux thèmes.

---

## 8. Ce qui est testé

`npm test` (45 tests, dont 9 pour la phase 4) couvre, sans navigateur :

- les trois rôles et leurs jeux de champs réellement distincts, libellés et options compris ;
- la politique de mot de passe : longueur, casse, chiffre, symbole, et le refus d’un mot de
  passe qui reprend prénom, nom ou adresse ;
- l’inscription complète des trois rôles, avec les refus attendus (champs vides, formats
  douteux, consentements non cochés, IFU et RCCM contrôlés seulement s’ils sont renseignés) ;
- les codes : longueur, génération déterministe, expiration, verrouillage après cinq essais ;
- le stockage : relecture tolérante, normalisation des adresses, nettoyage du profil, refus
  des enregistrements incomplets, expiration de session ;
- le hachage : empreinte différente par sel, vérification correcte/incorrecte, comparaison à
  longueur constante ;
- le parcours de bout en bout : inscription → code → vérification → mot de passe changé →
  ancien mot de passe refusé.

Ce qui reste à vérifier dans un vrai navigateur (voir `docs/QA-MOTION.md`) : le rendu des
cinq écrans, le geste tactile sur le sélecteur de rôle, l’hydratation sans accroc, et le
parcours au lecteur d’écran.
