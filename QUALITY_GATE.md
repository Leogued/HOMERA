# QUALITY GATE — Critères d'Excellence Frontend & Creative Quality HOMERA

> **Règle cardinale** : Une tâche n'est **jamais** considérée comme terminée parce que le code compile.
> Avant d'annoncer qu'une livraison est prête, l'agent frontend doit exécuter les commandes automatisées et valider l'intégralité des 5 catégories ci-dessous.

---

## Commandes de validation obligatoires (6 / 6 vertes)

Chaque modification doit passer cette séquence complète dans `homera/` :

```bash
npm test                  # 1. Suite de tests automatisés (100 % pass, 0 fail)
npm run lint              # 2. ESLint strict (0 erreur, 0 warning)
npx tsc --noEmit          # 3. TypeScript strict (0 erreur de typage)
npm run quality:gate      # 4. Vérificateur statique du Quality Gate (0 violation)
npm run build             # 5. Build de production Next.js (100 % des routes générées)
npm run audit:home        # 6. Audit HTTP/DOM complet des routes publiques (0 lien/ancre/ARIA cassé)
```

---

# 1. FONCTIONNEL (FUNCTIONAL QUALITY)

- [x] **Routes & Navigation** : Toutes les routes déclarées dans `lib/nav.ts`, `app/(site)`, `app/(client)` et `app/(workspace)` répondent en HTTP 200 (et 404 réel sur les URLs inexistantes).
- [x] **Zéro lien mort** : Aucun `href="#"`, aucun lien vers une route absente, aucune ancre interne (`#id`) ou inter-pages (`/services#gestion`, `/a-propos#protocole`) orpheline.
- [x] **Zéro navigation par fragment dans les espaces** : Les tableaux de bord et barres latérales naviguent vers de vraies pages dédiées.
- [x] **Catalogue & Filtres** : Recherche, filtres par projet/commune/quartier/type/budget/équipements/durée, tri et pagination synchronisés avec l'URL et fonctionnels dès le premier rendu serveur.
- [x] **Comptes & Rôles cumulables** : Inscription adaptée au rôle (`client`, `proprietaire`, `agent`), cumul de rôles sans ressaisie d'identité ni perte du socle client, vérification d'e-mail (code 6 chiffres, 15 min, 5 essais), réinitialisation de mot de passe (jeton 32 hex + code, 30 min).
- [x] **Parcours métiers complets** :
  - Client : favoris, recherches sauvegardées, demande de visite en 3 étapes, retour après visite terminée, dépôt de candidature locative, lecture et signature d'aperçu de contrat.
  - Propriétaire : portefeuille, wizard d'ajout/correction de bien en 11 étapes avec sauvegarde de brouillon, gestion des visites et candidatures, éditeur de contrat.
  - Agent : accès strictement filtré par mandat actif rattaché à l'identité, téléchargement de récapitulatif, QR code ISO/IEC 18004 sans dépendance externe, page de vérification publique interactive (`/verification-agent`).
  - Admin : file de vérification documentaire (dossiers démo + soumissions locales), décisions horodatées (`valide`, `modification-demandee`, `refuse`, `suspendu`), compteur dynamique dans la barre latérale.

---

# 2. DESIGN SYSTEM & COHÉRENCE VISUELLE

- [x] **Couleurs 100 % tokenisées** :
  - `0` classe `stone-*`, `gray-*`, `slate-*`, `zinc-*`, `neutral-*`.
  - `0` couleur hexadécimale (`#...`) codée en dur dans `app/**/*.tsx` et `components/**/*.tsx`.
  - Tous les tokens de `app/globals.css` portent une valeur concrète non circulaire.
- [x] **Typographie 100 % conforme à l'échelle HOMERA** :
  - `0` classe typographique fantôme (`text-body-md`, `text-heading-lg`).
  - `0` classe `text-[...]` arbitraire hors l'unique `text-[1.06em]` relatif du `h1` dans `Hero.tsx`.
  - `0` classe de taille Tailwind par défaut (`text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`).
  - `0` combinaison `font-serif` + `font-bold` / `font-semibold`.
  - `.homera-brand` réservé au mot-symbole « HOMERA » / « Homera ».
- [x] **Rayons & Courbes** :
  - `0` rayon `rounded-[...]` hors échelle ; les 6 rôles (`rounded-btn`, `-input`, `-card`, `-menu`, `-media`, `-modal`) pointent vers l'échelle.
  - `0` courbe `ease-[...]` recopiée à la main.
- [x] **Responsive Desktop / Tablette / Mobile (320 px → 1 920 px)** :
  - Aucun débordement horizontal involontaire.
  - Alignement du pied de page d'espace (`WorkspaceFooter`) avec les barres latérales fixes sur grand écran (`lg:pl-[calc(268px+1.5rem)]`).
  - Récits sticky actifs uniquement à partir de `1024×700 px`, repliés proprement sur mobile et écrans courts.

---

# 3. UX & ÉTATS D'INTERFACE

- [x] **États interactifs complets** : États `hover`, `focus-visible` (anneau terracotta sur clair, ambre sur nuit), `active` (`.homera-press`) et `disabled` explicites sur tous les contrôles.
- [x] **Loading / Empty / Error / Success states** :
  - Squelettes `.homera-skeleton` avec `aria-busy="true"` pendant l'hydratation des espaces.
  - États vides (`EmptyPanel`, `EmptyState`) pédagogiques avec action directe.
  - Messages d'erreur (`role="alert"`) et confirmations (`role="status"`, `aria-live="polite"`) clairs.
  - Page `app/error.tsx` et page `app/not-found.tsx` éditoriales et conformes au design system.
- [x] **Panneaux & Menus déroulants** :
  - Fermeture au clavier (`Escape`) et au clic extérieur sur les menus du header, le sélecteur de compte, le tiroir mobile et le panneau de notifications des espaces.
- [x] **Honnêteté du pilote** :
  - `DemoNotice` et mentions explicites sur toutes les fonctionnalités locales au navigateur.

---

# 4. ACCESSIBILITÉ (WCAG AA) & QUALITÉ TECHNIQUE

- [x] **Contrastes AA (≥ 4,5:1)** : Prouvés par calcul automatisé en thème clair et en thème sombre sur tous les couples texte/surface et boutons CTA.
- [x] **Sémantique HTML stricte** :
  - Un seul `<h1>` par page.
  - `0` élément interactif imbriqué (`<a>` dans `<button>`, `<button>` dans `<a>`).
  - `0` `<label>` imbriqué dans un `<label>`.
  - `0` identifiant DOM dupliqué sur une même page ; `100 %` des `aria-controls`, `aria-labelledby`, `aria-describedby` résolus.
  - Toutes les images portent un attribut `alt`.
- [x] **Hydratation & Console propre** :
  - `0` nœud texte d'espaces sous `<html>`, `<head>` ou `<table>`.
  - `0` valeur dépendante du fuseau horaire ou de `window` évaluée de façon divergente au premier rendu serveur/client.
- [x] **Performance & Mouvement** :
  - Ordonnanceur `requestAnimationFrame` sans boucle résiduelle au repos.
  - Respect total de `prefers-reduced-motion: reduce`.
  - Images servies en AVIF/WebP avec `sizes` et `blurDataURL` (`lib/media.generated.ts`).

---

# 5. CUSTOM DESIGN & CREATIVE QUALITY

## 5.1 Purpose

- [x] L'objectif de la page est clairement identifiable
- [x] Le parcours utilisateur est cohérent (`CONTEXTE → INFORMATION → DÉCISION → ACTION`)
- [x] Chaque section possède une fonction réelle (compréhension, découverte, comparaison, confiance, preuve, décision, action, navigation, conversion ou storytelling utile)

## 5.2 Content

- [x] Aucun contenu de remplissage
- [x] Aucun texte générique inutile
- [x] Chaque information possède une justification concrète (Test de nécessité validé)
- [x] Le contenu est adapté au contexte HOMERA et au marché immobilier béninois

## 5.3 Section quality

- [x] Aucune section n'existe uniquement pour remplir l'espace
- [x] Les sections sont dans un ordre logique (`IMMERSION → COMPRÉHENSION → EXPLORATION → PREUVE → ACTION`)
- [x] Les sections redondantes sont fusionnées ou supprimées
- [x] La longueur de la page est justifiée par le besoin utilisateur

## 5.4 Visual quality

- [x] Hiérarchie visuelle forte
- [x] Composition maîtrisée
- [x] Espacements cohérents
- [x] Typographie maîtrisée
- [x] Images pertinentes (cadrage, ratio, qualité, recadrage responsive)
- [x] CTA correctement hiérarchisés (sans répétition excessive)
- [x] Aucun élément décoratif inutile

## 5.5 Inspiration

- [x] Des références modernes pertinentes ont été étudiées
- [x] Plusieurs références ont été comparées (minimum 3 références pour les pages majeures)
- [x] Les meilleurs patterns ont été sélectionnés (`Borrow Patterns, Not Interfaces`)
- [x] Les patterns ont été adaptés à HOMERA
- [x] Le résultat n'est pas une copie identifiable

## 5.6 Responsive

- [x] Desktop
- [x] Tablet
- [x] Mobile
- [x] Aucun overflow
- [x] Aucun chevauchement
- [x] Composition adaptée et non simplement réduite

## 5.7 Motion

- [x] Chaque animation possède une fonction (compréhension, orientation, feedback, continuité, immersion)
- [x] Aucun mouvement décoratif excessif
- [x] Transitions cohérentes
- [x] `prefers-reduced-motion` respecté

## 5.8 Final removal pass

- [x] Une passe de suppression a été effectuée (Phase 5 — Critique & Suppression)
- [x] Les sections inutiles ont été supprimées (Test de suppression validé)
- [x] Les éléments redondants ont été supprimées
- [x] Le résultat final est aussi simple que possible

---

# 6. PRODUCT QUALITY & AUTONOMOUS DESIGN INTELLIGENCE

## 6.1 Jugement produit & Décision autonome (`OUI, AJOUTER` / `OUI, MODIFIER` / `OUI, SUPPRIMER` / `NON, CONSERVER`)

- [x] Les 15 questions d'audit (`AGENTS.md` §1) ont été posées sur chaque page ou section examinée (`Objectif → utilisateur → besoin → informations → hiérarchie → action → interface`)
- [x] Chaque ajout important répond concrètement à *« Quel problème utilisateur cet élément résout-il ? »* (compréhension, découverte, recherche, comparaison, confiance, preuve, décision, action, navigation, accessibilité, orientation ou continuité)
- [x] Aucun élément n'est conservé uniquement parce qu'il existait déjà (*Deletion Test* validé)

## 6.2 Qualité Textuelle & Contenu Utile

- [x] Le texte est clair, précis, utile, naturel et adapté à l'utilisateur (acheteur, locataire, diaspora, propriétaire, agent)
- [x] Les informations indispensables à la décision (contexte du quartier, lecture du titre foncier / ACD / bail, repères financiers, étapes de vérification, livrables de service) sont présentes et explicites
- [x] Zéro slogan creux, zéro chiffre inventé, zéro faux témoignage, zéro paragraphe de remplissage

## 6.3 Les 10 Dimensions de Qualité (`AGENTS.md` §10)

- [x] **Produit** : utilité, pertinence, cohérence avec l'objectif, valeur utilisateur
- [x] **Contenu** : exactitude, clarté, hiérarchie, complétude, concision, qualité rédactionnelle
- [x] **UX** : compréhension immédiate, navigation, réduction des frictions, parcours, feedback, décision, action
- [x] **UI** : composition, typographie, couleurs, espacement, composants, cohérence
- [x] **Architecture de l'information** : organisation, ordre, regroupement, priorité, découvrabilité
- [x] **Accessibilité** : contraste WCAG AA, clavier, focus, sémantique, lecteurs d'écran
- [x] **Responsive** : mobile, tablette, desktop, densité, navigation, interactions
- [x] **Performance** : images, animations, JavaScript, chargement, stabilité visuelle
- [x] **Confiance** : preuves, transparence, cohérence, absence de promesses artificielles
- [x] **Identité & Perception** : positionnement *« Vérifier avant de s'engager »* immédiatement perceptible dès la première visite

## 6.4 Critique obligatoire & Boucle autonome en 11 étapes

- [x] La boucle complète `COMPRENDRE → ANALYSER → RECHERCHER → DÉCIDER → IMPLÉMENTER → TESTER → VISUALISER → CRITIQUER → CORRIGER → VALIDER → DOCUMENTER` a été exécutée
- [x] Une seconde passe `CRITIQUE` a vérifié l'absence de faiblesse, de répétition, de surcharge ou d'information manquante

---

# 7. GLOBAL SPEED & FLUIDITY DIRECTIVE

## 7.1 Réactivité immédiate (« HOMERA me répond immédiatement »)

- [x] Chaque action utilisateur (clic, saisie, filtre, tri, favori, ouverture/fermeture, navigation) déclenche un retour immédiat sans attente artificielle
- [x] La saisie dans la recherche de l'explorateur (`CatalogExplorer.tsx`) filtre les résultats en temps réel au fil de la frappe (`useTransition`) et propose un bouton d'effacement instantané (`×`)
- [x] Priorité absolue : `réponse immédiate > transition courte > animation décorative`

## 7.2 Priorité du contenu (« Critical content first ») & Mobile First

- [x] Le titre principal et le module de recherche du Hero (`Hero.tsx`) s'affichent immédiatement dès le premier rendu HTML SSR (aucun masquage initial en attente de l'hydratation JS)
- [x] La vidéo du Hero utilise `preload="metadata"` et une image `poster` immédiate (`/images/page-cotonou.jpg`) pour éviter tout écran noir ou saturation de bande passante sur mobile
- [x] Les 3 premières cartes de biens visibles dans l'explorateur (`CatalogExplorer.tsx`) reçoivent `priority={index < 3}` pour précharger les visuels au-dessus de la ligne de flottaison (LCP optimal)
- [x] Sur `/explorer`, la grille de résultats est immédiatement visible au-dessus de la ligne de flottaison (la carte des communes s'ouvre à la demande en 1 clic ou lorsqu'un filtre territorial est actif)

## 7.3 Navigation sans friction, Stabilité & Performance technique

- [x] Toutes les routes dynamiques publiques (`app/(site)/loading.tsx`), client (`app/(client)/loading.tsx`) et espaces (`app/(workspace)/loading.tsx`) disposent d'un état `.homera-skeleton` stable sans saut de mise en page (CLS = 0)
- [x] `AuthProvider` filtre strictement les événements `storage` sur ses propres clés (`ACCOUNTS_STORAGE_KEY`, `SESSION_STORAGE_KEY`), évitant tout re-render global lors d'un ajout en favori ou d'une action de workflow

---

# 8. UI PATTERNS & PRODUCT INTERFACE MODELS

## 8.1 Adéquation du modèle d'interface au rôle, à la fréquence et à l'action (`AGENTS.md` §§1–14)

- [x] **Modèles de Dashboard différenciés par rôle** :
  - `/client` : **Dashboard overview** (synthèse personnelle, favoris, prochaines visites, location active).
  - `/proprietaire` : **Dashboard hybride** (synthèse portefeuille + actions prioritaires sur les biens, demandes, visites et locations).
  - `/agent` : **Dashboard opérationnel** (agenda de visites terrain, mandats actifs et vérification QR).
  - `/admin` : **Command center & Dashboard opérationnel** (file de contrôle prioritaire, décisions de vérification, supervision multi-entités).
- [x] **Modèles de Listes adaptés à la donnée (Grid vs Liste vs Table)** :
  - **Grid** réservé aux contenus visuels (catalogue de biens `/explorer`, `/acheter`, `/louer`, `/sejour`).
  - **Table structurée (Desktop) → Cartes prioritaires (Mobile)** pour l'administration (`AdminRecords`) et le journal des transactions financières (`PaymentMethodsPanel`).
  - **Liste compacte** pour les notifications, l'historique d'audit (`/historique/[reference]`) et les événements récents.
- [x] **Modèles de Paiement & Fiches (`AGENTS.md` §§4, 10, 11, 15)** :
  - Parcours de règlement structuré avec **échéances réelles du workflow** et filtrage du journal dans `PaymentMethodsPanel.tsx`.
  - **Paiement conditionné à la signature du contrat** dans `ClientContractReader` (`/client/contrats/[id]`).
  - **Sticky action mobile** sur les fiches de biens (`PropertyDetail.tsx`) pour garder le prix et l'action principale (`Planifier une visite`) immédiatement accessibles sur smartphone.

---

# 9. MODÈLE ÉCONOMIQUE, PAIEMENTS ET FLUX FINANCIERS

## 9.1 Flux financier HOMERA, Séparation des canaux & Confidentialité par acteur (`AGENTS.md` §§1–17)

- [x] **Flux financier centralisé via HOMERA** (`computeFinancialBreakdown` dans `lib/workflow.ts`) :
  - Chaque transaction distingue explicitement : `grossAmount` (payé par le client), `homeraFee` (commission / frais HOMERA), `ownerNetAmount` (part propriétaire) et `agentAmount` (part éventuelle de l'agent autorisé).
  - Aucune transaction ne court-circuite HOMERA sous la forme simpliste « Client → Propriétaire ».
- [x] **Bouton « Payer » strictement conditionné au workflow (`canClientPayContract`)** :
  - Aucun simulateur libre déconnecté du parcours : le client ne voit un bouton de paiement (`Payer la location · {montant} FCFA`, `Payer le dépôt de garantie · {montant} FCFA`) que lorsqu'un contrat est **signé (`status === "signe"`)**, que le montant et le bien sont déterminés, et que l'échéance n'est pas déjà réglée.
- [x] **Séparation Moyens de paiement Client vs Moyens de réception / retrait (`CLIENT_PAYMENT_PROVIDERS` vs `PAYOUT_RECEPTION_PROVIDERS`)** :
  - La carte bancaire (`Visa / Mastercard`) est réservée aux paiements clients (`supportsPayoutWithdrawal: false`) et n'est jamais proposée comme compte de réception ou de retrait.
- [x] **Disponibilité des fonds, Retraits & Règle Agent (`computeActorBalances`)** :
  - Une somme non confirmée (`status !== "confirme"`) reste toujours `en-attente` et n'est **jamais** comptabilisée dans le solde `disponible`.
  - Le bouton **`Retirer`** n'apparaît que pour un propriétaire ou un agent disposant d'un solde réellement `disponible > 0`.
  - **Autorisation sur un bien ≠ droit automatique à recevoir de l'argent** : un agent ne voit et ne peut retirer que les sommes explicitement rattachées à son `agentId` et à une opération réelle.
- [x] **Transparence et confidentialité par rôle (§15)** :
  - Le **Client** voit uniquement ce qu'il doit payer ; le **Propriétaire** voit ses revenus, la commission HOMERA et son net ; l'**Agent** voit uniquement ce qui lui revient sur ses mandats ; **HOMERA / Admin** voit la ventilation complète.




