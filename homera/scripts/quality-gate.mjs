#!/usr/bin/env node
/**
 * HOMERA — Vérificateur automatisé du QUALITY_GATE.md
 * Usage : node scripts/quality-gate.mjs
 */
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(appRoot, "..");

const checks = [];
async function check(name, fn) {
  try {
    await fn();
    checks.push({ name, ok: true });
    console.log(`✓ [QUALITY GATE] ${name}`);
  } catch (error) {
    checks.push({ name, ok: false, error });
    console.error(`✗ [QUALITY GATE] ${name}`);
    console.error(`  → ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function collectTsxFiles(dir) {
  const results = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await collectTsxFiles(full)));
    } else if (entry.name.endsWith(".tsx")) {
      results.push(full);
    }
  }
  return results;
}

const REQUIRED_GOVERNANCE_FILES = [
  "AGENTS.md",
  "PROJECT.md",
  "VISION.md",
  "DESIGN_SYSTEM.md",
  "FRONTEND_RULES.md",
  "QUALITY_GATE.md",
  "ROADMAP.md",
  "CURRENT_STATE.md",
  "docs/pages/README.md",
  "docs/pages/PUBLIC_SITE.md",
  "docs/pages/AUTH_FLOWS.md",
  "docs/pages/WORKSPACES.md",
  "docs/components/README.md",
  "docs/components/PRIMITIVES_AND_LAYOUT.md",
  "docs/components/CATALOG_AND_HOME.md",
  "docs/components/WORKSPACE_AND_AUTH.md",
  "docs/interactions/README.md",
  "docs/interactions/MOTION_AND_SCROLL.md",
  "docs/interactions/WORKFLOWS_AND_STATE.md",
  "docs/interactions/ACCESSIBILITY_AND_RESPONSIVE.md",
];

await check("1. Gouvernance documentaire complète et synchronisée (racine + homera/)", async () => {
  assert.ok(!existsSync(path.join(repoRoot, "azerty")), "Le fichier parasite /azerty ne doit plus exister à la racine du dépôt");
  for (const rel of REQUIRED_GOVERNANCE_FILES) {
    const inApp = path.join(appRoot, rel);
    const inRepo = path.join(repoRoot, rel);
    assert.ok(existsSync(inApp), `Fichier manquant dans homera/ : ${rel}`);
    assert.ok(existsSync(inRepo), `Fichier manquant à la racine du dépôt : ${rel}`);
    const appContent = await readFile(inApp, "utf8");
    const repoContent = await readFile(inRepo, "utf8");
    assert.ok(appContent.trim().length > 200, `Contenu trop court dans homera/${rel}`);
    assert.equal(appContent, repoContent, `Désynchronisation entre homera/${rel} et /${rel}`);
  }
  const agents = await readFile(path.join(appRoot, "AGENTS.md"), "utf8");
  assert.ok(agents.includes("<!-- BEGIN:nextjs-agent-rules -->"), "AGENTS.md doit préserver BEGIN:nextjs-agent-rules");
  assert.ok(agents.includes("<!-- END:nextjs-agent-rules -->"), "AGENTS.md doit préserver END:nextjs-agent-rules");
  for (const requiredPhrase of [
    "HOMERA ne cherche pas à avoir beaucoup de contenu.",
    "PHASE 1 — COMPRÉHENSION",
    "PHASE 2 — RECHERCHE & INSPIRATION",
    "PHASE 5 — CRITIQUE & SUPPRESSION",
    "PHASE 7 — MISE À JOUR DE L'ÉTAT",
    "# HOMERA — CUSTOM DESIGN & VISUAL DIRECTION",
    "# HOMERA — PRODUCT QUALITY & AUTONOMOUS DESIGN INTELLIGENCE",
    "# HOMERA — GLOBAL SPEED & FLUIDITY DIRECTIVE",
    "# HOMERA — UI PATTERNS & PRODUCT INTERFACE MODELS",
    "# HOMERA — MODÈLE ÉCONOMIQUE, PAIEMENTS ET FLUX FINANCIERS",
    "Le modèle sert l'expérience. L'expérience ne doit jamais être forcée dans un modèle.",
    "autorisation sur un bien ≠ droit automatique à recevoir de l'argent.",
    "HOMERA me répond immédiatement.",
    "OUI, AJOUTER",
    "OUI, SUPPRIMER",
    "BOUCLE AUTONOME",
    "Content Before Layout",
    "Borrow Patterns, Not Interfaces",
    "Test de suppression",
    "Test de nécessité",
  ]) {
    assert.ok(agents.includes(requiredPhrase), `AGENTS.md doit contenir « ${requiredPhrase} »`);
  }

  const qualityGate = await readFile(path.join(appRoot, "QUALITY_GATE.md"), "utf8");
  for (const section of [
    "# 5. CUSTOM DESIGN & CREATIVE QUALITY",
    "## 5.1 Purpose",
    "## 5.2 Content",
    "## 5.3 Section quality",
    "## 5.4 Visual quality",
    "## 5.5 Inspiration",
    "## 5.6 Responsive",
    "## 5.7 Motion",
    "## 5.8 Final removal pass",
    "# 6. PRODUCT QUALITY & AUTONOMOUS DESIGN INTELLIGENCE",
    "# 7. GLOBAL SPEED & FLUIDITY DIRECTIVE",
    "# 8. UI PATTERNS & PRODUCT INTERFACE MODELS",
    "# 9. MODÈLE ÉCONOMIQUE, PAIEMENTS ET FLUX FINANCIERS",
  ]) {
    assert.ok(qualityGate.includes(section), `QUALITY_GATE.md doit contenir « ${section} »`);
  }

  const vision = await readFile(path.join(appRoot, "VISION.md"), "utf8");
  assert.ok(vision.includes("Content Before Layout") && vision.includes("Borrow Patterns, Not Interfaces"), "VISION.md doit intégrer la direction de conception sur mesure");
});

await check("2. Échelle typographique stricte (--text-*) et interdiction du faux gras sur DM Serif Display", async () => {
  const files = [
    ...(await collectTsxFiles(path.join(appRoot, "app"))),
    ...(await collectTsxFiles(path.join(appRoot, "components"))),
  ];
  const allowedTextTokens = new Set([
    "text-micro", "text-caption", "text-note", "text-body-sm", "text-label", "text-body",
    "text-display-xs", "text-display-sm", "text-display-md", "text-display-lg", "text-display-xl",
    "text-display-2xl", "text-display-fluid",
    "text-figure", "text-figure-lg", "text-figure-fluid",
    "text-accent", "text-accent-lg",
    "text-brand", "text-brand-compact", "text-brand-sm",
    "text-[1.06em]",
    "text-left", "text-center", "text-right", "text-justify", "text-start", "text-end",
    "text-wrap", "text-nowrap", "text-balance", "text-pretty", "text-ellipsis", "text-clip",
    "text-transparent", "text-current", "text-inherit", "text-white", "text-black",
  ]);
  const violations = [];
  for (const file of files) {
    const rel = path.relative(appRoot, file);
    const src = await readFile(file, "utf8");
    const lines = src.split("\n");
    lines.forEach((line, idx) => {
      const matches = line.match(/\btext-[a-zA-Z0-9_\[\].%-]+/g) || [];
      for (const token of matches) {
        if (allowedTextTokens.has(token)) continue;
        if (/^text-(foreground|background|muted|muted-light|homera-|success|warning|error|info|ring|card|border)/.test(token)) continue;
        if (line.includes("--text-")) continue;
        violations.push(`${rel}:${idx + 1} -> ${token}`);
      }
      const classAttrs = line.match(/className=(?:"[^"]*"|\{`[^`]*`\})/g) || [];
      for (const attr of classAttrs) {
        if (/\bfont-serif\b/.test(attr) && /\bfont-(semibold|bold|extrabold|black)\b/.test(attr)) {
          violations.push(`${rel}:${idx + 1} -> font-serif combiné avec graisse synthétique`);
        }
      }
    });
  }
  assert.deepEqual(violations, [], `Violations typographiques détectées :\n${violations.join("\n")}`);
});

await check("3. Tokens CSS concrets (--shadow-card / --shadow-card-hover) dans app/globals.css", async () => {
  const css = await readFile(path.join(appRoot, "app/globals.css"), "utf8");
  assert.doesNotMatch(css, /--shadow-card:\s*var\(--shadow-card\)/, "--shadow-card ne doit pas être auto-référentiel");
  assert.doesNotMatch(css, /--shadow-card-hover:\s*var\(--shadow-card-hover\)/, "--shadow-card-hover ne doit pas être auto-référentiel");
});

await check("4. Accessibilité & Sémantique HTML (labels, FormField, menus, skip-links)", async () => {
  const primitives = await readFile(path.join(appRoot, "components/workspace/Primitives.tsx"), "utf8");
  assert.ok(!primitives.includes('<span className="sr-only">{describedBy}</span>'), "FormField ne doit pas exposer les IDs DOM bruts dans un sr-only");

  const ownerWorkspace = await readFile(path.join(appRoot, "components/workspace/OwnerWorkspace.tsx"), "utf8");
  assert.doesNotMatch(ownerWorkspace, /<label[^>]*>\s*<FormField/, "Aucun <label> ne doit englober un <FormField> (double label imbriqué)");

  const workspaceShell = await readFile(path.join(appRoot, "components/workspace/WorkspaceShell.tsx"), "utf8");
  assert.ok(workspaceShell.includes("notificationsContainerRef"), "WorkspaceShell doit gérer la fermeture extérieure du menu de notifications");
  assert.ok(workspaceShell.includes('"Escape"'), "WorkspaceShell doit fermer les panneaux avec Escape");
  const workspaceLayout = await readFile(path.join(appRoot, "app/(workspace)/layout.tsx"), "utf8");
  assert.ok(workspaceLayout.includes('href="#contenu"'), "WorkspaceLayout doit fournir un lien d’évitement vers #contenu");
});

await check("5. Cohérence fonctionnelle des espaces (Profil par rôle, Footer desktop, Notifications Client, Vérification Agent)", async () => {
  const profileSettings = await readFile(path.join(appRoot, "components/workspace/ProfileSettings.tsx"), "utf8");
  assert.ok(profileSettings.includes("describeProfile(role, account.profile)"), "ProfilePage doit afficher les champs propres au rôle actif via describeProfile(role, account.profile)");

  const workspaceFooter = await readFile(path.join(appRoot, "components/workspace/WorkspaceFooter.tsx"), "utf8");
  assert.ok(workspaceFooter.includes("lg:pl-[calc(268px+1.5rem)]"), "WorkspaceFooter doit compenser la barre latérale fixe sur desktop (268px)");
  assert.ok(!workspaceFooter.includes("new Date().getFullYear()"), "WorkspaceFooter doit éviter new Date().getFullYear() au rendu pour garantir un SSR/CSR déterministe");

  const clientDashboard = await readFile(path.join(appRoot, "components/client/ClientDashboard.tsx"), "utf8");
  /* Le tableau de bord client lit le serveur : notifications, visites,
     candidatures et messages viennent des mêmes API que les pages dédiées.
     Aucune copie locale ne peut donc contredire /client/visites. */
  assert.ok(clientDashboard.includes('useServerResource<{ items: ServerNotification[]; unread: number }>("/api/notifications")'), "ClientDashboard doit compter les notifications non lues lues depuis /api/notifications");
  assert.ok(clientDashboard.includes('useServerResource<{ visits: ServerVisit[] }>("/api/visits")'), "ClientDashboard doit lire les visites depuis /api/visits");
  assert.ok(clientDashboard.includes('useServerResource<{ applications: ServerApplication[] }>("/api/applications")'), "ClientDashboard doit lire les candidatures depuis /api/applications");
  assert.ok(clientDashboard.includes('useServerResource<{ conversations: ServerConversation[] }>("/api/messages")'), "ClientDashboard doit lire les conversations depuis /api/messages");
  assert.ok(!clientDashboard.includes("workflow.data.visits") && !clientDashboard.includes("workflow.data.applications") && !clientDashboard.includes("workflow.data.messages") && !clientDashboard.includes("workflow.data.notifications"), "ClientDashboard ne doit plus afficher de visites, candidatures, messages ou notifications locales");

  const agentVerification = await readFile(path.join(appRoot, "components/workspace/AgentVerification.tsx"), "utf8");
  assert.ok(agentVerification.includes('action="/verification-agent"'), "AgentVerification doit proposer un formulaire de recherche interactif");
  assert.ok(agentVerification.includes('name="agent"') && agentVerification.includes('name="bien"'), "Le formulaire de vérification doit exposer les champs agent et bien");

  const clientFavorites = await readFile(path.join(appRoot, "components/workspace/ClientFavorites.tsx"), "utf8");
  assert.ok(!clientFavorites.includes("Comparer · bientôt"), "ClientFavorites ne doit plus contenir de bouton placeholder mort");
  assert.ok(clientFavorites.includes("PropertyComparison"), "ClientFavorites doit intégrer le comparateur côte à côte PropertyComparison");

  const favoritesView = await readFile(path.join(appRoot, "components/catalog/FavoritesView.tsx"), "utf8");
  assert.ok(favoritesView.includes("PropertyComparison"), "FavoritesView (/favoris) doit intégrer le comparateur côte à côte PropertyComparison");

  const catalogExplorer = await readFile(path.join(appRoot, "components/catalog/CatalogExplorer.tsx"), "utf8");
  assert.ok(catalogExplorer.includes("CommuneMapExplorer"), "CatalogExplorer (/explorer) doit intégrer la vue cartographique CommuneMapExplorer");

  const ownerWorkspace = await readFile(path.join(appRoot, "components/workspace/OwnerWorkspace.tsx"), "utf8");
  assert.ok(!ownerWorkspace.includes("Continuer vers le paiement · bientôt disponible"), "OwnerSubscription ne doit plus contenir de bouton placeholder mort");
  assert.ok(ownerWorkspace.includes("/contact?sujet=gestion"), "OwnerSubscription doit orienter les formules sur devis vers /contact?sujet=gestion");

  /* L’administration ne lit plus le workflow du navigateur : ses visites et
     ses candidatures viennent du serveur, seul endroit qui connaît tous les
     dossiers. La règle d’origine (reflet du stockage local) est donc
     remplacée par son contraire mesurable. */
  const adminWorkspace = await readFile(path.join(appRoot, "components/workspace/AdminWorkspace.tsx"), "utf8");
  const adminServerSections = await readFile(path.join(appRoot, "components/workspace/AdminServerSections.tsx"), "utf8");
  assert.ok(
    adminWorkspace.includes("AdminVisitsTable") && adminWorkspace.includes("ServerApplicationsList"),
    "les vues admin « visites » et « demandes » sont servies par le serveur",
  );
  assert.ok(adminServerSections.includes("/api/admin/visits"), "les visites de l’administration viennent de /api/admin/visits");
  assert.ok(
    !adminWorkspace.includes("data.visits.map") && !adminWorkspace.includes("data.applications.map"),
    "l’administration ne lit plus le workflow local du navigateur",
  );

  const agentWorkspace = await readFile(path.join(appRoot, "components/workspace/AgentWorkspace.tsx"), "utf8");
  assert.ok(agentWorkspace.includes('describeProfile("agent", account.profile)'), "AgentProfile doit afficher les champs détaillés du profil agent");

  const propertyDetail = await readFile(path.join(appRoot, "components/catalog/PropertyDetail.tsx"), "utf8");
  assert.ok(propertyDetail.includes("getNeighborhoodContext") && propertyDetail.includes("getPropertyCommitmentGuide"), "PropertyDetail (/biens/[id]) doit intégrer le contexte de quartier et les repères financiers");

  const projectPage = await readFile(path.join(appRoot, "components/catalog/ProjectPage.tsx"), "utf8");
  assert.ok(projectPage.includes("PROJECT_DECISION_GUIDES"), "ProjectPage (/acheter, /louer, /sejour) doit intégrer le guide de décision et la FAQ par projet");

  const categoryPage = await readFile(path.join(appRoot, "components/catalog/CategoryPage.tsx"), "utf8");
  assert.ok(categoryPage.includes("getCategoryVerificationNote"), "CategoryPage (/[projet]/[categorie]) doit intégrer les points de contrôle par catégorie");

  const serviceDetail = await readFile(path.join(appRoot, "components/site/ServiceDetail.tsx"), "utf8");
  assert.ok(serviceDetail.includes("SERVICE_DETAILED_GUIDES"), "ServiceDetail (/services/[slug]) doit intégrer le périmètre détaillé, les livrables et la FAQ du métier");

  assert.ok(catalogExplorer.includes("onTermChange") && catalogExplorer.includes("priority={index < 3}"), "CatalogExplorer doit filtrer en temps réel et précharger les 3 premières cartes (priority)");

  const hero = await readFile(path.join(appRoot, "components/home/Hero.tsx"), "utf8");
  /* La vidéo d’ouverture (4,45 Mo) a été retirée : le héros affiche une image
     optimisée chargée en priorité, et plus aucun fichier vidéo n’est référencé. */
  assert.ok(hero.includes('mediaKey="page-cotonou"') && hero.includes("priority"), "Hero charge une image optimisée en priorité");
  assert.ok(!hero.includes(".mp4") && !hero.includes("<video"), "Hero ne charge plus aucune vidéo");

  /* Le compte n’existe plus dans le navigateur : AuthProvider relit la session
     à chaque montage, sans cache et sans stockage local. */
  const authProvider = await readFile(path.join(appRoot, "components/providers/AuthProvider.tsx"), "utf8");
  assert.ok(authProvider.includes("/api/auth/session") && authProvider.includes('cache: "no-store"'), "AuthProvider relit la session réelle du serveur");
  assert.ok(!authProvider.includes("localStorage.setItem"), "AuthProvider n’écrit plus de compte dans le navigateur");

  /* Le squelette est propre à /explorer : posé sur tout le groupe (site), il
     forçait l’envoi du statut 200 et transformait un 404 en page d’erreur… en
     200. On vérifie donc son absence autant que sa présence ailleurs. */
  const explorerLoading = await readFile(path.join(appRoot, "app/(site)/explorer/loading.tsx"), "utf8");
  assert.ok(explorerLoading.includes("homera-skeleton"), "app/(site)/explorer/loading.tsx fournit un état de chargement immédiat et stable");
  assert.ok(
    !existsSync(path.join(appRoot, "app/(site)/loading.tsx")),
    "aucun squelette de groupe ne doit masquer le statut 404",
  );

  const workspaceShell = await readFile(path.join(appRoot, "components/workspace/WorkspaceShell.tsx"), "utf8");
  assert.ok(
    workspaceShell.includes("Navigation principale") &&
      workspaceShell.includes("Switch d’espace") &&
      workspaceShell.includes("Actions secondaires"),
    "WorkspaceShell doit structurer la navigation autour des 3 niveaux UX (Navigation principale, Switch d’espace, Actions secondaires)",
  );
  assert.ok(
    workspaceShell.includes("homera-nav-scroll") && !workspaceShell.includes("mt-auto border-t"),
    "WorkspaceShell doit défiler comme une seule zone continue (.homera-nav-scroll) sans pied de page fixe",
  );
  assert.ok(
    clientDashboard.includes('<WorkspaceShell role="client" section="dashboard">') && !clientDashboard.includes("<aside"),
    "ClientDashboard (/client) doit utiliser le système de navigation commun WorkspaceShell sans <aside> dupliqué",
  );

  /* Paiements : HOMERA n’encaisse rien en ligne. Le panneau montre ce qu’un
     contrat signé prévoit, annonce l’absence d’encaissement et ne contient
     aucune simulation (ni solde, ni retrait, ni bouton de règlement). */
  const paymentPanel = await readFile(path.join(appRoot, "components/workspace/PaymentMethodsPanel.tsx"), "utf8");
  for (const forbidden of ["maskPaymentIdentifier", "DEMO_FINANCIAL_TRANSACTIONS", "computeActorBalances", "handlePayDueContractItem", "handleRequestWithdrawal"]) {
    assert.ok(!paymentPanel.includes(forbidden), `PaymentMethodsPanel ne simule plus rien (${forbidden} absent)`);
  }
  assert.ok(
    paymentPanel.includes("/api/contracts") &&
      paymentPanel.includes("Aucun paiement, encaissement ou retrait n’est possible") &&
      ownerWorkspace.includes("PaymentMethodsWorkspace") &&
      agentWorkspace.includes("PaymentMethodsWorkspace") &&
      !profileSettings.includes("PaymentMethodsWorkspace") &&
      propertyDetail.includes("Cadre économique HOMERA"),
    "PaymentMethodsPanel affiche le dû contractuel par rôle et PropertyDetail le cadre économique HOMERA",
  );
});

const failed = checks.filter((c) => !c.ok);
if (failed.length > 0) {
  console.error(`\n${failed.length} contrôle(s) du QUALITY_GATE ont échoué.`);
  process.exit(1);
}
console.log(`\n✓ Tous les contrôles statiques du QUALITY_GATE (${checks.length}/${checks.length}) sont validés.`);
