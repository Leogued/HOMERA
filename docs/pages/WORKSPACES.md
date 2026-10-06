# Espaces Métiers Connectés (`app/(client)/*` & `app/(workspace)/*`)

Chaque espace connecté est protégé côté client par `WorkspaceShell` (ou `ClientDashboard` pour `/client`) qui vérifie l'état d'authentification et la détention du rôle requis, et propose un état d'accès explicite (`AccessState`) si l'utilisateur est déconnecté ou ne détient pas encore le rôle.

## 1. Espace Client (`/client/*`)
- **`/client`** (`ClientDashboard.tsx`) : Vue d'ensemble avec bannière d'accueil personnalisée, 4 compteurs rapides, recherches récentes, centre de notifications, favoris, prochaines visites, demandes en cours, location active, recommandations personnalisées, messages récents, résumé de profil et préférences rapides.
- **`/client/favoris`** (`ClientFavorites.tsx`) : Gestion des biens favoris et des recherches sauvegardées.
- **`/client/visites` & `/client/visites/nouvelle`** (`ClientJourneys.tsx`) : Agenda des visites, annulation, évaluation post-visite (note 1–5 étoiles + commentaire) et planificateur de visite guidé en 3 étapes.
- **`/client/demandes` & `/client/demandes/nouvelle`** (`ClientJourneys.tsx`) : Suivi des candidatures locatives (9 étapes de progression) et formulaire de candidature rattaché à une visite terminée.
- **`/client/contrats` & `/client/contrats/[id]`** (`ClientJourneys.tsx`) : Liste des baux et lecteur de contrat avec téléchargement de récapitulatif `.txt`, impression PDF navigateur et signature d'aperçu.
- **`/client/profil` & `/client/parametres`** (`ProfileSettings.tsx`) : Fiche complète du compte et préférences (notifications, thème clair/sombre/système, langue).

## 2. Espace Propriétaire (`/proprietaire/*`)
- **`/proprietaire`** : Dashboard du bailleur (portefeuille incluant les biens démo et les biens déposés localement via le wizard, annonces publiées, candidatures à étudier, visites à confirmer).
- **`/proprietaire/biens`** : Cartes des biens du portefeuille (démo + biens soumis localement) avec transitions de statut contrôlées.
- **`/proprietaire/ajouter-bien`** (`PropertyWizard.tsx`) : Wizard guidé en 11 étapes avec sauvegarde de brouillon, validation par étape, prévisualisation et soumission à la file de contrôle admin.
- **`/proprietaire/abonnement`** : Sélection de la formule d'accompagnement (*Essentiel*, *Gestion*, *Portefeuille*) avec actions directes adaptées (`/proprietaire/ajouter-bien` ou demande de devis `/contact?sujet=gestion`).
- **`/proprietaire/demandes`, `/visites`, `/locations`, `/agents`, `/documents`, `/profil`, `/parametres`** : Gestion opérationnelle complète du portefeuille.

## 3. Espace Agent (`/agent/*`)
- **Règle d'accès stricte** (`authorizationsForAgent` dans `lib/portal-data.ts`) : L'agent ne voit **que** les biens, visites, clients et documents couverts par un mandat actif rattaché à son identité.
- **`/agent/autorisations`** : Liste des mandats avec téléchargement de récapitulatif et génération du QR code SVG (`components/ui/QrCode.tsx`) pointant vers `/verification-agent`.
- **`/agent/profil`** : Fiche d'identité professionnelle complète (`describeProfile("agent", account.profile)`), lien vers `/client/parametres` et prévisualisation de la page publique de vérification.

## 4. Espace Administration (`/admin/*`)
- **`/admin` & `/admin/verifications`** (`AdminWorkspace.tsx`) : Supervision et file de contrôle documentaire incluant les biens démo et les biens déposés localement. Les décisions prises sur `/admin/verifications` mettent à jour en temps réel le statut des biens dans l'espace propriétaire et l'historique d'audit local.
- **`/admin/utilisateurs`, `/proprietaires`, `/agents`, `/biens`, `/visites`, `/demandes`, `/signalements`, `/documents`, `/statistiques`, `/parametres`** : Vues de gestion administrative responsives synchronisées avec `WorkflowProvider` (`data.listings`, `data.visits`, `data.applications`, `data.verificationDecisions`).

## 5. Échanges Transverses (`/notifications` & `/messages`)
- **`/notifications`** (`CommunicationPages.tsx`) : Centre de notifications filtrable par catégorie (*Toutes*, *Non lues*, *Visites*, *Demandes*, *Contrats*, *Vérifications*, *Agents*, *Biens*, *Système*).
- **`/messages`** (`CommunicationPages.tsx`) : Messagerie par bien et par interlocuteur (*Agent autorisé* ou *Propriétaire*) avec accès direct à la fiche du bien concerné (`/biens/[id]`).
