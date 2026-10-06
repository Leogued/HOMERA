# HOMERA — Prochaines étapes pour achever le produit

Document de pilotage. Il part de l’état réellement vérifié le **6 octobre 2026**, puis liste
ce qui reste à faire pour passer du prototype à un service utilisable par de vrais
utilisateurs au Bénin (Cotonou, montants en FCFA).

---

## 1. État vérifié ce jour

| Vérification | Commande | Résultat |
| --- | --- | --- |
| Style | `npm run lint` | 0 erreur, 0 avertissement |
| Types | `npx tsc --noEmit` | OK |
| Tests | `npm test` | **59 / 59** |
| Build production | `npm run build` | Succès (~30 s), 48 routes |
| HTML prérendu | analyse de `.next/server/app/**/*.html` | **106 / 106** pages sans nœud texte blanc sous `<html>`, `</body></html>` contigus |
| HTML servi | `next start` sur 8 routes clés (`/`, `/client`, `/client/visites/nouvelle`, `/explorer`, `/proprietaire`, `/agent`, `/admin`, `/messages`) | Structure conforme, aucune date précalculée côté serveur |
| Audit HTTP | `npm run audit:home` | 161 URL publiques, 1 791 identifiants, **0 lien interne cassé**, accueil / catalogue / CSS conformes |
| Erreur console signalée | *« In HTML, whitespace text nodes cannot be a child of \<html\> »* | **Corrigée** (voir le commit `fix(hydration): supprimer les nœuds texte blancs sous <html>`) et bloquée par le test n° 59 |

Deux causes distinctes ont été corrigées :

1. `app/layout.tsx` contenait des espaces JSX explicites (`{" "}`) entre `<html>`, `<body>` et
   les fournisseurs de contexte — React refusait ces nœuds texte et cassait l’hydratation.
2. `components/workspace/ClientJourneys.tsx` calculait la date « demain » pendant le rendu :
   le serveur et le navigateur pouvaient produire deux dates différentes (fuseaux), ce qui
   provoquait une seconde divergence d’hydratation. La date est désormais calculée après
   montage (`useMounted()`), et `chosenDate` sert de source unique (validation, envoi,
   notification, récapitulatif, `min`/`value` du champ).

> Code source : environ 21 900 lignes TypeScript/TSX, 48 pages, 4 espaces (client,
> propriétaire, agent, admin) + site public.

---

## 2. Ce qui est livré, ce qui manque

| Brique | État dans le prototype | Ce qui manque pour la production |
| --- | --- | --- |
| Navigation, pages, design system | Complet (routes réelles par fonctionnalité) | — |
| Espaces par rôle | Complets à l’écran (client, propriétaire, agent, admin) | Rôles appliqués côté serveur, pas seulement à l’écran |
| Comptes | Démo locale (`admin/admin`, `user/user`, `agent/agent`, `prop/prop`) | Identité serveur, mots de passe hachés, sessions httpOnly, vérification d’e-mail |
| Données | `localStorage` du navigateur (`homera.*`) | Base de données, API, synchronisation entre appareils |
| Visites, demandes, contrats | Fonctionnels en local | Enregistrement serveur, notifications, e-mails |
| Autorisations agent | Affichage + page de vérification + récapitulatif `.txt` | Mandat PDF téléversé, portée vérifiée par référence exacte, expiration, QR code |
| Suppression de compte | Bouton **désactivé**, texte explicite | Service d’identité serveur + effacement réel + export des données |
| Changement de propriétaire | Non journalisé | Événement horodaté (auteur, ancien/nouveau, motif) |
| Paiements | Absents | Encaissement Mobile Money / carte |

---

## 3. Étape 1 — Socle serveur (P0, bloquant pour un vrai lancement)

### 1.1 Base de données et API

- **Objectif** : les dossiers, biens, visites, demandes, contrats et autorisations vivent sur
  le serveur et sont identiques sur tous les appareils.
- **Périmètre** : `app/api/**` (ou *server actions*), `lib/db/`, schéma `Property`, `User`,
  `Visit`, `Application`, `Contract`, `Authorization`, `Event`, migrations, jeu de données de
  démonstration rejouable.
- **Choix techniques suggérés** : PostgreSQL managé (Neon / Supabase / Railway) + Prisma ou
  Drizzle ; validation des entrées côté serveur (Zod) ; pagination et filtres côté base.
- **Critère d’acceptation** : deux navigateurs différents voient la même visite créée ;
  recharger la page ne perd rien ; un utilisateur A ne peut pas lire ni modifier les données
  d’un utilisateur B, même en appelant l’API directement.
- **Effort indicatif** : 10–15 jours-homme.

### 1.2 Identité, sessions, e-mails

- **Objectif** : remplacer les comptes de démonstration par une vraie authentification.
- **Périmètre** : inscription, connexion, « mot de passe oublié », vérification d’e-mail,
  hachage argon2id/bcrypt, jetons signés à durée limitée, limitation du débit (rate limiting),
  cookies `httpOnly` + `SameSite`, e-mails transactionnels (Resend, Postmark ou SMTP local).
- **Critère d’acceptation** : un compte créé par l’inscription reçoit un e-mail de
  vérification ; sans vérification, l’accès aux espaces est refusé ; les mots de passe ne
  sont jamais stockés en clair ; 10 tentatives de connexion échouées bloquent temporairement.
- **Effort indicatif** : 6–9 jours-homme.

### 1.3 Autorisations agents (cœur de la promesse HOMERA)

- **Objectif** : qu’un client puisse vérifier l’autorisation exacte d’un agent pour une
  référence précise, comme la page `/verification-agent` le promet déjà.
- **Périmètre** : téléversement du mandat PDF (stockage objet : S3/Cloudflare R2), champs
  `agentId`, `propertyRef`, `scope`, `authorizedAt`, `expiresAt`, vérification de l’unicité
  *agent × référence*, expiration automatique, QR code menant à la page publique alimentée
  par la base, révocation traçable.
- **Critère d’acceptation** : une autorisation expirée ou révoquée bascule immédiatement en
  « non autorisé » sur la page publique ; le QR scanné ouvre la fiche exacte du bien.
- **Effort indicatif** : 6–8 jours-homme.

### 1.4 Documents réels (PDF) et signatures

- **Objectif** : remplacer le récapitulatif `.txt` et l’impression du navigateur.
- **Périmètre** : génération PDF serveur (mandat, récapitulatif d’autorisation, contrat de
  location, quittance), versionnage, empreinte de contrôle ; signature électronique si le
  cadre juridique retenu l’exige.
- **Critère d’acceptation** : le document généré porte la référence, la date, l’agent, la
  portée et un identifiant vérifiable ; une nouvelle version ne remplace pas l’ancienne.
- **Effort indicatif** : 4–6 jours-homme.

### 1.5 Cycle de vie du compte (obligation légale)

- **Objectif** : activer le bouton de suppression aujourd’hui désactivé et couvrir les droits
  d’accès, de portabilité et d’effacement.
- **Périmètre** : désactivation réversible, suppression définitive après délai de rétention,
  export des données (JSON/PDF), registre des consentements, purge des pièces, journal
  d’audit des demandes.
- **Critère d’acceptation** : une demande de suppression supprime le compte et ses données
  personnelles dans le délai annoncé, tout en conservant les obligations comptables ; la
  demande est confirmée par e-mail.
- **Effort indicatif** : 4–6 jours-homme.

### 1.6 Journal d’événements par bien

- **Objectif** : alimenter `/historique/[reference]` avec de vrais faits.
- **Périmètre** : événements typés (mise en ligne, changement de prix, changement d’agent,
  **changement de propriétaire**, mandat expiré, visite, contrat) avec auteur, horodatage et
  valeurs avant/après ; le tout immuable.
- **Critère d’acceptation** : un transfert de propriété apparaît dans l’historique du bien
  avec l’ancien et le nouveau titulaire, et reste consultable par l’admin.
- **Effort indicatif** : 3–5 jours-homme.

### 1.7 Encaissement (Mobile Money Bénin)

- **Objectif** : frais d’agence, cautions, loyers ou abonnements agent.
- **Périmètre** : intégration d’un agrégateur local — **FedaPay** ou **KkiaPay** (MTN MoMo,
  Moov Money, cartes) ; webhooks signés, idempotence, reçus, rapprochement comptable.
- **Critère d’acceptation** : un paiement test aboutit, un paiement annulé ne crée aucune
  écriture, le reçu contient la référence de la transaction.
- **Effort indicatif** : 5–8 jours-homme.

---

## 4. Étape 2 — Qualité, sécurité, conformité (P1)

| Chantier | Contenu | Critère d’acceptation | Effort |
| --- | --- | --- | --- |
| Tests E2E | Playwright sur les parcours clés × 4 rôles, en desktop **et** mobile | Parcours inscription → visite → demande → contrat vert sur les deux formats | 5–7 j |
| Accessibilité | Navigation clavier complète, `axe-core` en CI, lecteur d’écran (NVDA/VoiceOver), contrastes, `aria-live` sur les notifications | 0 violation critique ; tout le parcours faisable au clavier seul | 4–6 j |
| Console navigateur | Vérifier **zéro** erreur/avertissement sur chaque route (impossible dans cet environnement : Chromium absent) | Rapport de console vide sur les 48 routes | 1–2 j |
| Sécurité | CSP, en-têtes de sécurité, audit de dépendances, secrets en variables d’environnement, sauvegardes + restauration testée | Restauration réussie depuis une sauvegarde | 4–6 j |
| Observabilité | Journaux structurés, Sentry (ou équivalent), supervision de disponibilité, alertes | Une erreur 500 déclenche une alerte en moins de 5 min | 3–4 j |
| Déploiement & CI | Environnements *staging* / production, migrations versionnées, aperçus par branche, domaine, `sitemap.xml`, `robots.txt` | Déploiement automatique sur fusion, retour arrière en une commande | 3–5 j |
| Conformité & confiance | Mentions légales réelles (société, RCCM, IFU), CGU, politique de confidentialité validée, KYC des agents, modération et signalement d’annonce | Documents juridiques publiés et référencés dans le pied de page | variable (juriste) |

---

## 5. Étape 3 — Croissance (P2, après la mise en service)

1. **Messagerie et notifications temps réel** (`/messages`, `/notifications` existent déjà à
   l’écran) : SSE ou WebSocket + e-mails de synthèse.
2. **Recherche serveur** : indexation, tri, pagination, recherches sauvegardées côté compte.
3. **Favoris synchronisés** au compte (aujourd’hui stockés dans le navigateur uniquement).
4. **Comparateur de favoris** — demandé comme optionnel, à faire en dernier.
5. **Alertes** « nouveau bien correspondant à vos critères », notifications push/PWA.
6. **Multi-langue** (français/anglais) et internationalisation des montants.
7. **Visite virtuelle** (galerie 360°/plan), optimisation des images et budget de performance.
8. **Espace agence** multi-agents (plusieurs agents par agence, quotas, statistiques).
9. **Tableau de bord analytique** bailleur/agence (vues, contacts, délais).

---

## 6. Ordre recommandé

| Tranche | Contenu | Dépend de | Durée indicative |
| --- | --- | --- | --- |
| **T1** | 1.1 base de données + API biens/dossiers/visites | — | 2–3 semaines |
| **T2** | 1.2 identité + e-mails, puis 1.5 cycle de vie du compte | T1 | 2 semaines |
| **T3** | 1.3 autorisations PDF + QR, 1.6 journal d’événements | T1, T2 | 2 semaines |
| **T4** | 1.4 documents PDF, tests E2E + accessibilité | T1–T3 | 2 semaines |
| **T5** | 1.7 paiements, sécurité, observabilité, déploiement | T1–T4 | 2–3 semaines |
| **T6** | Étape 3 (croissance) | T1–T5 | en continu |

Le prototype actuel reste utilisable comme **maquette de démonstration** pendant tout ce
temps : rien de ce qui est livré ne doit être jeté, les écrans deviennent simplement branchés
sur des données réelles.

---

## 7. Limites de la vérification du 6 octobre 2026

À dire clairement, pour que personne ne confonde « testé » et « supposé » :

- **Console du navigateur** : non reproductible ici (aucun Chromium/Playwright installé).
  L’erreur d’hydratation signalée a été corrigée **à la source** et un test permanent la
  bloque, mais un passage final dans un vrai navigateur reste nécessaire (§ 4).
- **Tests visuels, tactiles, clavier et lecteur d’écran** : non exécutés ici. Les audits
  réalisés sont des vérifications HTTP/HTML/CSS et des tests de style et de structure.
- **Liens dynamiques** (`/services/[slug]`, `/legal/[slug]`, `/historique/[reference]`,
  `/biens/[id]`) : validés **par motif** sur les données existantes, pas exhaustivement sur
  toutes les combinaisons possibles.
- **Documents d’autorisation** : récapitulatif en texte brut `.txt`, pas un PDF signé.
- **Suppression de compte** : indisponible (bouton désactivé, mention explicite dans l’écran).
- **Changement de propriétaire** : affiché, non enregistré comme événement.
- **Aucun appel réseau applicatif** : pas de `fetch`, pas de dossier `app/api` — tout le
  parcours est local au navigateur.

---

## 8. Prochaine tranche proposée (au choix)

1. **Socle serveur minimal** (recommandé) : base de données + API pour les biens, les visites
   et les demandes, avec une vraie page `/client/visites` branchée dessus. C’est la tranche
   qui change la nature du produit ; tout le reste en dépend.
2. **Autorisations vérifiables** : mandat PDF, unicité agent × référence, expiration, QR code
   et journal d’événements — la promesse la plus différenciante de HOMERA.
3. **Conformité immédiate** : suppression/désactivation de compte, export des données, pages
   légales réelles — utile même avant l’ouverture au public.
