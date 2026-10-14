# HOMERA — Proposition d'architecture complète (cible)

> **PROPOSITION — 14 octobre 2026.** Rien de ce document n'est livré : le réel
> est décrit dans [`ARCHITECTURE.md`](./ARCHITECTURE.md), l'historique dans
> [`ROADMAP.md`](./ROADMAP.md) et [`CURRENT_STATE.md`](./CURRENT_STATE.md), le
> socle dans [`BACKEND.md`](./BACKEND.md). Chaque phase ci-dessous se termine en
> basculant des statuts dans `ARCHITECTURE.md`, preuve à l'appui.

## 0. Pourquoi une cible

Le pilote est solide : 4 rôles, 10 services métier, 45 routes API, mandats,
visites, candidatures, contrats à signature simple, messagerie, audit immuable,
batteries au vert (socle 222/0, scénarios 13/13, mouvement 72/72). Les trous
sont connus et nommés : justificatifs déclaratifs, pas d'e-mail, pas d'argent
réel, pas de sauvegardes, pas de production, pas de mobile.

Cette proposition trace le chemin **du pilote au service réel** sans casser ce
qui fait la valeur d'HOMERA : la confiance vérifiable. Elle tranche (PWA avant
natif, monolithe conservé, production avant facturation) et liste ce qui reste
à décider (§10).

## 1. Principes intangibles

1. **Monolithe modulaire conservé** : Next.js (UI + API + services). Pas de
   microservices — coût sans bénéfice à cette échelle.
2. **Le serveur décide** : rôles, permissions, montants, transitions. Le
   navigateur n'est jamais une source de vérité.
3. **Jamais de simulation** : pas de bouton sans opération réelle, pas de
   montant inventé, états vides honnêtes. Tout écart est un bug.
4. **L'argent suit la doctrine** (`AGENTS.md` § modèle économique) : pour chaque
   paiement — qui paie, qui reçoit, pourquoi, quand, combien, quels frais,
   quels splits, quels statuts (`en attente → disponible → retiré`), qui voit,
   qui retire. Autorisation sur un bien ≠ droit à recevoir de l'argent.
5. **Le bouton « Payer » a 5 conditions** : opération existante, montant et
   bénéficiaire déterminés, workflow autorisant, conditions remplies — et un
   libellé contextualisé (« Payer le dépôt de garantie · 700 000 FCFA »).
6. **Mesurer avant de dimensionner** : SQLite, fichiers locaux et file
   minimale tant que les critères tiennent ; migration sur seuils, jamais par
   dogme.
7. **Test de nécessité** : chaque ajout doit survivre à « et si on ne le
   faisait pas ? ». Voir §9 (non-objectifs).
8. **Bénin d'abord** : FCFA, Mobile Money (MTN, Moov), français, hiérarchie
   département/commune/quartier, loi 2017-20 (Code du numérique) et APDP.

## 2. Vue d'ensemble

```text
Clients                          Monolithe Next.js (à garder)
┌────────────┐                   ┌─────────────────────────────────┐
│ Web (RÉEL) │──┐                │ UI : 9 scènes, Explorer + carte │
└────────────┘  │                │      SVG, fiches, 4 espaces     │
┌────────────┐  │   HTTPS        │ API : 45 routes → /api/v1       │
│ PWA (P6)   │──┼───────────────▶│ Services : 10 réels + livre     │
└────────────┘  │                │   d'opérations, e-mail, jobs    │
┌────────────┐  │                │ Traçabilité : audit_log,        │
│ Natif (P6, │──┘                │   authorization_events          │
│ si critères)                   └──┬────────────┬────────────┬────┘
                                    ▼            ▼            ▼
                              SQLite → PG   Fichiers →   Externes :
                              (WAL, puis    objet S3     e-mail,
                              critères §5)  (critères)   agrégateur MM
Transverse : CI/CD, sauvegardes testées, supervision, secrets, APDP.
```

## 3. Clients

### 3.1 Web — garder et étendre (RÉEL → enrichi)

Le site reste le client principal : accueil 9 scènes, Explorer (filtres,
facettes, carte SVG des communes), fiches, favoris serveur, 4 espaces.
Extensions prévues : alertes de recherche côté serveur (aujourd'hui en
navigateur), lecture hors-ligne légère, devise d'affichage secondaire (€
indicatif) pour la diaspora.

### 3.2 PWA — recommandée avant tout natif (P6)

Manifest, icônes, installation, notifications push (VAPID), cache de lecture.
Une PWA couvre 90 % du besoin mobile pour ~5 % du coût d'applications natives,
sans double codebase ni publication en magasin.

### 3.3 Natif — dernier recours, sur critères (P6)

Déclencheurs **explicites** : présence en magasin exigée par le marché, push
non fiables sur terminaux d'entrée de gamme, géolocalisation de fond.
Prérequises : `/api/v1` gelée, e-mail et argent stabilisés. Sans ces critères
réunis : ne pas construire.

### 3.4 Diaspora — traiter tôt, pas cher

Fuseaux, rappel d'échéances par e-mail (P3), signature simple à distance
(déjà possible), affichage € indicatif. Aucune architecture spécifique.

## 4. Backend — modules à construire

| # | Module | État | Proposition | Preuve de sortie |
|---|---|---|---|---|
| M1 | Justificatifs réels | À FINALISER | `multipart` étendu depuis l'upload photo : types/poids/nombre contrôlés, quota par bien, pièces réservées aux mandatés (`403`, pattern existant), cycle admin 8 étapes (demande de pièces, déjà réel), purge/retention | Fichiers reçus, servis, supprimés avec la pièce ; tests |
| M2 | E-mail réel | CIBLE | Fournisseur au choix (SMTP frugal ou API selon délivrabilité), **file persistée + relances**, gabarits versionnés, préférences (désinscription notifs), journal d'envoi | Code reçu par e-mail, digest reçu, journal consultable |
| M3 | Livre d'opérations + Mobile Money | CIBLE | **Table `operations`** : qui paie/reçoit, motif, montant, frais, splits (HOMERA/propriétaire/agent), statuts `en attente → disponible → retiré`, **clés d'idempotence**, webhooks signés, rapprochement. Opérations du workflow : frais de visite (si tranché), réservation, loyer, dépôt de garantie, abonnements. Retraits vers Mobile Money. Évaluer **en sandbox** un agrégateur béninois (**FedaPay** ou **KkiaPay** : MTN + Moov + cartes, ~1,5–3 %, onboarding < 1 semaine) avant tout branchement direct opérateur (MTN 2–8 semaines, Moov limité) [1](https://www.pirabellabs.com/blog/paiement-en-ligne-mobile-money-afrique-ouest-2026) [2](https://orystack.com/integration-des-apis-mobile-money-en-afrique-de-louest-guide-technique-pour-les-equipes-produit/) [3](https://elimboo.com/meilleurs-agregateurs-paiement-afrique/) | 1re opération sandbox rapprochée, puis 1re réelle ; test anti-simulation |
| M4 | Abonnements pro | CIBLE | **Trancher le modèle avant tout code** (gratuit ? au mandat ? à la visibilité ?). La page actuelle est une maquette honnête (sélection locale, « aucun prélèvement réel », devis). Si oui : plans, facturation, suspension pour impayé | Modèle écrit, puis 1er cycle facturé |
| M5 | Recherche plein texte + alertes | CIBLE | FTS5 (zéro dépendance) puis `tsvector` à la migration PG ; alertes serveur + e-mail/push | Requête floue pertinente, alerte reçue |
| M6 | Cartes | RÉEL→CIBLE | Garder la SVG (RÉEL). Si géolocalisation précise : **Leaflet + OSM auto-hébergeables** (coût nul, pas de clé) ; exclure les tuiles payantes à clé | Carte au besoin prouvé |
| M7 | Jobs planifiés | CIBLE | Minimal d'abord : route protégée + cron système + verrou DB (expirations mandats/créneaux/codes, relances, digest). Redis/BullMQ seulement si insuffisant | Expirations automatiques tracées |
| M8 | Signature qualifiée | CIBLE (option) | Non par défaut : garder la signature simple + traçabilité. Oui si notaire/juridique l'exige | Besoin juridique écrit |
| M9 | Modération | RÉEL→étendre | Signalements existants ; ajouter sanctions graduées et Historique si le volume l'exige | File traitée, délais tenus |

## 5. Données

### 5.1 SQLite → PostgreSQL : critères, pas de date

Garder SQLite (WAL, FK, `busy_timeout`) tant que : un seul écrivain
applicatif, latences OK, sauvegardes fichier suffisantes. Migrer si **au moins
un** critère : écritures concurrentes mesurées au-delà du confort, 2e instance
applicative, recherche plein texte insuffisante, sauvegardes managées exigées.
Le schéma est déjà portable (types simples, UTC ISO) : interdire les fonctions
exotiques d'ici là.

### 5.2 Fichiers : local → objet sur critères

`data/uploads/` + `/api/uploads/…` tant qu'instance unique. Basculer vers
stockage objet S3-compatible si : multi-instance, volume au-delà du disque, ou
CDN requis. Préparer une abstraction « media store » **avant** la migration ;
URLs signées à durée courte pour les pièces privées.

### 5.3 Sauvegardes (dès la production)

Dump quotidien chiffré + synchronisation des fichiers, copies séparées,
**restauration testée** (runbook rejoué, pas supposé). Une sauvegarde non
testée n'est pas une sauvegarde.

### 5.4 Droits et rétention — APDP (loi 2017-20)

Le Bénin dispose d'une autorité indépendante, l'**APDP** (ex-CNIL), créée par
la loi 2017-20 portant Code du numérique : droits d'accès, d'opposition, de
rectification et d'effacement, pouvoir d'injonction
[1](https://fr.linkedin.com/pulse/lapdp-et-la-protection-des-donn%C3%A9es-personnelles-au-b%C3%A9nin-apdpbenin).
En découlent : export de compte, suppression de compte (droit à l'effacement),
durées de conservation par table, registre des traitements, consentements
(cookies, notifications), page de contact « mes données ».

## 6. API et intégrations

- **Versioning** `/api/v1` dès qu'un client stable externe l'exige (PWA
  avancée, natif) ; contrats Zod partagés, existants, conservés.
- **Limitation de débit** : auth et envois d'abord, puis global.
- **Idempotence** : clés client sur toute opération financière (M3).
- **Webhooks entrants** (Mobile Money) : signature vérifiée, rejeu idempotent,
  journalisation ; jamais de confiance aveugle.
- **Erreurs homogènes** : pattern `fail()` existant (401/403 explicites).

## 7. Infrastructure

### 7.1 Environnements

`dev` (local) → `staging` (miniature de prod : migrations réelles, données
anonymisées) → `prod`. **Données de démonstration interdites en production.**

### 7.2 Hébergement : contrainte structurante

Backend **stateful** (SQLite + uploads locaux) : il faut des **volumes
persistants**. Sont donc **exclus sans refonte du stockage** les hébergeurs
serverless sans persistance (type Vercel). Trancher VPS (contrôle, coût,
volumes) vs PaaS à volumes persistants sur : persistance garantie, latence
depuis Cotonou (à mesurer), coût, sauvegardes incluses. Aucune marque imposée.

### 7.3 CI/CD

GitHub Actions : lint + `tsc` + batteries (socle, scénarios, mouvement,
quality-gate, audit) + build. `staging` auto, `prod` manuelle. Migrations
idempotentes au déploiement (déjà) ; retour arrière = redéploiement +
migrations non-destructives (déjà la règle).

### 7.4 HTTPS, domaine, secrets

Domaine HOMERA + Let's Encrypt (HSTS), en-têtes de sécurité (vérifier
`middleware.ts`), secrets en variables d'environnement **jamais en dépôt**,
rotation documentée.

### 7.5 Supervision

Sonde `/api/health` (à créer : base, disque, file e-mail), journalisation
structurée, remontée d'erreurs (solution légère ou auto-hébergée), métriques
métier (le tableau admin existe : l'étendre, pas le doubler), alertes : panne,
disque, sauvegarde ratée.

## 8. Sécurité — résumé opérationnel

Conserver : scrypt salé, sessions opaques `httpOnly` + `SameSite=Lax`,
révocation au changement de mot de passe, rôles en base, gardes serveur,
401/403 explicites, contrôles d'upload côté serveur. Ajouter : **2FA pour
l'administration**, limitation de débit, quarantaine + scan des pièces (M1),
`npm audit` en CI, sauvegardes chiffrées, moindre privilège (superadmin rare),
droits APDP (§5.4).

## 9. Feuille de route proposée

| Phase | Contenu | Entrée | Sortie (bascules `ARCHITECTURE.md`) |
|---|---|---|---|
| **P1 — Confiance documentaire** | M1 justificatifs, M7 expirations, droits données §5.4 (export/effacement), outillage E2E | LOT 8 clos | Justificatifs RÉEL, E2E partiel, droits RÉEL |
| **P2 — Production web** | Staging/prod §7, CI/CD, HTTPS, sauvegardes testées, `/api/health` | P1 | Infra partielle RÉEL. **Avant l'argent, volontairement** : confronter au réel sans risque financier |
| **P3 — Communications** | M2 e-mail, M5 alertes, M7 relances/digest | P2 | E-mail RÉEL, jobs RÉEL |
| **P4 — Argent** | M3 livre + sandbox MM puis prod + retraits ; M4 si tranché | P3 | Opérations RÉEL, retraits RÉEL, zéro simulation (test garde-fou) |
| **P5 — Échelle sur mesure** | Si critères §5 : PG, objet, `tsvector`, tuiles | Mesures P2–P4 | Migration justifiée ou report écrit |
| **P6 — Mobile** | PWA installable + push ; natif si critères §3.3 | P3 | PWA RÉEL ; natif tranché |

**Non-objectifs explicites** : microservices, multi-région, signature qualifiée
par défaut, natif-first, refonte visuelle, marketplace générique, blockchain et
tout mot à la mode ne survivant pas au test de nécessité.

## 10. Décisions à trancher

| # | Sujet | Options | Recommandation | Critère |
|---|---|---|---|---|
| D1 | Agrégateur Mobile Money | FedaPay / KkiaPay / direct opérateurs | Sandbox FedaPay + KkiaPay, choisir ensuite | Frais, support, délai, fiabilité webhooks |
| D2 | Hébergeur | VPS / PaaS à volumes | Comparer à volumes égaux | Persistance, latence Cotonou, coût, sauvegardes |
| D3 | E-mail | SMTP / API | API si volume, SMTP si frugal ; file + retry toujours | Délivrabilité, coût, facturation FCFA |
| D4 | Abonnements | Oui / non / modèle | **Trancher avant tout code** | Doctrine §1.4 |
| D5 | Frais de visite payants | Oui / non | Trancher par le workflow, pas par l'envie | Doctrine §1.5 |
| D6 | Signature qualifiée | Oui / non | Non par défaut | Exigence juridique écrite |
| D7 | PostgreSQL | Quand | Sur critères §5.1 | Mesures, pas de date |
| D8 | Natif | Quand | PWA d'abord | Critères §3.3 |

## 11. Sources et renvois

- Agrégateurs de paiement (Bénin, MTN/Moov, sandbox, onboarding) :
  [1](https://www.pirabellabs.com/blog/paiement-en-ligne-mobile-money-afrique-ouest-2026)
  [2](https://orystack.com/integration-des-apis-mobile-money-en-afrique-de-louest-guide-technique-pour-les-equipes-produit/)
  [3](https://elimboo.com/meilleurs-agregateurs-paiement-afrique/)
- APDP et loi 2017-20 (Code du numérique du Bénin) :
  [1](https://fr.linkedin.com/pulse/lapdp-et-la-protection-des-donn%C3%A9es-personnelles-au-b%C3%A9nin-apdpbenin)
- Internes : `ARCHITECTURE.md` (réel), `BACKEND.md` (socle), `ROADMAP.md`
  jalon 11 (reste du LOT 8), `AGENTS.md` § modèle économique, `VISION.md`
  (4 acteurs, diaspora).

---

*Proposition, pas promesse : chaque phase ne commence que la précédente
démontrée, et aucun statut ne change sans preuve.*
