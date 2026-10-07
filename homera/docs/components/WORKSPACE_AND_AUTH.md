# Composants d'Authentification & Espaces Métiers (`components/auth/*`, `components/client/*`, `components/workspace/*`)

## 1. Composants d'Authentification (`components/auth/*`)

| Composant | Rôle |
| --- | --- |
| `AccountControl.tsx` | Bouton et panneau déroulant de compte dans les en-têtes publics (`Navbar` et `PublicHeader`). Affiche les rôles détenus, l'état de confirmation d'e-mail, les raccourcis vers l'espace métier, le profil et la déconnexion. |
| `AuthPanel.tsx` | Mise en page à deux colonnes pour les 5 écrans d'authentification. |
| `RoleChoice.tsx` | Groupe radio accessible permettant de choisir le rôle d'inscription (**Client**, **Propriétaire**, **Agent**). |
| `SignUpForm.tsx` | Formulaire d'inscription adaptatif conservant les champs d'identité lors du changement de rôle. |
| `SignInForm.tsx` | Formulaire de connexion avec raccourcis en un clic vers les 4 comptes de démonstration (`user`, `prop`, `agent`, `admin`). |
| `RoleUpgrade.tsx` | Module d'ajout d'un rôle supplémentaire sur un compte déjà connecté sans redemander l'identité ni le mot de passe. |
| `PasswordField.tsx` | Champ mot de passe avec bouton Afficher/Masquer et indicateur de robustesse en temps réel. |
| `CodeField.tsx` | Champ de saisie du code de vérification à 6 chiffres (`inputMode="numeric"`, support du copier-coller). |
| `StatusNote.tsx` | Bandeau d'état et composant `PilotCode` affichant le code ou le lien émis en mode pilote local. |

## 2. Composants des Espaces Métiers (`components/client/*` & `components/workspace/*`)

- **`WorkspaceShell.tsx`** : Système de navigation unifié partagé par tous les espaces (`Client`, `Propriétaire`, `Agent`, `Admin`) dans une seule zone défilante continue (`.homera-nav-scroll`), structuré en 3 niveaux UX (**Switch d'espace** selon permissions réelles `accessibleWorkspaces`, **Navigation principale**, **Actions secondaires**).
- **`PaymentMethodsPanel.tsx`** : Espace financier multi-rôles (`contextRole: "client" | "proprietaire" | "agent" | "admin"`) appliquant le modèle économique HOMERA (flux `CLIENT → HOMERA → Attribution → Disponibilité → Retrait`, séparation `CLIENT_PAYMENT_PROVIDERS` vs `PAYOUT_RECEPTION_PROVIDERS`, conditionnement au workflow et retraits par acteur).
- **`ClientDashboard.tsx`** : Vue d'ensemble `/client` (`Dashboard overview`) connectée à `VisitorProvider`, `AuthProvider` et `WorkflowProvider`, affichant les échéances à payer autorisées par le workflow, les locations actives et les reçus.
- **`ClientJourneys.tsx`** : `VisitScheduler` (demande de visite en 3 étapes), `ClientVisits` (agenda + paiement conditionné des frais de visite confirmée §9 et réservation court séjour §8 + avis étoilé), `RentalRequestForm` (candidature après visite terminée), `ClientApplications` (suivi en 9 étapes), `ClientContracts` et `ClientContractReader` (lecture, impression, signature d'aperçu et checkout à récapitulatif fixe §7).
- **`OwnerWorkspace.tsx` & `PropertyWizard.tsx`** : Gestion du portefeuille propriétaire, wizard d'ajout/correction de bien en 11 étapes, gestion des visites, candidatures, contrats, revenus, commissions et retraits.
- **`AgentWorkspace.tsx` & `AgentVerification.tsx`** : Espace agent filtré par mandat actif, suivi des rémunérations d'entremise (`autorisation sur un bien ≠ droit automatique à recevoir de l'argent`), génération de QR code ISO (`QrCode.tsx`) et contrôle public `/verification-agent`.
- **`AdminWorkspace.tsx`** : Supervision administrative (`Dashboard hybride` & `Command center` avec recherche instantanée, filtres et bascule Table/Cartes), supervision financière globale (`/admin/journal`), file de vérification documentaire interactive (`VerificationCaseCard`, `SubmittedListingReviewCard`) et registres métiers.
- **`CommunicationPages.tsx`** : `NotificationsPage` (`/notifications`) et `MessagesPage` (`/messages`).
- **`ProfileSettings.tsx`** : `ProfilePage` (affichage des champs de profil propres au rôle via `describeProfile`) et `PreferencesPage` (notifications, thème, langue, sécurité).

