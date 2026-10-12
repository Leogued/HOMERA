# HOMERA — Socle serveur (LOTS 2 à 5)

Ce document décrit **ce qui existe réellement** dans le dépôt. Il est la référence
pour tout ce qui touche aux données, à l’authentification, aux permissions et à la
sécurité. Toute évolution du socle doit être répercutée ici dans le même geste que
le code.

Date de dernière mise à jour : **12 octobre 2026** (fin du LOT 2).

---

## 1. Choix structurant : une seule source de vérité

| Avant le LOT 2 | Depuis le LOT 2 |
|---|---|
| Comptes, rôles, visites, demandes, notifications dans `localStorage` | Tout vit dans la base SQLite du serveur |
| Le navigateur décidait qui pouvait voir quoi | Le serveur décide avant le rendu |
| Aucune API | 33 routes `/api/**` + 7 services métier |
| Aucune trace | `audit_log` immuable, horodaté, signé par son auteur |

**Pourquoi SQLite et pas un service externe :** Supabase n’est pas configuré dans ce
dépôt. Introduire un deuxième backend aurait ajouté une dépendance réseau, des
secrets et une seconde source de vérité — exactement ce que le cahier des charges
interdit. Le schéma est écrit pour rester portable : types simples, contraintes
explicites, aucune fonction SQLite exotique, dates en ISO 8601 UTC.

> Conséquence assumée : le socle est mono-instance. Le passage à PostgreSQL se fera
> par remplacement de `lib/server/db/client.ts` et des types de colonnes, pas par une
> réécriture des services.

---

## 2. Base de données

**Fichier :** `homera/data/homera.db` — généré au premier accès, jamais versionné
(`homera/.gitignore` → `/data`).

**Ouverture :** `getDb()` dans `lib/server/db/client.ts` — connexion paresseuse,
migrations appliquées puis données d’amorçage insérées si la base est vide.

**Migrations :** `lib/server/db/migrations.ts`. Une migration = un identifiant, un nom,
un seul script SQL exécuté d’un bloc. Version `001` en place ; la table
`schema_migrations` garde l’historique.

Règles tenues, et à tenir pour toute migration future :

* **aucune migration destructive** : pas de `DROP`, pas de suppression de colonne sans
  procédure écrite et sauvegarde ;
* **idempotence** : tout est en `CREATE TABLE IF NOT EXISTS`, rejouable sans casse ;
* **identifiants lisibles** : `HOM-CTN-000421`, `VIS-0001`, `TOK-…` ;
* **dates** : chaînes ISO 8601 UTC, jamais d’heure locale.

### 2.1 Les 28 tables

| Domaine | Tables |
|---|---|
| Identité | `users`, `user_roles`, `user_profiles`, `sessions`, `auth_tokens`, `login_attempts` |
| Intermédiaires | `agencies`, `agents` |
| Biens | `properties`, `property_features`, `property_photos`, `property_availability`, `property_reports`, `visit_slots`, `documents` |
| Mandats | `authorizations`, `authorization_events` |
| Visites & location | `visits`, `visit_events`, `rental_applications`, `contracts` |
| Vérification | `verifications`, `verification_steps` |
| Vie du compte | `notifications`, `favorites`, `locations` |
| Journal | `audit_log` |

`locations` porte la hiérarchie béninoise : pays → département → commune →
ville/arrondissement → quartier.

### 2.2 Amorçage

`lib/server/db/seed.ts` — idempotent, alimenté par `lib/content.ts` :
**36 biens**, 5 comptes de démonstration, une agence, des agents, 3 mandats, une visite
et des créneaux. `npm run db:reset` recrée la base de zéro.

---

## 3. Authentification

| Brique | Fichier | Ce qui est fait |
|---|---|---|
| Mots de passe | `lib/server/security/password.ts` | **scrypt** avec sel et paramètres stockés par utilisateur ; `hashPasswordSync` réservé à l’amorçage |
| Jetons | `lib/server/security/tokens.ts` | codes à 6 chiffres et jetons opaques ; **seul le SHA-256 est conservé** en base |
| Sessions | `lib/server/security/session.ts` | jeton opaque en base, cookie `homera_session` `httpOnly` + `SameSite=Lax` (+ `Secure` en production) ; 1 jour par défaut, 30 jours avec « rester connecté » |
| Pont cookie → droits | `lib/server/auth/current.ts` | `currentUser()` lit le cookie, vérifie la session en base, charge les rôles |
| Garde des pages | `lib/server/auth/guard.ts` | `guardWorkspace()` → `ok` / `signin` / `denied` |

### 3.1 Ce qui est volontairement absent

* **Aucun e-mail transactionnel.** Le pilote n’a pas de service d’envoi : les codes de
  vérification et de réinitialisation sont **affichés à l’écran** et le contrat le dit
  (`emailSent: false`). Prétendre à un envoi serait un mensonge d’interface.
* **Aucun fournisseur d’identité externe.**

### 3.2 Protections actives

* **Anti-force brute** : `login_attempts`, fenêtre glissante de 15 minutes, blocage
  temporaire, message qui dit combien d’essais restent.
* **Tentatives de code limitées** : 5 essais par code de vérification ou de
  réinitialisation, puis le jeton est invalidé.
* **Changement de mot de passe** : toutes les sessions ouvertes sont révoquées.
* **Rotation de session** : un nouveau jeton est émis à chaque connexion.

---

## 4. Rôles et permissions

`lib/server/authz.ts` est l’unique endroit où une décision d’accès est prise.

### 4.1 Rôles

| Rôle | Nature | Attribution |
|---|---|---|
| `client` | socle, automatique à l’inscription | serveur |
| `proprietaire` | rôle métier | demandé depuis le compte, validé côté serveur |
| `agent` | rôle métier | sur invitation de propriétaire (mandat) ou inscription agent |
| `admin` | habilitation | **table `user_roles`, jamais le profil** |
| `superadmin` | habilitation | idem |

> Correctif important du LOT 2 : avant, `hasWorkspaceAccess()` accordait
> l’administration quand `profile.demoRole === "admin"` — un champ que le navigateur
> pouvait écrire. La décision vient désormais de la base. Côté client,
> `PublicAccount.admin` / `.superAdmin` sont des **copies de la décision serveur**,
> jamais la source.

### 4.2 Espaces

`accessibleWorkspaces(roles)` et `defaultLanding(roles)` rendent la liste des espaces
réellement ouverts et la destination d’atterrissage. `canAccessWorkspace(roles, cible)`
est la brique de la garde serveur.

### 4.3 Droits sur un bien

`canEditProperty`, `isPropertyOwner`, `canHandleVisits`, `canModerate`,
`canManageRoles` : un agent ne voit **que** les biens couverts par un mandat **actif**
(vérifié en base, pas déclaré par l’interface), un propriétaire que les siens,
l’administration tout mais avec journalisation.

---

## 5. Garde des pages et des routes

Trois niveaux, complémentaires :

1. **`middleware.ts`** — présence du cookie de session sur `/client`, `/proprietaire`,
   `/agent`, `/admin`, `/messages`, `/notifications`. Redirige vers
   `/connexion?next=…` et pose `Cache-Control: no-store`. Il ne juge pas du rôle :
   il n’a pas accès à la base.
2. **Garde de page** (`guardWorkspace`) — dans **21 pages** serveur. Trois issues :
   `ok` (rendu), `signin` (redirection avec la destination demandée), `denied`
   (écran `WorkspaceRefusal`, aucun chargement de l’espace, donc aucune fuite).
3. **Garde d’API** — `currentUser()` + contrôle de rôle dans chaque route ; réponses
   `401` (pas de session) ou `403` (rôle insuffisant).

Le paramètre de retour est `next`, assaini par `safeReturnTo()` (`lib/nav.ts`) : jamais
d’adresse externe, jamais de boucle sur l’authentification.

### 5.1 Matrice d’accès mesurée

Vérifiée par requêtes HTTP réelles le 12 octobre 2026 (voir §8) :

| Compte | `/client` | `/proprietaire` | `/agent` | `/admin` |
|---|---|---|---|---|
| client | OK | refus | refus | refus |
| propriétaire | OK | OK | refus | refus |
| agent | OK | refus | OK | refus |
| administration | OK | refus | refus | OK |

---

## 6. API

33 routes sous `homera/app/api/**`. Toutes rendent une enveloppe unique
(`lib/server/http.ts`) :

```json
{ "ok": true,  "data": { } }
{ "ok": false, "message": "…", "code": "…", "fields": { "champ": "…" } }
```

`fromService()` traduit l’issue d’un service en statut HTTP : `401`, `403`, `404`,
`409`, `429`. Les erreurs de validation gardent **le message par champ** produit par
Zod, affiché tel quel par l’interface — jamais reformulé, jamais masqué.

| Groupe | Routes |
|---|---|
| Compte | `auth/session`, `auth/signup`, `auth/signin`, `auth/signout`, `auth/roles`, `auth/verify-email`, `auth/password/forgot`, `auth/password/reset`, `me` |
| Biens | `properties`, `properties/[id]`, `properties/[id]/photos`, `properties/[id]/documents`, `properties/[id]/availability`, `properties/[id]/visits`, `properties/[id]/submit`, `properties/[id]/report` |
| Espaces | `owner/properties`, `agent/properties` |
| Mandats | `authorizations`, `authorizations/[id]` |
| Visites | `visits`, `visits/[id]` |
| Administration | `admin/overview`, `admin/users`, `admin/users/[id]`, `admin/verifications`, `admin/verifications/[propertyId]`, `admin/visits`, `admin/reports`, `admin/audit` |
| Vie du compte | `notifications`, `favorites` |

**Validation** : `lib/server/validation.ts` (Zod 4). Les schémas sont exécutés **dans
les services**, pas dans les routes : une écriture directe en base passe par les mêmes
contrôles qu’un appel HTTP.

---

## 7. Services métier

`homera/lib/server/services/` — sept modules, une seule règle : ils rendent une issue
explicite (`ServiceResult`), jamais d’exception, jamais d’état inventé.

| Service | Responsabilité |
|---|---|
| `accounts.ts` | inscription, connexion, rôles, vérification d’adresse, mot de passe, invitation agent |
| `properties.ts` | biens, photos, disponibilités, créneaux, soumission au contrôle |
| `authorizations.ts` | mandats propriétaire → agent, statuts et historique |
| `visits.ts` | demandes de visite, cycle de vie, conflits de créneaux |
| `verifications.ts` | dossier de vérification et ses 8 étapes |
| `admin.ts` | indicateurs, comptes, signalements, journal |
| `documents.ts` | pièces déclarées d’un bien |
| `applications.ts` | candidatures de location : dépôt après visite effectuée, instruction motivée |

**Journal** (`lib/server/audit.ts`) : `audit_log` est une table d’ajout pur — action,
auteur, date, entité, détail, IP. Aucun service ne réécrit une ligne existante.

**Notifications** (`lib/server/notifications.ts`) : table `notifications`, dédoublonnage
sur 24 heures (type + titre + entité), compteur de non-lues servi par
`/api/auth/session`. Elles sont produites **par les services**, au moment de l’événement.

---

## 8. Ce qui a été réellement exécuté

Commandes lancées dans `homera/` le 12 octobre 2026, résultats non retouchés :

```
npm run test:backend   →  151 vérifications réussies, 0 échec
node scripts/test-motion.mjs  →  67 tests, 67 pass, 0 fail
npx tsc --noEmit       →  0 erreur
npm run lint           →  0 problème
npm run build          →  Compiled successfully · 104 routes générées
```

Contrôles HTTP sur le serveur de production local (`npm start`), serveur réellement
démarré :

| Vérifié | Résultat |
|---|---|
| 8 espaces protégés sans session | `307` vers `/connexion?next=/…` |
| Connexion des 4 comptes de démonstration | atterrissage `/client`, `/proprietaire`, `/agent`, `/admin` selon les rôles |
| Matrice d’accès (§5.1) | conforme, refus rendu par le serveur |
| API sans session / avec mauvais rôle | `401` puis `403` |
| Inscription incomplète | `200` + messages par champ (`zone`, `budget`, `conditions`…) |
| Inscription complète | `201`, session ouverte, `emailSent: false` |
| Code de vérification faux puis juste | « Code incorrect. Il reste 4 essais. » puis adresse confirmée |
| Attribution du rôle admin depuis le client | refusée — `admin` n’est pas un rôle demandable |
| Filtre « meublé » | 36 biens → 11 biens, tous meublés |
| Déconnexion | session détruite, espace à nouveau protégé |
| Redirection ouverte `?next=//evil.com` | écartée par `safeReturnTo` |
| Référence de bien inconnue `/biens/inexistant` | `404` réel — le squelette de groupe qui renvoyait `200` a été retiré |

### 8.1 Contrôles des LOTS 3 à 5 (même méthode, même jour)

| Vérifié | Résultat |
|---|---|
| Dépôt d’un bien, photos, pièce justificative, soumission | brouillon → `soumis`, dossier de vérification ouvert à `a-examiner` |
| `mediaKey` inconnu à l’ajout d’une photo | refusé — le schéma valide contre le manifeste `lib/media.generated.ts` |
| Type de pièce inconnu | refusé — 10 natures reconnues par le service `documents.ts` |
| Réordonnancement de la galerie | ordre réellement écrit (`media_key` → `id`) et relu |
| Accès aux pièces d’un bien par un agent **non** mandaté | `403` — la fuite constatée a été corrigée dans la route |
| Agent mandaté, propriétaire, administration | `200` sur les mêmes pièces |
| Demande de visite → confirmation → « effectuée » | statuts réels, conflits de créneaux détectés par le serveur |
| Candidature déposée sans visite effectuée | refusée |
| Deux candidatures sur la même visite | la seconde est refusée |
| Refus d’une candidature sans motif | refusé — le motif est transmis au candidat |
| Candidat ou agent non mandaté qui tente d’instruire | refusé |
| Mandat : acceptation par l’agent | le bien apparaît dans `/api/agent/properties`, le propriétaire est notifié |
| Mandat : refus sans motif | refusé |
| Vérification : les 8 étapes, une à une | chaque étape est horodatée, attribuée et journalisée |
| Décision « accepter » | bien `publie` + `verifie`, présent dans le catalogue public, propriétaire notifié |
| Suspension d’une annonce sans motif | refusée ; avec motif : retirée du catalogue public et notifiée |
| Accès à `/api/admin/*` par un non-admin | `403` |

---

## 9. Ce qui reste à faire — et où

Les LOTS 3 (biens, photos, propriétaires, agents, autorisations), 4 (visites,
demandes de location) et 5 (administration, vérification) sont livrés et branchés
sur le serveur. Les éléments suivants sont connus, assumés et **pas** présentés
comme terminés :

| Sujet | État | Lot porteur |
|---|---|---|
| Contrats de location signés | table `contracts` prête, aucun écran ni service de signature | LOT 6/7 |
| Téléversement réel des photos et pièces | tables `property_photos` / `documents` prêtes, le parcours **déclare** les pièces sans les héberger | LOT 8 |
| Favoris unifiés | table `favorites` + `/api/favorites` prêts, deux vues côté interface | LOT 7 |
| Messagerie interne | aucune table de fils de discussion ; la page existe et reste honnête | LOT 7 |
| Paiements | aucun encaissement réel, aucune écriture serveur | hors périmètre pilote |
| Pagination et facettes calculées en base | `/api/properties` existe, l’explorateur filtre encore côté client | LOT 6 |
| Envoi d’e-mails transactionnels | absent, remplacé par l’affichage du code | à décider |
| Fiches pré-rendues | `/biens/[id]` est rendu à la demande (`force-dynamic`) : toujours à jour, jamais de cache périmé. Le prérrendu reviendra avec la pagination serveur. | LOT 6/8 |

### 9.1 Risques ouverts

1. **Mono-instance.** SQLite ne tolère qu’un processus écrivain. Un déploiement sur
   plusieurs instances demandera PostgreSQL avant toute montée en charge.
2. **Données d’amorçage.** Les 36 biens sont des données de démonstration :
   `DEMO_DATA = true` dans `lib/content.ts` et un encart le signale sur les écrans
   concernés. Leur statut « vérifié » est semé, il ne prouve aucun contrôle réel.
3. **Aucun audit de sécurité externe.** Le durcissement appliqué (scrypt, sessions
   opaques, anti-force brute, journal) est solide mais n’a pas été revu par un tiers.
4. **Pas de chiffrement au repos** des pièces justificatives — le stockage n’est pas
   encore ouvert.

---

## 10. Commandes utiles

```bash
cd homera
npm run test:backend   # scénarios métier sur la base (151 vérifications)
npm test               # test-motion.mjs puis test:backend
npm run lint           # ESLint
npx tsc --noEmit       # types
npm run db:reset       # base recréée et réamorcée
npm run build          # build de production
```

---

## 11. Documents liés

* [`AUDIT.md`](./AUDIT.md) — constat de départ (LOT 1) et suivi par lot.
* [`ROADMAP.md`](./ROADMAP.md) — ordonnancement des lots.
* [`AGENTS.md`](./AGENTS.md) — règles de travail et d’écriture du code.
* [`homera/lib/server/db/migrations.ts`](./homera/lib/server/db/migrations.ts) — le
  schéma, seule vérité sur la structure des données.
