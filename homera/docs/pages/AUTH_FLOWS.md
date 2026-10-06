# Écrans d'Authentification & Gestion de Compte (`app/(site)/connexion`, `inscription`, etc.)

Toutes les pages de compte portent `robots: { index: false, follow: false }` et utilisent la mise en page éditoriale `AuthPanel` alimentée par `lib/pages.ts` (`AUTH_PAGE`).

## 1. Les 5 Routes de Compte

| Route | Composant principal | Rôle fonctionnel |
| --- | --- | --- |
| `/connexion` | `ConnexionView.tsx` + `SignInForm.tsx` + `RoleUpgrade.tsx` | Formulaire de connexion (ou fiche complète du compte connecté avec ajout de rôle et accès direct à l'espace métier). |
| `/inscription` | `SignUpForm.tsx` + `RoleChoice.tsx` | Sélection interactive du rôle (**Client**, **Propriétaire**, **Agent**) synchronisée avec `?role=`, puis champs spécifiques au rôle. |
| `/verification-email` | `VerifyEmailForm.tsx` + `CodeField.tsx` | Saisie du code à 6 chiffres (valable 15 min, 5 essais max), renvoi de code et modification d'adresse. |
| `/mot-de-passe-oublie` | `ForgotPasswordForm.tsx` | Génération d'un lien de réinitialisation (jeton 32 hex) et d'un code à 6 chiffres (valables 30 min). |
| `/reinitialisation` | `ResetPasswordForm.tsx` | Définition d'un nouveau mot de passe via `?jeton=` ou code à 6 chiffres ; consommation immédiate du jeton après usage. |

## 2. Comptes de Démonstration Pré-configurés (`lib/demo-accounts.ts`)

Pour faciliter l'audit et la démonstration, quatre comptes sont initialisés localement et accessibles en un clic sur `/connexion` :
- `user` / `user` → Espace Client (`/client`)
- `prop` / `prop` → Espace Propriétaire (`/proprietaire`)
- `agent` / `agent` → Espace Agent (`/agent`, rattaché au matricule `AG-HOM-0248`)
- `admin` / `admin` → Espace Administration (`/admin`)
