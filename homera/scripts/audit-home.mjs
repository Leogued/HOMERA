import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

/* ==================================================================
   AUDIT DU SITE PUBLIC — HTTP réel, sans navigateur graphique
   ------------------------------------------------------------------
   Deux modes :
     npm run audit:home            → serveur déjà démarré (URL en argument)
     node scripts/audit-home.mjs --file .next/server/app/index.html

   En mode HTTP, l’audit explore réellement le site depuis l’accueil et
   contrôle chaque page publique : identifiants uniques, références
   ARIA résolues, un seul h1, ancres internes existantes, liens internes
   en 200 (y compris les ancres inter-pages), aucun « NaN », images
   décrites. Il vérifie ensuite le home (chapitres, intentions,
   protocoles), le CSS compilé et l’optimisation d’image.
   ================================================================== */

const fromFile = process.argv[2] === '--file';
const base = new URL(fromFile ? 'http://127.0.0.1:3000' : process.argv[2] ?? 'http://127.0.0.1:3000');

const fetchOk = async (path, options = {}) => {
  const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(90000), ...options });
  return response;
};

/** Le payload RSC contient du code, pas des attributs du DOM rendu. */
const render = (raw) => raw.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');

const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

function inspect(path, raw) {
  const html = render(raw);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  const idSet = new Set(ids);
  assert.equal(ids.length, idSet.size, `${path} : identifiant dupliqué`);

  const references = [...html.matchAll(/\b(?:aria-controls|aria-labelledby|aria-describedby|aria-owns)="([^"]+)"/g)]
    .flatMap((match) => match[1].split(/\s+/));
  for (const reference of references) assert.ok(idSet.has(reference), `${path} : référence aria orpheline ${reference}`);

  assert.equal([...html.matchAll(/<h1\b/g)].length, 1, `${path} : un seul h1 attendu`);
  assert.ok(!html.includes('NaN'), `${path} : valeur NaN rendue`);
  assert.ok(/<html[^>]+lang="fr"/.test(html), `${path} : langue du document`);
  assert.match(html, /<title>([^<]+)<\/title>/, `${path} : titre de page`);
  assert.match(html, /<meta name="description" content="[^"]{20,}"/, `${path} : description absente`);
  assert.ok(!/href="#"/.test(html), `${path} : lien mort href="#"`);

  // Un ancrage interne doit exister sur la page qui le porte.
  for (const match of html.matchAll(/href="#([^"]+)"/g)) {
    assert.ok(idSet.has(match[1]), `${path} : ancre interne orpheline #${match[1]}`);
  }

  // Toute image doit porter un texte de remplacement (même vide si décorative).
  for (const match of html.matchAll(/<img\b[^>]*>/g)) {
    assert.match(match[0], /\balt="/, `${path} : image sans alt — ${match[0].slice(0, 90)}`);
  }

  // Pas d’interactif imbriqué (bouton dans un lien, lien dans un bouton…).
  const stack = [];
  for (const match of html.matchAll(/<(\/?)([a-z][\w-]*)\b([^>]*)>/gi)) {
    const closing = Boolean(match[1]);
    const tag = match[2].toLowerCase();
    const attrs = match[3];
    if (closing) {
      const index = stack.lastIndexOf(tag);
      if (index >= 0) stack.length = index;
      continue;
    }
    if (['a', 'button', 'input', 'select', 'textarea'].includes(tag)) {
      assert.ok(!stack.some((parent) => ['a', 'button'].includes(parent)), `${path} : élément ${tag} imbriqué dans un lien ou un bouton`);
    }
    if (!VOID_TAGS.has(tag) && !attrs.endsWith('/')) stack.push(tag);
  }

  return { html, ids, links: [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]) };
}

/* ------------------------------------------------------------------
   MODE FICHIER — contrôle statique du seul HTML de l’accueil
   ------------------------------------------------------------------ */
if (fromFile) {
  const raw = await readFile(process.argv[3] ?? '.next/server/app/index.html', 'utf8');
  const path = process.argv[3] ?? '.next/server/app/index.html';
  const { html, ids } = inspect(path, raw);
  for (const id of ['hero', 'chiffres', 'explorer', 'biens', 'bien-homera', 'protocole', 'services', 'magazine', 'manifeste']) assert.ok(ids.includes(id), `Chapitre manquant : ${id}`);
  for (const intent of ['acheter', 'louer', 'sejour', 'investir']) assert.ok(ids.includes(`intent-${intent}`), `Intention manquante : ${intent}`);
  for (const id of ['acheter', 'louer', 'sejour', 'services']) assert.ok(ids.includes(`menu-${id}`), `Menu manquant : ${id}`);
  for (let index = 0; index < 7; index++) assert.ok(ids.includes(`protocol-step-${index}`), `Étape manquante : ${index}`);
  for (const id of ['localisation', 'statut', 'proprietaire', 'verification', 'agent', 'date']) assert.ok(ids.includes(`dossier-field-${id}`), `Donnée manquante : ${id}`);
  for (const id of ['gestion', 'maintenance', 'demenagement', 'travaux']) assert.ok(ids.includes(`services-${id}`), `Service manquant : ${id}`);
  assert.ok(html.includes('/video/background_video.mp4'), 'La vidéo d’origine est conservée');
  assert.ok(html.includes('Pause vidéo'), 'Contrôle de la vidéo accessible');
  assert.ok(html.includes('démonstration'), 'Les données de démo doivent être signalées');
  console.log('Audit statique de production terminé (pas de test navigateur).');
  process.exit(0);
}

/* ------------------------------------------------------------------
   MODE HTTP — exploration réelle du site public
   ------------------------------------------------------------------ */
const START = '/';
const MAX_PAGES = 90;
const pages = new Map();
const queue = [START];
const failures = [];

const isCrawlable = (href) => {
  if (!href.startsWith('/')) return false;            // externe, courriel, téléphone
  if (href.startsWith('/_next/')) return false;
  if (href.startsWith('//')) return false;
  if (/\.[a-z0-9]{2,4}($|[?#])/i.test(href)) return false; // fichiers statiques
  if (href.includes('%')) return false;               // encodages non canoniques
  return true;
};

while (queue.length && pages.size < MAX_PAGES) {
  const path = queue.shift();
  if (pages.has(path)) continue;
  const response = await fetchOk(path);
  if (response.status !== 200) {
    failures.push(`${path} → HTTP ${response.status}`);
    pages.set(path, { status: response.status, html: '', ids: [], links: [] });
    continue;
  }
  const raw = await response.text();
  const inspected = inspect(path, raw);
  pages.set(path, { status: 200, ...inspected });
  for (const link of inspected.links) {
    const target = link.split('#')[0];
    if (isCrawlable(target) && !pages.has(target) && !queue.includes(target)) queue.push(target);
  }
}

assert.deepEqual(failures, [], `Liens internes cassés :\n${failures.join('\n')}`);
assert.ok(pages.size >= 40, `Exploration trop maigre : ${pages.size} pages`);

// Ancres inter-pages : /services#gestion doit exister sur /services.
for (const [path, page] of pages) {
  for (const link of page.links) {
    const [target, hash] = link.split('#');
    if (!hash || !target.startsWith('/')) continue;
    const destination = pages.get(target);
    assert.ok(destination, `${path} : ancre vers une page non explorée ${link}`);
    assert.ok(destination.ids.includes(hash), `${path} : ancre orpheline ${link}`);
  }
}

/* --- Attentes de contenu par page --------------------------------- */
const EXPECTED = {
  '/': [
    'L’immobilier commence par un lieu.',
    'Explorer HOMERA',
    'démonstration',
    'Pause vidéo',
  ],
  '/explorer': ['Explorer', 'Filtres', 'référence'],
  '/services': ['Sommaire des services', 'Fil d’Ariane', 'gestion'],
  '/a-propos': ['Sommaire de la page', 'protocole'],
  '/contact': ['Fil d’Ariane'],
  '/connexion': ['sans compte', 'Fil d’Ariane'],
  '/legal': ['Mentions légales', 'confidentialité'],
};
for (const [path, needles] of Object.entries(EXPECTED)) {
  const page = pages.get(path);
  assert.ok(page, `Page attendue absente du site : ${path}`);
  for (const needle of needles) assert.ok(page.html.includes(needle), `${path} : « ${needle} » introuvable`);
}

// Chaque page publique non-accueil hérite du même en-tête, du même pied de page
// et de la cible de saut d’accessibilité.
for (const [path, page] of pages) {
  if (path === '/') continue;
  assert.ok(page.ids.includes('contenu'), `${path} : cible de saut #contenu`);
  assert.ok(page.html.includes('Mentions légales'), `${path} : pied de page absent`);
  assert.ok(page.html.includes('/contact'), `${path} : lien de contact absent`);
}
// L’accueil conserve le header transparent de la vidéo.
assert.ok(pages.get('/').html.includes('homera-header'), 'l’accueil garde son en-tête transparent');

/* --- Accueil : chapitres, intentions, protocole, dossier ---------- */
const home = pages.get('/');
for (const id of ['hero', 'chiffres', 'explorer', 'biens', 'bien-homera', 'protocole', 'services', 'magazine', 'manifeste']) assert.ok(home.ids.includes(id), `Chapitre manquant : ${id}`);
for (const intent of ['acheter', 'louer', 'sejour', 'investir']) assert.ok(home.ids.includes(`intent-${intent}`), `Intention manquante : ${intent}`);
for (const id of ['acheter', 'louer', 'sejour', 'services']) assert.ok(home.ids.includes(`menu-${id}`), `Menu manquant : ${id}`);
for (let index = 0; index < 7; index++) assert.ok(home.ids.includes(`protocol-step-${index}`), `Étape manquante : ${index}`);
for (const id of ['localisation', 'statut', 'proprietaire', 'verification', 'agent', 'date']) assert.ok(home.ids.includes(`dossier-field-${id}`), `Donnée manquante : ${id}`);
for (const id of ['gestion', 'maintenance', 'demenagement', 'travaux']) assert.ok(home.ids.includes(`services-${id}`), `Service manquant : ${id}`);
assert.ok(home.html.includes('/video/background_video.mp4'), 'La vidéo d’origine est conservée');

/* --- Catalogue : les pages de projet mènent à de vrais biens ------ */
const catalogue = [...pages.keys()].filter((path) => /^\/(acheter|louer|sejour)(\/[a-z-]+)?$/.test(path.split('?')[0]));
assert.ok(catalogue.length >= 12, `Trop peu de pages de catalogue explorées : ${catalogue.length}`);
const propertyPages = [...pages.keys()].filter((path) => path.startsWith('/biens/'));
assert.ok(propertyPages.length >= 30, `Biens atteignables depuis les liens : ${propertyPages.length}`);
for (const path of [...catalogue, ...propertyPages]) {
  const page = pages.get(path);
  assert.ok((page.html.match(/data-cursor="property"/g) ?? []).length >= (path.startsWith('/biens/') ? 0 : 1), `${path} : aucune carte de bien`);
}
// Le serveur rend le premier écran : utile sans JavaScript, et paginable par l’adresse.
const countCards = (html) => new Set([...render(html).matchAll(/href="\/biens\/([^"]+)"/g)].map((match) => match[1])).size;
const unfiltered = await (await fetchOk('/explorer')).text();
const firstPage = countCards(unfiltered);
const secondPage = countCards(await (await fetchOk('/explorer?page=2')).text());
assert.ok(firstPage >= 9, `Premier écran trop maigre : ${firstPage} biens`);
assert.equal(secondPage, firstPage * 2, '?page=2 doit rendre deux écrans, sans JavaScript');
assert.match(render(unfiltered), /\d+ affichés sur \d+/, 'Le compteur de résultats doit être visible');

// Un filtre restreint réellement la liste, et reste plus étroit qu’un autre.
const sejour = await (await fetchOk('/explorer?intention=sejour')).text();
const sejourVillas = await (await fetchOk('/explorer?intention=sejour&type=villa')).text();
const sejourLinks = new Set([...render(sejour).matchAll(/href="\/biens\/([^"]+)"/g)].map((match) => match[1]));
const villaLinks = new Set([...render(sejourVillas).matchAll(/href="\/biens\/([^"]+)"/g)].map((match) => match[1]));
assert.ok(sejourLinks.size > 0, 'Le projet Séjour doit proposer des biens');
assert.ok(villaLinks.size > 0 && villaLinks.size < sejourLinks.size, 'Le type restreint bien le projet');
for (const link of villaLinks) assert.ok(sejourLinks.has(link), `${link} n’appartient pas au projet Séjour`);
assert.ok(sejour.includes('Séjour'), 'Le filtre actif est rappelé à l’écran');

// Recherche texte : un terme sans résultat affiche un état vide explicite.
const empty = await (await fetchOk('/explorer?q=zzz-aucun-bien')).text();
assert.ok(/aucun|Aucun/.test(empty), 'L’état vide doit être explicite');
// Une page hors bornes retombe sur la dernière page réelle, sans erreur.
const beyond = await fetchOk('/explorer?page=99');
assert.equal(beyond.status, 200, 'Une page hors bornes reste servie');

/* --- Page 404 ------------------------------------------------------ */
for (const path of ['/cette-page-nexiste-pas', '/biens/inexistant']) {
  const response = await fetchOk(path);
  assert.equal(response.status, 404, `${path} : statut 404 attendu`);
  const html = render(await response.text());
  assert.ok(html.includes('Erreur 404'), `${path} : page 404 éditoriale absente`);
  assert.ok(html.includes('Explorer tous les biens'), `${path} : sortie de secours absente`);
  assert.ok(!html.includes('NaN'), `${path} : valeur NaN`);
}

/* --- CSS compilé et images ---------------------------------------- */
const homeRaw = await (await fetchOk('/')).text();
const cssPaths = [...new Set([...homeRaw.matchAll(/href="([^\"]+\.css(?:\?[^\"]*)?)"/g)].map((match) => match[1].replaceAll('&amp;', '&')))];
let css = '';
for (const path of cssPaths) css += await (await fetchOk(path)).text();
for (const selector of ['homera-hero-video', 'homera-intent-doors', 'homera-property-gallery', 'homera-story-sticky', 'homera-dossier-field', 'homera-protocol-copy', 'homera-final-action', 'homera-public-header', 'homera-filter-dialog', 'homera-property-image', 'homera-page-hero-image']) {
  assert.ok(css.includes(selector), `CSS non compilé : ${selector}`);
}
assert.ok(css.includes('prefers-reduced-motion'), 'CSS pour le mouvement réduit');
// Les tokens de design doivent survivre au build avec une valeur réelle :
// une déclaration circulaire (--x: var(--x)) compile en valeur invalide.
for (const token of ['--duration-instant', '--duration-base', '--duration-scene', '--space-section', '--space-section-scene', '--radius-modal', '--radius-card', '--info', '--ring', '--surface-hover']) {
  const values = [...css.matchAll(new RegExp(`${token}:\\s*([^;}]+)`, 'g'))].map((match) => match[1].trim());
  assert.ok(values.length, `${token} absent du CSS compilé`);
  assert.ok(values.some((value) => !value.includes(token)), `${token} n'a que des déclarations circulaires dans le CSS compilé`);
}
assert.match(css, /\.homera-dropdown-enter\{animation:[^}]*var\(--duration-instant\)/, 'le dropdown n\'utilise pas le token de durée');
assert.ok(css.includes('min-height: 700px') || css.includes('min-height:700px'), 'Garde de hauteur pour les sticky');
const image = await fetchOk('/_next/image?url=%2Fimages%2Fprop-villa.jpg&w=1080&q=72', { headers: { Accept: 'image/avif' } });
assert.ok(image.status === 200 && image.headers.get('content-type')?.startsWith('image/'), 'Image optimisée servie');
const bytes = (await image.arrayBuffer()).byteLength;
assert.ok(bytes > 0, 'Image non vide');

console.log(`✓ ${pages.size} pages publiques explorées, ${[...pages.values()].reduce((total, page) => total + page.ids.length, 0)} identifiants uniques, aucun lien interne cassé`);
console.log('✓ Accueil : 9 chapitres, 4 intentions, 6 données reliées, 7 étapes, 4 services');
console.log('✓ Catalogue : projets, catégories et fiches atteignables ; filtres et états vides servis côté serveur');
console.log(`✓ CSS des scènes et du mouvement réduit compilé ; image ${image.headers.get('content-type')} : ${bytes} octets`);
console.log('Audit HTTP terminé (pas de test visuel ou tactile).');
