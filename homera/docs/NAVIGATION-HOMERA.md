# Navigation HOMERA — règles et audit

## Principe

| Niveau | Rôle | Exemple |
| --- | --- | --- |
| Dashboard | Vue d’ensemble, résumés, dernières entrées | `/client`, `/proprietaire`, `/agent`, `/admin` |
| Page | Gestion complète d’une fonctionnalité | `/client/favoris`, `/agent/autorisations`, `/proprietaire/biens` |
| Modal / panneau | Action ou information rapide | panneau de notifications, « Nouvelle conversation », confirmations |
| Dropdown | Choix ou navigation secondaire | menus Acheter / Louer / Séjour / Services, menu de compte |
| Section / défilement | Contenu réellement rattaché à la page courante | chapitres de l’accueil, sommaires de `/a-propos`, `/legal`, `/services` |

Une fonctionnalité réutilisée (profil, paramètres, favoris, visites, demandes, contrats,
biens, autorisations, documents) possède **une seule route** par espace, et tout point
d’entrée y mène.

## Ce qui a été corrigé

| Élément | Avant | Après |
| --- | --- | --- |
| Barre latérale du tableau de bord client | `#accueil`, `#favoris`, `#visites`, `#demandes`, `#locations`, `#notifications`, `#messages`, `#profil`, `#parametres` + état local | routes `/client`, `/client/favoris`, `/client/visites`, `/client/demandes`, `/client/contrats`, `/notifications`, `/messages`, `/client/profil`, `/client/parametres` |
| Icône d’en-tête du tableau de bord client | `#profil` | `/client/profil` |
| Cloche d’en-tête (client) | `#notifications` | `/notifications` |
| Quatre indicateurs du tableau de bord client | `#favoris`, `#recherches`, `#profil`, `#notifications` | `/client/favoris`, `/client/favoris`, `/client/profil`, `/notifications` |
| En-tête du shell d’espace (propriétaire, agent, admin) | icône de réglages vers le profil | icône de profil vers la route de profil du rôle |
| Menu de compte public | « Mon espace client » + favoris uniquement | ajout de « Mon profil » selon le rôle tenu, accès administration pour le compte admin |
| Destination après connexion | toujours `/client` | `/admin`, `/proprietaire`, `/agent` ou `/client` selon le rôle détenu |
| Alertes du propriétaire | `/client/demandes`, `/client/visites`, `/client/contrats` | `/proprietaire/demandes`, `/proprietaire/visites`, `/proprietaire/documents` |
| Alertes de l’agent | `/client/visites` | `/agent/visites` |
| Services (accueil) | `window.location.assign` | navigation `router.push` vers `/services/...` |
| Profil | « Gérer mon compte » vers `/connexion` | « Paramètres et sécurité » vers les paramètres du rôle |

## Défilement conservé volontairement

Ces liens restent des ancres : le contenu appartient à la page courante.

- Accueil : recherche → `#biens`, intentions → `#biens`, dossier → `#protocole`,
  protocole → `#services`, projection finale → `#biens` / `#protocole`, rail de chapitres.
- `/a-propos`, `/legal`, `/services` : sommaires internes de la page.
- `/a-propos#protocole` depuis le pied de page et les favoris : ancre inter-pages dont
  la cible est vérifiée par l’audit.
- Liens d’évitement « Aller au contenu » et gestion de focus (`getElementById`) : ce ne
  sont pas des navigations.

## Vérifications

```bash
npm test          # 58 tests, dont le test de navigation
npm run lint
npx tsc --noEmit
npm run build
npm run audit:home
```

Le test de navigation vérifie que :

1. chaque `href="/…"` et chaque `href: "/…"` déclaré dans `app/` et `components/`
   correspond à une route réellement présente dans `app/` (segments dynamiques compris) ;
2. le tableau de bord client, le shell d’espace, la messagerie, le menu de compte et les
   deux en-têtes publics ne contiennent plus aucune navigation par fragment ;
3. les raccourcis du tableau de bord client pointent vers les pages de gestion et plus
   vers `setActiveSection` ni `window.location.hash` ;
4. les alertes de chaque espace renvoient vers les pages de cet espace ;
5. la destination après connexion dépend du rôle et s’appelle `workspaceHref` / `workspaceLabel`.

Complément exécuté à la main sur la version de production :

- 48 routes d’espaces (`/client/*`, `/proprietaire/*`, `/agent/*`, `/admin/*`,
  `/notifications`, `/messages`) répondent `200` et leur HTML ne contient aucune ancre
  `#profil`, `#favoris`, `#visites`, `#demandes`, `#locations`, `#notifications`,
  `#messages`, `#parametres`, `#accueil` ;
- `npm run audit:home` : 161 pages publiques, aucun lien interne cassé.

## Limites

- Les parcours contrôlés ici sont ceux du prototype local : aucune navigation d’espace
  ne dépend d’un serveur, et les liens dynamiques (`/biens/${id}`) sont validés par
  motif, pas par visite réelle de chaque identifiant.
- Aucun test visuel, clavier ou lecteur d’écran n’a été exécuté sur ces parcours.
