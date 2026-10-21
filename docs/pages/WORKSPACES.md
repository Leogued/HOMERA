# Espaces Métiers Connectés (`app/(client)/*` & `app/(workspace)/*`)

Chaque espace connecté est protégé **côté serveur** : `guardWorkspace()` vérifie la session
et les rôles en base au moment du rendu, et renvoie un refus explicite (`WorkspaceRefusal`)
quand l'utilisateur n'a pas le rôle. `WorkspaceShell` ne fait que rendre la navigation.

Depuis les LOTS 3 à 5, les espaces lisent et écrivent **en base** via `/api/**`. Aucun
écran ne simule une donnée que le serveur ne sait pas produire.

## 1. Espace Client (`/client/*`)
- **`/client`** (`ClientDashboard.tsx`) : Vue d'ensemble avec bannière d'accueil personnalisée, 4 compteurs rapides, recherches récentes, centre de notifications, favoris, prochaines visites, demandes en cours, location active, recommandations personnalisées, messages récents, résumé de profil et préférences rapides.
- **`/client/favoris`** (`ClientFavorites.tsx`) : favoris lus sur `/api/favorites` (ordre d’ajout garanti), 6 tris réels, filtres budget/type/ville/pièces, pagination et comparateur ; carte honnête vers `/client/parametres` (pas d’alertes automatiques dans le pilote).
- **`/client/recherches`** (`ClientSearches.tsx`) : recherches explicitement enregistrées depuis le catalogue ; « Relancer » rouvre l’adresse sauvegardée (résultats du jour), suppression réelle.
- **`/client/recommandations`** (`ClientRecommendations.tsx`, `lib/recommendations.ts`) : sélection partagée avec le tableau de bord (projet déclaré, dernière recherche, budget ; favoris exclus), correspondances expliquées sous chaque bien, sans score ni note.
- **`/client/visites` & `/client/visites/nouvelle`** (`VisitsSections.tsx`, `ClientJourneys.tsx`) : agenda des visites servi par `/api/visits`, vignette photo du bien vers sa fiche, planificateur en 3 étapes, annulation motivée. Les statuts affichés sont ceux de la base : demandée, confirmée, reprogrammée, effectuée, annulée, refusée, absence constatée.
- **`/client/demandes` & `/client/demandes/nouvelle`** (`ApplicationSections.tsx`) : candidatures servies par `/api/applications`. Une candidature n'existe qu'après une visite **effectuée**, une seule par visite, jamais sur un bien qui n'est pas à louer : c'est le serveur qui refuse, pas le formulaire. Chaque dossier affiche sa progression réelle (envoyée → en cours → acceptée ; refusé/annulé explicitement clos) et le retrait reste possible tant que le dossier n’est pas accepté.
- **`/client/contrats` & `/client/contrats/[id]`** (`ClientJourneys.tsx`) : baux rédigés après acceptation (`/api/contracts`) — loyer, dépôt, période, statut en couleur, raccourci « Signer le contrat » quand la signature est ouverte ; lecteur avec signature électronique simple (nom, date, heure, IP journalisés). Aucun encaissement ni reçu sur le pilote.
- **`/client/paiements`** (`PaymentMethodsPanel.tsx`) : uniquement les montants prévus par les contrats signés (loyer, dépôt), marche à suivre et lien « Organiser le règlement » vers le contact ; aucun encaissement, solde, reçu ni bouton de règlement (canaux béninois annoncés, non raccordés).
- **`/client/profil` & `/client/parametres`** (`ProfileSettings.tsx`) : Fiche complète du compte et préférences (notifications avec compteur d’alertes activées, thème clair/sombre/système, langue) sans duplication du panneau financier.

## 2. Espace Propriétaire (`/proprietaire/*`)
- **`/proprietaire`** (`OwnerServerSections.tsx`) : indicateurs calculés par `/api/owner/properties` — portefeuille réel, annonces publiées, dossiers en contrôle, brouillons à reprendre, mandats en attente.
- **`/proprietaire/biens`** : biens lus en base, tous statuts confondus ; soumission au contrôle, correction d'un dossier refusé.
- **`/proprietaire/ajouter-bien`** (`PropertyWizard.tsx`) : Wizard guidé en 11 étapes avec sauvegarde de brouillon, validation par étape, prévisualisation et soumission à la file de contrôle admin.
- **`/proprietaire/locations` & `/proprietaire/abonnement`** : Suivi des baux, sélection de la formule d'accompagnement (*Essentiel*, *Gestion*, *Portefeuille*) et espace financier propriétaire (`contextRole="proprietaire"`) distinguant revenus bruts, commissions HOMERA, montants en attente, solde disponible et retraits (`PAYOUT_RECEPTION_PROVIDERS`).
- **`/proprietaire/demandes`** (`ApplicationSections.tsx`) : candidatures reçues après visite ; accepter ou refuser, motif de refus obligatoire et transmis au candidat.
- **`/proprietaire/visites`** (`VisitsSections.tsx`) : confirmer, reprogrammer, refuser, marquer effectuée ou constater une absence.
- **`/proprietaire/agents`** : mandats et autorisations servis par `/api/authorizations`.
- **`/proprietaire/documents`, `/profil`, `/parametres`**, **`/locations`**, **`/abonnement`** : gestion du portefeuille.

## 3. Espace Agent (`/agent/*`)
- **Règle d'accès stricte, tenue par le serveur** (`agentWorkspaceProperties`, `canReadPropertyDossier`) : l'agent ne voit **que** les biens, visites, clients, candidatures et pièces couverts par un mandat **actif** rattaché à son identité. Un identifiant deviné ne donne accès à rien (`403`).
- **`/agent` & `/agent/visites`** : dashboard servi par `/api/agent/properties` (matricule, mandats, biens couverts) et agenda des visites de ses mandats.
- **`/agent/demandes`** : candidatures déposées sur les biens que son mandat couvre, avec instruction possible selon la portée du mandat.
- **`/agent/autorisations`** : mandats reçus, avec **accepter / refuser / contester** ; le motif est obligatoire pour refuser ou contester, il est conservé et montré aux autres acteurs. QR code interne pointant vers `/verification-agent`.
- **`/agent/profil`** : Fiche d'identité professionnelle complète (`describeProfile("agent", account.profile)`), lien vers `/client/parametres` et prévisualisation de la page publique de vérification.

## 4. Espace Administration (`/admin/*`)
- **`/admin`** (`AdminServerSections.tsx`) : indicateurs réels servis par `/api/admin/overview` — biens, vérifications, comptes, mandats, visites, candidatures, signalements — et journal d'audit. Plus aucun chiffre n'est une estimation.
- **`/admin/verifications`** : file servie par `/api/admin/verifications`, avec les **8 étapes** réelles (complétude, identité, pièces, cohérence, photos, interlocuteur, sur place, décision). Chaque étape est horodatée, attribuée et commentée ; le commentaire marqué « interne » n'est jamais montré au propriétaire. Les décisions « accepter / refuser / suspendre / pièces manquantes / à réexaminer » écrivent en base et notifient le propriétaire.
- **`/admin/biens`** : catalogue complet servie par `/api/admin/properties` ; remettre en ligne, suspendre, archiver ou renvoyer en instruction, avec motif obligatoire pour toute mesure défavorable.
- **`/admin/utilisateurs`, `/proprietaires`, `/agents`** : comptes réels (`/api/admin/users`) ; suspension et réactivation motivées. Le rôle d'administration n'est attribuable que par un super-administrateur.
- **`/admin/visites`, `/demandes`, `/signalements`, `/documents`** : vues de supervision, elles aussi servies par le serveur.
- **`/admin/statistiques`** : uniquement ce que la base sait compter. HOMERA n'a pas encore de module de facturation : **aucun revenu, commission ou retrait n'est affiché** plutôt que d'être simulé.

## 5. Échanges Transverses (`/notifications` & `/messages`)
- **`/notifications`** (`CommunicationPages.tsx`) : Centre de notifications filtrable par catégorie (*Toutes*, *Non lues*, *Visites*, *Demandes*, *Contrats*, *Vérifications*, *Agents*, *Biens*, *Système*), icônes par type et compteur de non lues.
- **`/messages`** (`CommunicationPages.tsx`) : Messagerie par bien et par interlocuteur (*Agent autorisé* ou *Propriétaire*), vignettes photo des biens et accès direct à la fiche concernée (`/biens/[id]`).
