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

- **`ClientDashboard.tsx`** : Vue d'ensemble `/client` connectée à `VisitorProvider`, `AuthProvider` et `WorkflowProvider`.
- **`ClientJourneys.tsx`** : `VisitScheduler` (demande de visite en 3 étapes), `ClientVisits` (agenda + avis étoilé), `RentalRequestForm` (candidature après visite terminée), `ClientApplications` (suivi en 9 étapes), `ClientContracts` et `ClientContractReader` (lecture, impression et signature d'aperçu).
- **`OwnerWorkspace.tsx` & `PropertyWizard.tsx`** : Gestion du portefeuille propriétaire, wizard d'ajout/correction de bien en 11 étapes, gestion des visites, candidatures et contrats.
- **`AgentWorkspace.tsx` & `AgentVerification.tsx`** : Espace agent filtré par mandat actif, génération de QR code ISO (`QrCode.tsx`) et contrôle public `/verification-agent`.
- **`AdminWorkspace.tsx`** : Supervision administrative, file de vérification documentaire interactive (`VerificationCaseCard`, `SubmittedListingReviewCard`) et registres métiers.
- **`CommunicationPages.tsx`** : `NotificationsPage` (`/notifications`) et `MessagesPage` (`/messages`).
- **`ProfileSettings.tsx`** : `ProfilePage` (affichage des champs de profil propres au rôle via `describeProfile`) et `PreferencesPage` (notifications, thème, langue, sécurité).
