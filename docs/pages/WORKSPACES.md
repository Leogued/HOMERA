# Espaces Métiers Connectés (`app/(client)/*` & `app/(workspace)/*`)

Chaque espace connecté est protégé côté client par `WorkspaceShell` (ou `ClientDashboard` pour `/client`) qui vérifie l'état d'authentification et la détention du rôle requis, et propose un état d'accès explicite (`AccessState`) si l'utilisateur est déconnecté ou ne détient pas encore le rôle.

## 1. Espace Client (`/client/*`)
- **`/client`** (`ClientDashboard.tsx`) : Vue d'ensemble avec bannière d'accueil personnalisée, 4 compteurs rapides, recherches récentes, centre de notifications, favoris, prochaines visites, demandes en cours, location active, recommandations personnalisées, messages récents, résumé de profil et préférences rapides.
- **`/client/favoris`** (`ClientFavorites.tsx`) : Gestion des biens favoris et des recherches sauvegardées.
- **`/client/visites` & `/client/visites/nouvelle`** (`ClientJourneys.tsx`) : Agenda des visites, annulation, évaluation post-visite (note 1–5 étoiles + commentaire) et planificateur de visite guidé en 3 étapes.
- **`/client/demandes` & `/client/demandes/nouvelle`** (`ClientJourneys.tsx`) : Suivi des candidatures locatives (9 étapes de progression) et formulaire de candidature rattaché à une visite terminée.
- **`/client/contrats` & `/client/contrats/[id]`** (`ClientJourneys.tsx`) : Liste des baux et lecteur de contrat avec téléchargement de récapitulatif `.txt`, impression PDF navigateur, signature d'aperçu et checkout contextuel à récapitulatif fixe (`Fixed-summary checkout`) activé uniquement après signature du contrat.
- **`/client/paiements`** (`PaymentMethodsPanel.tsx`) : Espace financier client (`contextRole="client"`) présentant les échéances à payer autorisées par le workflow, les paiements en cours/confirmés, les reçus et les 5 moyens de paiement Bénin/UEMOA (`CLIENT_PAYMENT_PROVIDERS`), sans exposer les commissions internes HOMERA ni les fonctions de retrait.
- **`/client/profil` & `/client/parametres`** (`ProfileSettings.tsx`) : Fiche complète du compte et préférences (notifications, thème clair/sombre/système, langue) sans duplication du panneau financier.

## 2. Espace Propriétaire (`/proprietaire/*`)
- **`/proprietaire`** : Dashboard opérationnel et synthétique du bailleur (portefeuille incluant les biens démo et les biens déposés localement via le wizard, annonces publiées, candidatures à étudier, visites à confirmer).
- **`/proprietaire/biens`** : Cartes des biens du portefeuille (démo + biens soumis localement) avec transitions de statut contrôlées.
- **`/proprietaire/ajouter-bien`** (`PropertyWizard.tsx`) : Wizard guidé en 11 étapes avec sauvegarde de brouillon, validation par étape, prévisualisation et soumission à la file de contrôle admin.
- **`/proprietaire/locations` & `/proprietaire/abonnement`** : Suivi des baux, sélection de la formule d'accompagnement (*Essentiel*, *Gestion*, *Portefeuille*) et espace financier propriétaire (`contextRole="proprietaire"`) distinguant revenus bruts, commissions HOMERA, montants en attente, solde disponible et retraits (`PAYOUT_RECEPTION_PROVIDERS`).
- **`/proprietaire/demandes`, `/visites`, `/agents`, `/documents`, `/profil`, `/parametres`** : Gestion opérationnelle complète du portefeuille.

## 3. Espace Agent (`/agent/*`)
- **Règle d'accès et de rémunération stricte** (`authorizationsForAgent` dans `lib/portal-data.ts` & `computeActorBalances` dans `lib/workflow.ts`) : L'agent ne voit **que** les biens, visites, clients et documents couverts par un mandat actif rattaché à son identité, et applique le principe **« autorisation sur un bien ≠ droit automatique à recevoir de l'argent »**.
- **`/agent` & `/agent/visites`** : Dashboard opérationnel de terrain et suivi des rémunérations d'entremise (`contextRole="agent"`, `en attente → disponible → retiré`).
- **`/agent/autorisations`** : Liste des mandats avec téléchargement de récapitulatif et génération du QR code SVG (`components/ui/QrCode.tsx`) pointant vers `/verification-agent`.
- **`/agent/profil`** : Fiche d'identité professionnelle complète (`describeProfile("agent", account.profile)`), lien vers `/client/parametres` et prévisualisation de la page publique de vérification.

## 4. Espace Administration (`/admin/*`)
- **`/admin` & `/admin/verifications`** (`AdminWorkspace.tsx`) : Dashboard hybride de supervision et file de contrôle documentaire incluant les biens démo et les biens déposés localement. Les décisions prises sur `/admin/verifications` mettent à jour en temps réel le statut des biens dans l'espace propriétaire et l'historique d'audit local.
- **`/admin/journal`** : Supervision financière globale HOMERA (`contextRole="admin"`) présentant l'intégralité du flux `CLIENT → HOMERA → Attribution (Commission HOMERA / Part Agent / Net Propriétaire) → Disponibilité → Retrait` ainsi que le journal d'audit.
- **`/admin/utilisateurs`, `/proprietaires`, `/agents`, `/biens`, `/visites`, `/demandes`, `/signalements`, `/documents`, `/statistiques`, `/parametres`** : Command center administratif avec recherche instantanée, filtres par statut et bascule responsive Table (desktop) / Cartes (mobile).

## 5. Échanges Transverses (`/notifications` & `/messages`)
- **`/notifications`** (`CommunicationPages.tsx`) : Centre de notifications filtrable par catégorie (*Toutes*, *Non lues*, *Visites*, *Demandes*, *Contrats*, *Vérifications*, *Agents*, *Biens*, *Système*).
- **`/messages`** (`CommunicationPages.tsx`) : Messagerie par bien et par interlocuteur (*Agent autorisé* ou *Propriétaire*) avec accès direct à la fiche du bien concerné (`/biens/[id]`).
