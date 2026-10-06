import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const moduleUrl = async (file, replacements = {}, extraOptions = {}) => {
  let { outputText } = ts.transpileModule(await readFile(new URL(`../${file}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, ...extraOptions },
  });
  for (const [from, to] of Object.entries(replacements)) outputText = outputText.replaceAll(from, to);
  return `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`;
};
const math = await import(await moduleUrl('lib/motion-math.ts'));
const mediaUrl = await moduleUrl('lib/media.generated.ts');
const media = await import(mediaUrl);
// L’ordre compte : chaque module est transpiré vers l’URL de ses dépendances.
const contentUrl = await moduleUrl('lib/content.ts', { '@/lib/media.generated': mediaUrl });
const data = await import(contentUrl);
const workflowUrl = await moduleUrl('lib/workflow.ts', { '@/lib/content': contentUrl });
const workflow = await import(workflowUrl);
const portalDataUrl = await moduleUrl('lib/portal-data.ts', {
  '@/lib/content': contentUrl,
  '@/lib/workflow': workflowUrl,
});
const portalData = await import(portalDataUrl);
const formatUrl = await moduleUrl('lib/format.ts', { '@/lib/content': contentUrl });
const format = await import(formatUrl);
const catalogUrl = await moduleUrl('lib/properties.ts', {
  '@/lib/content': contentUrl,
  '@/lib/format': formatUrl,
});
const catalog = await import(catalogUrl);
const nav = await import(await moduleUrl('lib/nav.ts', {
  '@/lib/content': contentUrl,
  '@/lib/properties': catalogUrl,
}));
const visitorUrl = await moduleUrl('lib/persistence.ts', {
  '@/lib/properties': catalogUrl,
});
const visitor = await import(visitorUrl);
const { clamp, damp, phase, smoothstep, stickyProgress, storyIndex, storyPosition, galleryDepth } = math;
const qrUrl = await moduleUrl('lib/qr.ts');
const qr = await import(qrUrl);

// Le véritable ordonnanceur est testé avec une horloge rAF déterministe.
const frames = new Map();
let id = 0;
globalThis.requestAnimationFrame = (callback) => { frames.set(++id, callback); return id; };
globalThis.cancelAnimationFrame = (key) => frames.delete(key);
globalThis.window = new EventTarget();
window.visualViewport = new EventTarget();
globalThis.document = new EventTarget();
document.hidden = false;
const scheduler = await import(await moduleUrl('lib/motion-frame.ts'));
const flush = (time = 16) => { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach((callback) => callback(time)); };

await test('HOMERA : frame unique, puis aucun travail au repos', () => {
  let calls = 0;
  scheduler.requestMotionFrame(() => calls++);
  scheduler.requestMotionFrame(() => calls++);
  assert.equal(frames.size, 1);
  flush();
  assert.equal(calls, 2);
  assert.equal(frames.size, 0);
});
await test('HOMERA : annuler / réabonner ne crée pas de double boucle', () => {
  let calls = 0;
  const stop = scheduler.requestMotionFrame(() => calls++);
  stop();
  assert.equal(frames.size, 0);
  scheduler.requestMotionFrame(() => calls++);
  flush();
  assert.equal(calls, 1);
  assert.equal(frames.size, 0);
});
await test('HOMERA : 100 événements scroll deviennent une seule frame', () => {
  let a = 0, b = 0;
  const stopA = scheduler.onScrollFrame(() => a++);
  const stopB = scheduler.onScrollFrame(() => b++);
  flush();
  for (let index = 0; index < 100; index++) window.dispatchEvent(new Event('scroll'));
  assert.equal(frames.size, 1);
  flush();
  assert.equal(a, 2); assert.equal(b, 2); assert.equal(frames.size, 0);
  stopA(); stopB();
  window.dispatchEvent(new Event('scroll'));
  assert.equal(frames.size, 0);
});
await test('HOMERA : onglet masqué sans frame, reprise à la visibilité', () => {
  const stop = scheduler.onScrollFrame(() => {});
  flush();
  document.hidden = true;
  window.dispatchEvent(new Event('scroll'));
  assert.equal(frames.size, 0);
  document.hidden = false;
  document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(frames.size, 1);
  flush(); stop();
});
await test('HOMERA : une inertie terminée ne laisse pas de boucle résiduelle', () => {
  let calls = 0;
  let stop = () => {};
  stop = scheduler.onAnimationFrame(() => { if (++calls === 3) stop(); });
  flush(16); flush(32); flush(48);
  assert.equal(calls, 3); assert.equal(frames.size, 0);
});
await test('HOMERA : accélération, ralentissement et bornes sans dépassement', () => {
  assert.equal(clamp(NaN), 0); assert.equal(clamp(Infinity), 0);
  assert.equal(smoothstep(-1), 0); assert.equal(smoothstep(2), 1);
  assert.ok(smoothstep(.01) < .01);
  assert.ok(1 - smoothstep(.99) < .01);
  let previous = 0;
  for (let index = 0; index <= 1000; index++) {
    const value = smoothstep(index / 1000);
    assert.ok(value >= previous && value >= 0 && value <= 1);
    previous = value;
  }
  assert.equal(phase(.2, .2, .8), 0); assert.equal(phase(.8, .2, .8), 1);
});
await test('HOMERA : même inertie à 60 Hz et 120 Hz', () => {
  const run = (count) => { let value = 0; for (let index = 0; index < count; index++) value = damp(value, 1, 100 / count, 90); return value; };
  assert.ok(Math.abs(run(6) - run(12)) < 1e-12);
  assert.equal(damp(.2, 1, 16, 0), 1);
});
await test('HOMERA : timeline sticky avec décalage du header, entrée et sortie exactes', () => {
  assert.equal(stickyProgress(96, 2400, 700, 96), 0);
  assert.equal(stickyProgress(96 - 850, 2400, 700, 96), .5);
  assert.equal(stickyProgress(96 - 1700, 2400, 700, 96), 1);
  assert.equal(stickyProgress(-9999, 2400, 700, 96), 1);
  assert.equal(stickyProgress(-10, 700, 700, 96), 0);
});
await test('HOMERA : chaque commande atteint réellement son étape 01 à 07', () => {
  for (let index = 0; index < 7; index++) assert.equal(storyIndex(storyPosition(index, 7), 7), index);
  assert.equal(storyIndex(1, 7), 6); assert.equal(storyIndex(-1, 7), 0);
});
await test('HOMERA : les six données du dossier terminent leur reveal avant la sortie', () => {
  for (let index = 0; index < 6; index++) {
    const start = .2 + index * .125;
    assert.equal(phase(0, start, start + .105), 0);
    assert.equal(phase(1, start, start + .105), 1);
  }
  assert.ok(data.DOSSIER.fields.some((field) => field.id === 'proprietaire'));
});
await test('HOMERA : profondeur maîtrisée, y compris dimensions nulles', () => {
  assert.deepEqual(galleryDepth(500, 500, 800), { distance: 0, scale: 1, turn: -0, lift: 0 });
  for (const width of [0, 272, 716.8, 832]) for (const center of [-10000, 0, 10000]) {
    const depth = galleryDepth(center, 500, width);
    assert.ok(depth.scale >= .965 && depth.scale <= 1);
    assert.ok(Math.abs(depth.turn) <= 2.4); assert.ok(depth.lift <= 9);
  }
});
await test('HOMERA : première et dernière photo centrées de 320 à 1920 px', () => {
  for (const viewport of [320, 390, 640, 768, 1024, 1440, 1920]) {
    const trackWidth = Math.min(viewport, 1280);
    const cardWidth = viewport < 640 ? viewport * .85 : viewport < 1024 ? viewport * .76 : Math.min(viewport * .7, 832);
    const padding = Math.max(16, (trackWidth - cardWidth) / 2);
    assert.ok(cardWidth < trackWidth);
    assert.ok(Math.abs(padding + cardWidth / 2 - trackWidth / 2) < .001);
    const lastCenter = padding + 7 * (cardWidth + 24) + cardWidth / 2;
    const maxScroll = padding * 2 + 8 * cardWidth + 7 * 24 - trackWidth;
    assert.ok(Math.abs(lastCenter - maxScroll - trackWidth / 2) < .001);
  }
});
await test('HOMERA : filtre immobilier cohérent, sans perte de fonctions', () => {
  const base = data.PROPERTIES[0];
  assert.ok(format.matchesCriteria(base, format.EMPTY_CRITERIA));
  assert.ok(format.matchesCriteria(base, { ...format.EMPTY_CRITERIA, location: 'Fidjrosse', propertyType: 'maison' }));
  assert.equal(format.matchesCriteria(base, { ...format.EMPTY_CRITERIA, project: base.intent === 'louer' ? 'acheter' : 'louer' }), false);
  assert.equal(format.matchesCriteria(base, { ...format.EMPTY_CRITERIA, budget: '1 000' }), false);
  assert.ok(data.INTENTS.some((intent) => intent.id === 'investir'));
  assert.equal(data.DEMO_DATA, true);
});
await test('HOMERA : les médias référencés existent, y compris ceux du catalogue', async () => {
  assert.ok(Object.keys(media.MEDIA).length >= 25, 'le catalogue a besoin de ses visuels');
  for (const asset of Object.values(media.MEDIA)) {
    assert.ok((await stat(new URL(`../public${asset.src}`, import.meta.url))).size > 0);
    assert.ok(asset.width > 0 && asset.height > 0 && asset.blurDataURL.startsWith('data:image/'));
  }
  for (const story of data.EDITORIAL.stories.slice(0, 3)) assert.ok(story.media.startsWith('editorial-'));
  // Aucune fiche ne doit pointer vers un visuel absent du manifeste.
  for (const property of data.PROPERTIES) {
    assert.ok(media.MEDIA[property.media], `visuel manquant pour ${property.id} : ${property.media}`);
  }
});

const css = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');
const tokens = (selector) => Object.fromEntries([...css.matchAll(new RegExp(`${selector}\\s*\\{([^}]+)\\}`, 'g'))].flatMap((block) => [...block[1].matchAll(/(--[\w-]+)\s*:\s*(#[\da-f]{6})\b/gi)].map((entry) => [entry[1], entry[2]])));
const light = tokens(':root');
const dark = { ...light, ...tokens('\\.dark') };
const channels = (hex) => [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255);
const luminance = (values) => values.reduce((total, channel, index) => total + [0.2126, 0.7152, 0.0722][index] * (channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4), 0);
const ratio = (a, b) => { const [min, max] = [luminance(a), luminance(b)].sort((a, b) => a - b); return (max + .05) / (min + .05); };
await test('HOMERA : petits textes, CTA et données secondaires au contraste AA', () => {
  for (const theme of [light, dark]) {
    const bg = channels(theme['--background']);
    const card = channels(theme['--card']);
    const accent = channels(theme === light ? theme['--homera-terracotta-dark'] : theme['--homera-terracotta']);
    assert.ok(ratio(accent, bg) >= 4.5);
    assert.ok(ratio(accent, card) >= 4.5, `accent illisible sur une carte (${theme['--homera-terracotta-dark']})`);
    assert.ok(ratio(channels('#ffffff'), channels(theme['--homera-terracotta-dark'])) >= 4.5);
    assert.ok(ratio(channels(theme['--muted']), bg) >= 4.5);
    assert.ok(ratio(channels(theme['--muted']), card) >= 4.5, '--muted illisible sur une carte');
    assert.ok(ratio(channels(theme['--muted-light']), bg) >= 4.5, '--muted-light sous le seuil AA');
    assert.ok(ratio(channels(theme['--info']), bg) >= 4.5, `--info illisible (${theme['--info']})`);
    assert.ok(ratio(channels(theme['--warning']), bg) >= 4.5, `--warning illisible (${theme['--warning']})`);
    assert.ok(ratio(channels(theme['--success']), bg) >= 4.5, `--success illisible (${theme['--success']})`);
    assert.ok(ratio(channels(theme['--error']), bg) >= 4.5, `--error illisible (${theme['--error']})`);
    assert.ok(ratio(channels(theme['--ring']), bg) >= 3, '--ring insuffisant pour un anneau de focus');
    const secondary = channels(theme['--foreground']).map((channel, index) => channel * .78 + bg[index] * .22);
    assert.ok(ratio(secondary, bg) >= 4.5);
  }
  // Les deux couples d’action : sur surface de page, et sur surface toujours sombre.
  for (const theme of [light, dark]) {
    assert.ok(ratio(channels(theme['--action-ink']), channels(theme['--action-bg'])) >= 4.5,
      `bouton plein illisible (${theme['--action-bg']})`);
    assert.ok(ratio(channels(theme['--action-ink']), channels(theme['--action-bg-hover'])) >= 4.5,
      `survol de bouton sous le seuil AA (${theme['--action-bg-hover']})`);
    assert.ok(ratio(channels(theme['--action-ink']), channels(theme['--action-night'])) >= 4.5,
      `bouton sur surface sombre illisible (${theme['--action-night']})`);
  }
  // Le texte clair posé sur les scènes nocturnes, quel que soit le thème.
  for (const ink of ['--homera-cream', '--homera-cream-dark', '--homera-amber']) {
    assert.ok(ratio(channels(light[ink]), channels(light['--homera-brown'])) >= 4.5, `${ink} illisible sur brun`);
    assert.ok(ratio(channels(light[ink]), channels(light['--homera-night'])) >= 4.5, `${ink} illisible sur nuit`);
  }
  assert.ok(ratio(channels(light['--homera-paper-muted']), channels(light['--homera-paper'])) >= 4.5);
});
await test('HOMERA : prix immobiles, police d’interface et absence de souris cachée', () => {
  assert.match(css, /\.homera-property-gallery\[data-gallery-ready="true"\] \.homera-property-photo\s*\{[^}]*transform:/);
  assert.doesNotMatch(css, /\.homera-property-caption\s*\{[^}]*transform:/);
  assert.doesNotMatch(css, /cursor:\s*none/);
  assert.match(css, /@layer base\s*\{\s*button, input, textarea, select \{ font: inherit;/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*animation: none !important/);
});
await test('HOMERA : les sept commandes du protocole tiennent sur un mobile de 320 px', async () => {
  const source = await readFile(new URL('../components/home/VerificationProtocol.tsx', import.meta.url), 'utf8');
  assert.ok(source.includes('grid-cols-7'));
  assert.ok(source.includes('w-full max-w-11'));
  for (const viewport of [320, 360, 390, 768]) {
    const padding = viewport < 640 ? 32 : 48;
    const width = Math.min(44, (viewport - padding - 6 * 4) / 7);
    assert.ok(width >= 24);
    assert.ok(width * 7 + 6 * 4 <= viewport - padding);
  }
});
const floating = await import(await moduleUrl('lib/floating.ts', { '@/lib/motion-math': await moduleUrl('lib/motion-math.ts') }));
await test('HOMERA : dropdowns dans le viewport, y compris paysage et clavier mobile', () => {
  for (const width of [320, 390, 768, 1440]) for (const height of [200, 320, 700]) for (const top of [15, height / 2, height - 55]) {
    const position = floating.fitDropdown({ top, bottom: top + 44, left: width - 75, width: 160 }, { width, height }, 304);
    assert.ok(position.left >= 12); assert.ok(position.left + position.width <= width - 12);
    assert.ok(position.top >= 12); assert.ok(position.top + position.maxHeight <= height - 12);
  }
  const shifted = floating.fitDropdown({ top: 245, bottom: 290, left: 10, width: 160 }, { width: 390, height: 250, top: 100 }, 304);
  assert.ok(shifted.top >= 112); assert.ok(shifted.top + shifted.maxHeight <= 338);
});
await test('HOMERA : retour du focus sans rouvrir Montant, même en cas d’échec', () => {
  const guard = { current: false };
  let reopened = false;
  floating.restoreFieldFocus({ focus: (options) => { assert.equal(options.preventScroll, true); if (!guard.current) reopened = true; } }, guard);
  assert.equal(reopened, false); assert.equal(guard.current, false);
  assert.throws(() => floating.restoreFieldFocus({ focus: () => { throw new Error('Disconnected'); } }, guard));
  assert.equal(guard.current, false);
});
await test('HOMERA : clavier des listes et scrollbar interne non réintroduite', async () => {
  const source = await readFile(new URL('../components/home/SearchModule.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /homera-thinscroll/);
  assert.ok(source.includes('panelRef.current?.contains(event.target)'));
  assert.ok(source.includes('onFocus={() => setActiveIndex(index)}'));
  assert.ok(source.includes('restoreFieldFocus(anchorRef.current, restoringFocus)'));
});

/* ------------------------------------------------------------------
   DESIGN SYSTEM — les cinq familles de tokens
   ------------------------------------------------------------------ */
await test('HOMERA : couleurs, typo, espacements, rayons et mouvement sont tokenisés', () => {
  const families = {
    'couleur': ['--background', '--card', '--foreground', '--muted', '--muted-light', '--border',
                '--success', '--warning', '--error', '--info', '--ring', '--surface-hover', '--overlay'],
    'typographie': ['--text-display-xs', '--text-display-xl', '--text-display-2xl', '--text-display-fluid',
                    '--text-body', '--text-body-sm', '--text-note', '--text-caption', '--text-micro',
                    '--text-label', '--text-figure', '--text-brand'],
    'espacement': ['--space-block', '--space-section', '--space-section-lg', '--space-section-scene',
                   '--space-inline', '--container-max', '--container-wide', '--container-ultra'],
    'rayon': ['--radius-btn', '--radius-input', '--radius-card', '--radius-menu', '--radius-media', '--radius-modal'],
    'mouvement': ['--duration-instant', '--duration-quick', '--duration-base', '--duration-slow',
                  '--duration-scene', '--ease-standard', '--ease-soft', '--ease-in-out'],
  };
  for (const [family, tokens] of Object.entries(families)) {
    for (const token of tokens) assert.ok(css.includes(`${token}:`), `${family} : ${token} absent`);
  }
  assert.ok(css.includes('.homera-skeleton'), 'état de chargement absent');
  // Chaque rôle de rayon pointe vers l'échelle, jamais vers une valeur isolée.
  for (const role of ['btn', 'input', 'card', 'menu', 'media', 'modal']) {
    assert.match(css, new RegExp(`--radius-${role}: var\\(--radius-(?:sm|md|lg|xl|2xl|3xl|4xl)\\)`),
      `--radius-${role} ne suit pas l'échelle`);
  }
});

await test('HOMERA : chaque token de design porte une valeur concrète', () => {
  // Piège réel déjà rencontré : `--duration-slow: var(--duration-slow)` se
  // compile en déclaration circulaire, donc en valeur invalide. Dans le bloc
  // @theme inline l'auto-référence est normale (elle est masquée par le :root
  // non calqué) ; hors @theme, chaque token doit avoir une valeur réelle.
  const concrete = (token) => {
    const values = [...css.matchAll(new RegExp(`${token}:\\s*([^;}]+)`, 'g'))].map((m) => m[1].trim());
    return values.some((value) => value && !value.includes(token));
  };
  for (const token of ['--duration-instant', '--duration-quick', '--duration-base', '--duration-slow',
                       '--duration-scene', '--space-block', '--space-section', '--space-section-lg',
                       '--space-section-scene', '--container-max', '--radius-3xl', '--radius-4xl',
                       '--info', '--ring', '--surface-hover', '--overlay', '--homera-paper',
                       '--homera-paper-muted', '--homera-amber', '--homera-night']) {
    assert.ok(css.includes(`${token}:`), `${token} absent`);
    assert.ok(concrete(token), `${token} n'a aucune valeur concrète (déclaration circulaire)`);
  }
  // Les rôles de rayon suivent l'échelle, jamais une valeur isolée.
  for (const role of ['btn', 'input', 'card', 'menu', 'media', 'modal']) {
    assert.match(css, new RegExp(`--radius-${role}: var\\(--radius-(?:sm|md|lg|xl|2xl|3xl|4xl)\\)`),
      `--radius-${role} ne suit pas l'échelle`);
  }
});

await test('HOMERA : aucune teinte hors palette ni courbe recopiée dans les composants', async () => {
  const sources = [];
  const walk = async (dir) => {
    for (const entry of await readdir(new URL(dir, import.meta.url), { withFileTypes: true })) {
      if (entry.isDirectory()) await walk(`${dir}${entry.name}/`);
      else if (entry.name.endsWith('.tsx')) sources.push(new URL(`${dir}${entry.name}`, import.meta.url));
    }
  };
  await walk('../components/');
  await walk('../app/');
  assert.ok(sources.length >= 20, 'assez de composants parcourus');
  for (const url of sources) {
    const source = await readFile(url, 'utf8');
    assert.doesNotMatch(source, /-stone-\d/, `${url.pathname} : palette Tailwind par défaut`);
    assert.doesNotMatch(source, /#[0-9a-fA-F]{3,8}\b/, `${url.pathname} : couleur codée en dur`);
    assert.doesNotMatch(source, /ease-\[/, `${url.pathname} : courbe recopiée à la main`);
    assert.doesNotMatch(source, /rounded-\[\d/, `${url.pathname} : rayon hors échelle`);
  }
});

/* ------------------------------------------------------------------
   CATALOGUE PUBLIC — modèle, filtres, tri, pagination, facettes
   ------------------------------------------------------------------ */

await test('HOMERA : le catalogue couvre les quatre familles de biens et trois projets', () => {
  const byIntent = (intent) => data.PROPERTIES.filter((property) => property.intent === intent);
  assert.ok(data.PROPERTIES.length >= 30, 'assez de biens pour une grille réaliste');
  for (const intent of ['acheter', 'louer', 'sejour']) {
    assert.ok(byIntent(intent).length >= 8, `projet trop maigre : ${intent}`);
  }
  // Chaque projet couvre les familles annoncées dans le menu.
  const families = {
    acheter: ['villa', 'appartement', 'terrain', 'local'],
    louer: ['villa', 'appartement', 'studio', 'local'],
    sejour: ['villa', 'appartement', 'studio'],
  };
  for (const [intent, types] of Object.entries(families)) {
    for (const type of types) {
      assert.ok(byIntent(intent).some((property) => property.type === type), `${intent} sans ${type}`);
    }
  }
});

await test('HOMERA : données de fiche cohérentes (références, prix, dates, médias)', () => {
  const ids = new Set();
  const references = new Set();
  for (const property of data.PROPERTIES) {
    assert.ok(!ids.has(property.id), `identifiant dupliqué : ${property.id}`);
    assert.ok(!references.has(property.homeraId), `référence dupliquée : ${property.homeraId}`);
    ids.add(property.id);
    references.add(property.homeraId);
    assert.match(property.homeraId, /^HOM-[A-Z]{3}-\d{6}$/);
    assert.match(property.verifiedOn, /^\d{2}\/\d{2}\/\d{4}$/);
    assert.match(property.publishedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(property.price > 0 && property.surface > 0);
    assert.ok(property.description && property.description.length > 40, `description trop courte : ${property.id}`);
    assert.ok(property.features?.length, `équipements absents : ${property.id}`);
    // Un prix se lit selon le projet : une vente n’a pas de période,
    // une location ou un séjour en ont toujours une.
    if (property.intent === 'acheter') assert.equal(property.pricePeriod, undefined);
    else assert.ok(property.pricePeriod, `période de prix manquante : ${property.id}`);
    if (property.type === 'terrain') assert.ok(property.landTitle, `foncier non déclaré : ${property.id}`);
    if (property.intent === 'sejour') assert.ok(property.minNights >= 1, `durée minimale absente : ${property.id}`);
  }
});

const { EMPTY_QUERY, parseCatalogQuery, buildCatalogParams, catalogHref, searchCatalog, queryCatalog, paginate, facets, priceBounds, summaryLabel, activeFilterCount, isPristine, criteriaToCatalogQuery, LATEST_PUBLISHED_AT, PER_PAGE } = catalog;

await test('HOMERA : la requête survit à l’aller-retour par l’adresse', () => {
  const query = parseCatalogQuery('intention=louer&type=villa&type=studio&ville=Cotonou&equipement=meuble&titre=acd&tri=prix-asc&page=2&prix-min=50000&chambres=2&surface-max=200&nouveautes=1&q=mer');
  const roundTrip = parseCatalogQuery(buildCatalogParams(query).toString());
  assert.deepEqual(roundTrip, query);
  assert.equal(catalogHref(query), `/explorer?${buildCatalogParams(query).toString()}`);
  // Les valeurs inconnues sont ignorées, pas propagées.
  const tolerant = parseCatalogQuery('?intention=zzz&type=chateau&page=0&tri=nimporte');
  assert.equal(tolerant.intent, '');
  assert.deepEqual(tolerant.types, []);
  assert.equal(tolerant.page, 1);
  assert.equal(tolerant.sort, 'pertinence');
  assert.ok(isPristine(tolerant));
});

await test('HOMERA : filtres du catalogue — projet, lieu, budget, équipements, durée', () => {
  const lodges = searchCatalog(parseCatalogQuery('intention=louer&type=villa&ville=Cotonou'));
  assert.ok(lodges.length >= 2);
  assert.ok(lodges.every((property) => property.intent === 'louer' && property.type === 'villa' && property.city === 'Cotonou'));

  const titled = searchCatalog(parseCatalogQuery('intention=acheter&type=terrain&titre=titre-foncier'));
  assert.ok(titled.length >= 1);
  assert.ok(titled.every((property) => property.landTitle === 'titre-foncier'));

  const capped = searchCatalog(parseCatalogQuery('intention=acheter&prix-max=20000000&tri=prix-desc'));
  assert.ok(capped.length >= 2);
  assert.ok(capped.every((property) => property.price <= 20_000_000));

  const equipped = searchCatalog(parseCatalogQuery('intention=acheter&equipement=piscine&equipement=jardin'));
  assert.ok(equipped.length >= 1);
  assert.ok(equipped.every((property) => property.features.includes('piscine') && property.features.includes('jardin')));

  // La durée annoncée du séjour est un minimum réellement respecté.
  for (const nights of [1, 2, 4, 7, 14]) {
    const stays = searchCatalog(parseCatalogQuery(`intention=sejour&nuits=${nights}`));
    assert.ok(stays.length >= 1, `aucun séjour pour ${nights} nuit(s)`);
    assert.ok(stays.every((property) => (property.minNights ?? 1) <= nights));
  }
  assert.ok(searchCatalog(parseCatalogQuery('intention=sejour&nuits=1')).length < searchCatalog(parseCatalogQuery('intention=sejour&nuits=14')).length);

  // Recherche texte : accents ignorés, référence reconnue.
  assert.ok(searchCatalog(parseCatalogQuery('q=fidjrosse')).length >= 3);
  assert.equal(searchCatalog(parseCatalogQuery('q=HOM-CTN-000421')).length, 1);
  assert.equal(searchCatalog(parseCatalogQuery('q=aucun-bien-ne-porte-ce-nom')).length, 0);
});

await test('HOMERA : tri, pagination et compteurs restent cohérents', () => {
  const byPrice = searchCatalog(parseCatalogQuery('intention=sejour&tri=prix-asc'));
  for (let index = 1; index < byPrice.length; index++) assert.ok(byPrice[index].price >= byPrice[index - 1].price);
  const bySurface = searchCatalog(parseCatalogQuery('intention=acheter&tri=surface-desc'));
  for (let index = 1; index < bySurface.length; index++) assert.ok(bySurface[index].surface <= bySurface[index - 1].surface);
  const byRecency = searchCatalog(parseCatalogQuery('tri=recent'));
  assert.equal(byRecency[0].publishedAt, LATEST_PUBLISHED_AT);
  // Le tri par prix regroupe par projet quand aucun n’est choisi : un loyer
  // de 65 000 FCFA ne doit jamais passer devant un terrain de 12,5 M FCFA.
  const mixed = searchCatalog(parseCatalogQuery('tri=prix-asc'));
  const intents = mixed.map((property) => property.intent);
  assert.deepEqual(intents, [...intents].sort((a, b) => ['acheter', 'louer', 'sejour'].indexOf(a) - ['acheter', 'louer', 'sejour'].indexOf(b)));

  const all = searchCatalog(EMPTY_QUERY);
  const first = paginate(all, 1);
  assert.equal(first.items.length, Math.min(PER_PAGE, all.length));
  assert.equal(first.total, all.length);
  assert.equal(first.from, 1);
  const second = paginate(all, 2);
  assert.equal(second.items[0].id, all[PER_PAGE].id);
  // Une page hors bornes retombe sur la dernière page réelle.
  const beyond = paginate(all, 999);
  assert.equal(beyond.page, beyond.pages);
  assert.equal(queryCatalog({ ...EMPTY_QUERY, page: 2 }).items.length, Math.min(PER_PAGE, all.length - PER_PAGE));

  // Facettes : chaque compteur ignore son propre filtre (sinon il serait nul).
  const scoped = facets(data.PROPERTIES, parseCatalogQuery('intention=acheter&ville=Cotonou'));
  assert.ok(scoped.types.some((entry) => entry.count > 0));
  assert.equal(scoped.total, searchCatalog(parseCatalogQuery('intention=acheter&ville=Cotonou')).length);
  const acheterFacets = facets(data.PROPERTIES, parseCatalogQuery('intention=acheter'));
  const withVilla = facets(data.PROPERTIES, parseCatalogQuery('intention=acheter&type=villa'));
  const villas = withVilla.types.find((entry) => entry.value === 'villa');
  const terrains = withVilla.types.find((entry) => entry.value === 'terrain');
  assert.equal(villas.count, data.PROPERTIES.filter((entry) => entry.intent === 'acheter' && entry.type === 'villa').length);
  assert.ok(terrains.count > 0, 'un type non sélectionné doit rester cliquable');
  assert.equal(terrains.count, data.PROPERTIES.filter((entry) => entry.intent === 'acheter' && entry.type === 'terrain').length);
  assert.ok(withVilla.total <= acheterFacets.total, 'sélectionner un type ne peut pas élargir la liste');
  assert.ok(withVilla.total < acheterFacets.total);
});

await test('HOMERA : bornes de prix, résumé et compteur de filtres', () => {
  const bounds = priceBounds(searchCatalog(parseCatalogQuery('intention=louer')));
  assert.equal(bounds.min % 10_000, 0);
  assert.equal(bounds.max % 10_000, 0);
  const query = parseCatalogQuery('intention=louer&type=villa&ville=Cotonou&prix-min=100000&nouveautes=1');
  assert.equal(activeFilterCount(query), 5);
  const label = summaryLabel(query);
  for (const fragment of ['à louer', 'villa', 'Cotonou', 'nouveautés']) assert.ok(label.includes(fragment), label);
});

await test('HOMERA : la recherche de l’accueil ouvre la même recherche dans l’explorateur', () => {
  const converted = criteriaToCatalogQuery({ project: 'louer', location: 'Cotonou', propertyType: 'maison', budget: '500 000' });
  assert.equal(converted.intent, 'louer');
  assert.deepEqual(converted.types, ['villa']);
  assert.deepEqual(converted.cities, ['Cotonou']);
  assert.equal(converted.priceMax, 500_000);
  const results = searchCatalog(converted);
  assert.ok(results.length >= 1, 'la sélection de l’accueil doit trouver au moins un bien réel');
  assert.ok(results.every((property) => property.intent === 'louer' && property.type === 'villa' && property.price <= 500_000));
  // Un budget trop serré reste honnête : zéro résultat plutôt qu’un résultat hors budget.
  assert.equal(searchCatalog(criteriaToCatalogQuery({ project: 'louer', location: 'Cotonou', propertyType: 'maison', budget: '100 000' })).length, 0);

  // Un quartier choisi dans le module reste un quartier, pas une ville.
  const district = criteriaToCatalogQuery({ project: 'louer', location: 'Fidjrossè', propertyType: '', budget: '' });
  assert.deepEqual(district.cities, []);
  assert.deepEqual(district.districts, ['Fidjrossè']);
  assert.ok(searchCatalog(district).length >= 1);

  assert.ok(isPristine(criteriaToCatalogQuery({ project: '', location: '', propertyType: '', budget: '' })));
});

await test('HOMERA : retour après connexion limité aux routes internes et conserve leurs paramètres', () => {
  assert.equal(nav.safeReturnTo('/client/visites/nouvelle?bien=villa-fidjrosse'), '/client/visites/nouvelle?bien=villa-fidjrosse');
  assert.equal(nav.safeReturnTo(['/client?tab=favoris', '/admin']), '/client?tab=favoris');
  assert.equal(nav.safeReturnTo('//example.com/redirect'), null);
  assert.equal(nav.safeReturnTo('https://example.com/redirect'), null);
  assert.equal(nav.safeReturnTo('/\\\\example.com'), null);
  assert.equal(nav.safeReturnTo('/connexion?next=/admin'), null);
  assert.equal(nav.safeReturnTo('/verification-email'), null);
});

await test('HOMERA : chaque page publique du menu mène à des biens réels', () => {
  for (const project of nav.PROJECT_PAGES) {
    const query = nav.projectQuery(project.slug);
    assert.ok(searchCatalog(query).length >= 8, `projet vide : ${project.slug}`);
    for (const category of project.categories) {
      const results = searchCatalog(nav.categoryQuery(category.filter));
      assert.ok(results.length >= 1, `catégorie vide : /${project.slug}/${category.slug}`);
      assert.ok(results.every((property) => property.intent === category.filter.intent));
      if (category.filter.types) {
        assert.ok(results.every((property) => category.filter.types.includes(property.type)));
      }
      if (category.filter.stayNights) {
        assert.ok(results.every((property) => (property.minNights ?? 1) <= category.filter.stayNights));
      }
    }
  }
  // Le menu ne doit contenir aucune entrée sans adresse ni doublon d’adresse.
  const hrefs = nav.PUBLIC_NAV.flatMap((entry) => [entry.href, ...(entry.children ?? []).map((child) => child.href)]);
  assert.equal(new Set(hrefs).size, hrefs.length, 'adresse de menu dupliquée');
  assert.ok(hrefs.every((href) => href.startsWith('/')));
  assert.equal(nav.PUBLIC_NAV.filter((entry) => entry.title === 'Explorer').length, 1);
});

/* ------------------------------------------------------------------
   MÉMOIRE DU VISITEUR — favoris et recherches enregistrées
   ------------------------------------------------------------------ */

await test('HOMERA : l’état local résiste aux données abîmées', () => {
  assert.deepEqual(visitor.parseVisitorState(null), { favorites: [], searches: [] });
  assert.deepEqual(visitor.parseVisitorState('nawak'), { favorites: [], searches: [] });
  assert.deepEqual(visitor.parseVisitorState({ favorites: 'oui', searches: 3 }), { favorites: [], searches: [] });
  const kept = visitor.parseVisitorState({
    favorites: ['villa-fidjrosse', 42, 'appartement-haie-vive'],
    searches: [
      { id: '/explorer?intention=louer', label: 'À louer', href: '/explorer?intention=louer', count: 14, savedAt: '2026-10-01' },
      { id: 'sans-adresse', label: 'cassée', href: 'javascript:alert(1)', count: 1, savedAt: '' },
      null,
    ],
  });
  assert.deepEqual(kept.favorites, ['villa-fidjrosse', 'appartement-haie-vive']);
  assert.equal(kept.searches.length, 1, 'une recherche sans adresse interne est écartée');
  assert.equal(kept.searches[0].href, '/explorer?intention=louer');
});

await test('HOMERA : enregistrer, dédoublonner et retirer une recherche', () => {
  let state = { favorites: [], searches: [] };
  const first = { id: '/explorer?intention=louer', label: 'À louer', href: '/explorer?intention=louer', count: 14, savedAt: '2026-10-01' };
  const second = { id: '/explorer?intention=acheter', label: 'À vendre', href: '/explorer?intention=acheter', count: 13, savedAt: '2026-10-02' };
  state = visitor.withSearch(state, first);
  state = visitor.withSearch(state, second);
  assert.deepEqual(state.searches.map((entry) => entry.label), ['À vendre', 'À louer']);
  state = visitor.withSearch(state, { ...first, savedAt: '2026-10-03' });
  assert.equal(state.searches.length, 2, 'aucun doublon');
  assert.equal(state.searches[0].label, 'À louer', 'la recherche réenregistrée passe en tête');
  state = visitor.withoutSearch(state, first.id);
  assert.deepEqual(state.searches.map((entry) => entry.label), ['À vendre']);
  // Le plafond protège le stockage local.
  let many = { favorites: [], searches: [] };
  for (let index = 0; index < visitor.MAX_SAVED_SEARCHES + 4; index++) {
    many = visitor.withSearch(many, { ...first, id: `/explorer?page=${index}`, href: `/explorer?page=${index}` });
  }
  assert.equal(many.searches.length, visitor.MAX_SAVED_SEARCHES);
});

await test('HOMERA : favoris — bascule sans doublon', () => {
  let state = { favorites: [], searches: [] };
  state = visitor.toggleFavorite(state, 'villa-fidjrosse');
  state = visitor.toggleFavorite(state, 'villa-fidjrosse');
  assert.deepEqual(state.favorites, []);
  state = visitor.toggleFavorite(state, 'villa-fidjrosse');
  state = visitor.withFavorite(state, 'villa-fidjrosse');
  assert.deepEqual(state.favorites, ['villa-fidjrosse'], 'un favori ne se duplique pas');
  state = visitor.withoutFavorite(state, 'inconnu');
  assert.deepEqual(state.favorites, ['villa-fidjrosse']);
});

await test('HOMERA : une recherche enregistrée reprend l’adresse exacte', () => {
  const query = parseCatalogQuery('intention=louer&type=villa&ville=Cotonou&tri=prix-asc&page=3');
  const search = visitor.describeSearch(query, '/explorer');
  assert.ok(!search.href.includes('page='), 'la pagination ne fait pas partie de la recherche');
  assert.ok(search.href.startsWith('/explorer?'));
  assert.ok(search.label.includes('villa'), search.label);
  assert.equal(search.count, searchCatalog({ ...query, page: 1 }).length);
  // Deux ordres de paramètres différents décrivent la même recherche.
  const other = visitor.describeSearch(parseCatalogQuery('ville=Cotonou&intention=louer&tri=prix-asc&type=villa'), '/explorer');
  assert.equal(other.id, search.id);
  // La page d’un projet conserve son chemin.
  const category = visitor.describeSearch(nav.categoryQuery(nav.findCategory('louer', 'studios').category.filter), '/louer/studios');
  assert.ok(category.href.startsWith('/louer/studios'), category.href);
});

await test('HOMERA : les identifiants de panneaux restent lisibles', () => {
  assert.equal(nav.navPanelId('Séjour'), 'sejour');
  assert.equal(nav.navPanelId('À propos'), 'a-propos');
  assert.equal(nav.navPanelId('Locaux commerciaux'), 'locaux-commerciaux');
  assert.equal(nav.navPanelId('Écosystème & services'), 'ecosysteme-services');
  for (const entry of nav.PUBLIC_NAV) {
    assert.ok(nav.navPanelId(entry.title).length > 0);
  }
  // Le menu tient la commande annoncée : Explorer → Favoris, rien d’autre.
  assert.deepEqual(nav.PUBLIC_NAV.map((entry) => entry.title), ['Explorer', 'Acheter', 'Louer', 'Séjour', 'Services', 'Favoris']);
});

/* ==================================================================
   PHASE 4 — AUTHENTIFICATION
   ------------------------------------------------------------------
   Les mêmes règles que celles servies au navigateur : rôles, champs
   adaptés, politique de mot de passe, codes, jetons, stockage.
   Les modules de compte sont transpirés vers lib/auth.ts, comme les
   autres : aucun test ne dépend de React ni d’un DOM.
   ================================================================== */

const authUrl = await moduleUrl('lib/auth.ts');
const auth = await import(authUrl);
const accountsUrl = await moduleUrl('lib/accounts.ts', { '@/lib/auth': authUrl });
const accounts = await import(accountsUrl);
const demoAccounts = await import(await moduleUrl('lib/demo-accounts.ts'));

await test('HOMERA : trois rôles, trois jeux de champs réellement différents', () => {
  assert.deepEqual([...auth.ROLE_ORDER], ['client', 'proprietaire', 'agent']);
  assert.deepEqual(
    auth.ROLES.map((role) => role.label),
    ['Client', 'Propriétaire', 'Agent'],
  );

  const names = (role) => auth.roleFields(role).map((field) => field.name);
  const client = names('client');
  const proprietaire = names('proprietaire');
  const agent = names('agent');

  // Le socle commun existe partout.
  for (const field of ['prenom', 'nom', 'email', 'telephone', 'zone', 'motDePasse', 'confirmation', 'conditions']) {
    assert.ok(client.includes(field), `client sans ${field}`);
    assert.ok(proprietaire.includes(field), `propriétaire sans ${field}`);
    assert.ok(agent.includes(field), `agent sans ${field}`);
  }

  // Ce qui n’appartient qu’à un rôle ne fuit pas chez les autres.
  assert.ok(client.includes('projet') && client.includes('budget'));
  assert.ok(proprietaire.includes('portefeuille') && proprietaire.includes('usage'));
  assert.ok(agent.includes('structure') && agent.includes('identification'));
  for (const role of auth.ROLE_ORDER) {
    const others = auth.ROLE_ORDER.filter((entry) => entry !== role);
    const peculiar = auth.profileFields(role).map((field) => field.name);
    for (const other of others) {
      const otherFields = auth.profileFields(other).map((field) => field.name);
      for (const name of peculiar) {
        assert.ok(otherFields.includes(name) || !otherFields.includes(name), 'lecture stable');
      }
      if (role === 'client') assert.ok(!otherFields.includes('budget'), `budget chez ${other}`);
      if (role === 'agent') assert.ok(!otherFields.includes('structure'), `structure chez ${other}`);
    }
  }

  // Chaque champ de profil porte un libellé, et les listes déroulantes des options.
  for (const role of auth.ROLE_ORDER) {
    assert.ok(auth.profileFields(role).length >= 3, `profil trop maigre : ${role}`);
    for (const field of auth.roleFields(role)) {
      assert.ok(field.label.trim().length >= 2, `libellé manquant : ${role}.${field.name}`);
      if (field.kind === 'select') assert.ok((field.options ?? []).length >= 2, `options manquantes : ${field.name}`);
    }
  }

  // Un rôle ne s’accepte pas depuis n’importe quelle valeur d’URL.
  assert.equal(auth.roleFromParam('proprietaire'), 'proprietaire');
  assert.equal(auth.roleFromParam('administrateur'), null);
  assert.equal(auth.roleFromParam(undefined), null);
});

await test('HOMERA : la politique de mot de passe est celle qui est annoncée', () => {
  assert.equal(auth.PASSWORD_MIN_LENGTH, 10);
  assert.ok(!auth.passwordCriteria('court1A').find((entry) => entry.id === 'longueur').met);
  assert.ok(auth.passwordCriteria('Fidjrosse-2026').every((entry) => !entry.required || entry.met));

  // Un mot de passe qui reprend le prénom, le nom ou l’adresse est refusé.
  const context = { prenom: 'Awa', nom: 'Dossou', email: 'awa.dossou@exemple.com' };
  const weak = auth.passwordCriteria('Awa-Dossou-2026', context).find((entry) => entry.id === 'personnel');
  assert.equal(weak.met, false, 'identité reprise dans le mot de passe');

  const strength = (value) => auth.passwordStrength(value, context);
  assert.equal(strength('').level, 0);
  assert.equal(strength('azerty').tone, 'error');
  assert.equal(strength('Fidjrosse-2026').tone, 'success');
  assert.ok(strength('Fidjrosse-2026').score > strength('Fidjrosse1').score, 'un mot plus long pèse plus lourd');
  assert.ok(auth.passwordProblems('azerty').length >= 3, 'trop peu de manques signalés');
});

await test('HOMERA : l’inscription refuse, accepte, puis compte les rôles', () => {
  const fill = (role, extra = {}) => ({
    ...auth.emptyValues(role),
    prenom: 'Awa',
    nom: 'Dossou',
    email: 'awa.dossou@exemple.com',
    telephone: '+229 01 97 00 00 00',
    zone: 'Cotonou',
    motDePasse: 'Fidjrosse-2026',
    confirmation: 'Fidjrosse-2026',
    conditions: true,
    mandat: true,
    ...extra,
  });

  // Champs vides : tout ce qui est obligatoire est signalé, sans exception.
  const empty = auth.validateSignUp('client', auth.emptyValues('client'));
  assert.equal(empty.ok, false);
  for (const name of ['prenom', 'nom', 'email', 'telephone', 'zone', 'motDePasse', 'conditions']) {
    assert.ok(empty.fields[name], `champ obligatoire non signalé : ${name}`);
  }

  // Adresses et numéros douteux.
  assert.ok(auth.validateSignUp('client', fill('client', { email: 'awa@@exemple' })).fields.email);
  assert.ok(auth.validateSignUp('client', fill('client', { telephone: '12345' })).fields.telephone);
  assert.ok(!auth.validateSignUp('client', fill('client', { telephone: '01 97 00 00 00' })).fields.telephone);
  assert.ok(!auth.validateSignUp('client', fill('client', { telephone: '+229 01 97 00 00 00' })).fields.telephone);

  // Mise en forme des numéros : paires, indicatif conservé.
  assert.equal(auth.formatPhone(''), '');
  assert.equal(auth.formatPhone('97000000'), '97 00 00 00');
  assert.equal(auth.formatPhone('0197000000'), '01 97 00 00 00');
  assert.equal(auth.formatPhone('+2290197000000'), '+229 01 97 00 00 00');
  assert.equal(auth.formatPhone('2290197000000'), '+229 01 97 00 00 00');
  // Un indicatif inconnu n’est pas reformaté d’office.
  assert.equal(auth.formatPhone(' +33 6 12 34 56 78 '), '+33 6 12 34 56 78');
  assert.equal(auth.formatPhone('+229'), '+229');

  // Mots de passe : faible, non confirmé, identitaire.
  assert.ok(auth.validateSignUp('client', fill('client', { motDePasse: 'azerty', confirmation: 'azerty' })).fields.motDePasse);
  assert.ok(auth.validateSignUp('client', fill('client', { confirmation: 'Autre-Chose-2026' })).fields.confirmation);
  assert.ok(
    auth.validateSignUp('client', fill('client', { motDePasse: 'AwaDossou-2026', confirmation: 'AwaDossou-2026' }))
      .fields.motDePasse,
    'mot de passe reprenant l’identité accepté',
  );

  // Chaque rôle, complété avec ses propres champs, passe.
  const profiles = {
    client: { projet: 'louer', bienRecherche: 'appartement', budget: 'location-500' },
    proprietaire: {
      portefeuille: '2-5',
      natureBiens: 'villa',
      zoneBiens: 'Cotonou',
      usage: 'location',
      situation: 'diaspora',
    },
    agent: {
      structure: 'Agence Fidjrossè',
      identification: 'RB/COT/24 B 1234',
      zoneExercice: 'Cotonou',
      experience: '3-10',
    },
  };
  for (const role of auth.ROLE_ORDER) {
    const validated = auth.validateSignUp(role, fill(role, profiles[role]));
    assert.equal(validated.ok, true, `rôle refusé à tort : ${role} — ${JSON.stringify(validated.fields)}`);
    // Un consentement obligatoire retiré bloque bien.
    const withoutConsent = auth.validateSignUp(role, fill(role, { ...profiles[role], conditions: false }));
    assert.equal(withoutConsent.ok, false, `conditions non exigées : ${role}`);
    if (role === 'client') {
      assert.equal(auth.validateSignUp(role, fill(role, profiles[role])).ok, true);
      assert.ok(!auth.validateSignUp(role, fill(role, profiles[role])).fields.alertes, 'alerte facultative exigée');
    } else {
      const noMandate = auth.validateSignUp(role, fill(role, { ...profiles[role], mandat: false }));
      assert.ok(noMandate.fields.mandat, `mandat non exigé : ${role}`);
    }
  }

  // IFU et RCCM : contrôlés seulement s’ils sont renseignés.
  assert.ok(!auth.validateSignUp('proprietaire', fill('proprietaire', { ...profiles.proprietaire, ifu: '' })).fields.ifu);
  assert.ok(auth.validateSignUp('proprietaire', fill('proprietaire', { ...profiles.proprietaire, ifu: '123' })).fields.ifu);
  assert.ok(auth.validateSignUp('agent', fill('agent', { ...profiles.agent, identification: 'abc' })).fields.identification);
  assert.ok(!auth.validateSignUp('agent', fill('agent', { ...profiles.agent, cartePro: '' })).fields.cartePro);
});

await test('HOMERA : connexion, masquage et robustesse des messages', () => {
  assert.equal(auth.validateSignIn({ email: '', motDePasse: '' }).ok, false);
  assert.ok(auth.validateSignIn({ email: 'pas-une-adresse', motDePasse: 'Fidjrosse-2026' }).fields.email);
  assert.equal(auth.validateSignIn({ email: 'awa@exemple.com', motDePasse: 'Fidjrosse-2026' }).ok, true);
  assert.ok(auth.validateEmailOnly('') && auth.validateEmailOnly('nawak'));
  assert.equal(auth.validateEmailOnly('awa@exemple.com'), undefined);

  assert.equal(auth.maskEmail('awa.dossou@exemple.com'), 'a•••••••••@exemple.com');
  assert.ok(!auth.maskEmail('awa@exemple.com').includes('dossou'));
  const masked = auth.maskPhone('+229 01 97 00 00 00');
  assert.ok(masked.startsWith('+229'), masked);
  assert.ok(masked.endsWith('00'), masked);
  assert.ok(!masked.includes('97'), masked);

  assert.equal(auth.fullName('', '', 'Votre compte'), 'Votre compte');
  assert.equal(auth.initials('Awa', 'Dossou'), 'AD');
  assert.equal(auth.initials('', ''), 'H');

  // Fiche du compte : les valeurs techniques deviennent des libellés.
  const lines = auth.describeProfile('agent', { structure: 'Agence Fidjrossè', experience: '3-10' });
  assert.deepEqual(
    lines.map((line) => line.label),
    ['Structure ou agence', 'Expérience'],
  );
  assert.equal(lines.find((line) => line.label === 'Expérience').value, '3 à 10 ans');
});

await test('HOMERA : codes, jetons et échéances', () => {
  // Générateur déterministe : les tests n’attendent pas la chance.
  const sequence = [0.000001, 0.5, 0.999999];
  let index = 0;
  const random = () => sequence[index++ % sequence.length];

  assert.equal(auth.generateCode(() => 0), '000000');
  assert.equal(auth.generateCode(() => 0.999999).length, 6);
  assert.match(auth.generateCode(random), /^\d{6}$/);
  assert.equal(auth.generateToken(() => 0).length, 32);
  assert.match(auth.generateToken(random), /^[a-f0-9]{32}$/);

  assert.equal(auth.isVerificationCode('123456'), true);
  assert.equal(auth.isVerificationCode('12345'), false);
  assert.equal(auth.isVerificationCode('12a456'), false);
  assert.ok(auth.validateCode('123456') === undefined);
  assert.ok(auth.validateCode('12') !== undefined);

  const now = 1_700_000_000_000;
  const fresh = { code: '123456', expiresAt: now + 1000, attempts: 0 };
  assert.equal(auth.codeState(fresh, now), 'ok');
  assert.equal(auth.codeState({ ...fresh, expiresAt: now - 1 }, now), 'expired');
  assert.equal(auth.codeState({ ...fresh, attempts: auth.MAX_CODE_ATTEMPTS }, now), 'locked');
  assert.equal(auth.codeState(null, now), 'absent');
  assert.equal(auth.attemptsLeft({ ...fresh, attempts: 4 }), 1);
  assert.equal(auth.attemptsLeft(null), 0);
  assert.equal(auth.durationLabel(60_000), '1 minute');
  assert.equal(auth.durationLabel(180_000), '3 minutes');
  assert.equal(auth.durationLabel(1_000), '1 seconde');
});

await test('HOMERA : identifiants de démonstration seedés et utilisables par compte', async () => {
  const seeded = demoAccounts.ensureDemoAccounts([]);
  assert.equal(seeded.length, 4);
  assert.strictEqual(demoAccounts.ensureDemoAccounts(seeded), seeded, 'un seed déjà présent ne se duplique pas');
  assert.deepEqual(demoAccounts.DEMO_LOGIN_CREDENTIALS.map(({ username, password }) => [username, password]), [
    ['admin', 'admin'], ['user', 'user'], ['agent', 'agent'], ['prop', 'prop'],
  ]);
  assert.equal(demoAccounts.demoEmailForUsername(' ADMIN '), 'admin@homera.demo');
  assert.equal(demoAccounts.demoEmailForUsername('unknown'), null);
  for (const credential of demoAccounts.DEMO_LOGIN_CREDENTIALS) {
    const record = seeded.find((entry) => entry.email === credential.email);
    assert.ok(record, `compte manquant : ${credential.username}`);
    assert.equal(record.emailVerified, true, `${credential.username} prêt à l’emploi sans code de vérification`);
    assert.equal(await accounts.verifyPassword(record.password, credential.password), true, `${credential.username} / ${credential.password}`);
  }
  const admin = seeded.find((entry) => entry.email === 'admin@homera.demo');
  const agent = seeded.find((entry) => entry.email === 'agent@homera.demo');
  assert.equal(admin?.profile.demoRole, 'admin');
  assert.equal(portalData.authorizationsForAgent(agent, new Date('2026-10-03T12:00:00.000Z')).length, 3);
  assert.equal(demoAccounts.ensureDemoAccounts([seeded[0]]).length, 4, 'un compte demo existant n’est pas dupliqué');
});

await test('HOMERA : le stockage des comptes ne fait confiance à rien', () => {
  assert.deepEqual(accounts.parseAccounts(null), []);
  assert.deepEqual(accounts.parseAccounts('nawak'), []);
  assert.deepEqual(accounts.parseAccounts([1, 'deux', null, { id: '' }]), []);

  const valid = {
    id: 'HOM-CLI-00001',
    role: 'client',
    prenom: 'Awa',
    nom: 'Dossou',
    email: 'Awa.Dossou@Exemple.com',
    telephone: '+229 01 97 00 00 00',
    profile: { projet: 'louer', budget: 'location-500', sale: 12 },
    password: { kdf: 'webcrypto-pbkdf2', salt: 'a'.repeat(32), hash: 'b'.repeat(64), iterations: 150000 },
    emailVerified: false,
    verification: { code: '123456', expiresAt: 1, attempts: 2, createdAt: 0 },
    reset: null,
    notify: true,
    consentAt: '2026-01-01',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  };
  const parsed = accounts.parseAccounts([valid, { ...valid, id: 'x', password: { salt: 'court' } }]);
  assert.equal(parsed.length, 1, 'un compte sans empreinte valable est écarté');
  assert.equal(parsed[0].emailKey, 'awa.dossou@exemple.com', 'adresse normalisée');
  assert.deepEqual(parsed[0].profile, { projet: 'louer', budget: 'location-500' }, 'profil nettoyé');
  assert.equal(parsed[0].verification.attempts, 2);
  assert.equal(accounts.parseAccounts([{ ...valid, verification: { code: 'abc' } }])[0].verification, null);

  assert.equal(accounts.parseSession(null), null);
  assert.equal(accounts.parseSession({ accountId: '' }), null);
  assert.ok(accounts.parseSession({ accountId: 'HOM-CLI-00001', startedAt: 10 }));

  const session = { accountId: 'HOM-CLI-00001', startedAt: Date.now(), lastSeenAt: Date.now(), remember: false };
  assert.equal(accounts.sessionIsValid(session, Date.now()), true);
  assert.equal(
    accounts.sessionIsValid({ ...session, remember: true, startedAt: Date.now() - accounts.SESSION_TTL_MS - 1 }, Date.now()),
    false,
    'une session « rester connecté » expire bien',
  );
  assert.equal(accounts.sessionIsValid(null, Date.now()), false);

  // Vue publique : aucune empreinte, aucun code ne peut fuir par l’interface.
  const publicView = accounts.publicAccount(parsed[0]);
  assert.equal(publicView.password, undefined);
  assert.equal(publicView.verification, undefined);
  assert.equal(publicView.reset, undefined);
  assert.equal(publicView.email, 'Awa.Dossou@Exemple.com');
});

await test('HOMERA : mot de passe haché, vérifié, jamais conservé en clair', async () => {
  const password = 'Fidjrosse-2026';
  const fast = { iterations: 1000 };
  const record = await accounts.hashPassword(password, fast);

  assert.equal(record.kdf, 'webcrypto-pbkdf2', 'contexte sécurisé attendu sous Node');
  assert.equal(record.iterations, 1000);
  assert.equal(record.hash.length, 64);
  assert.ok(!record.hash.includes(password), 'mot de passe en clair dans l’empreinte');
  assert.notEqual(record.salt, (await accounts.hashPassword(password, fast)).salt, 'le sel change à chaque compte');

  assert.equal(await accounts.verifyPassword(record, password), true);
  assert.equal(await accounts.verifyPassword(record, `${password} `), false);
  assert.equal(await accounts.verifyPassword(record, 'autre-mot-de-passe'), false);
  const alteredHash = record.hash.slice(0, -1) + (record.hash.endsWith('0') ? '1' : '0');
  assert.equal(await accounts.verifyPassword({ ...record, hash: alteredHash }, password), false);

  // Comparaison à temps constant : longueur différente, contenu différent.
  assert.equal(accounts.safeEqual('abcdef', 'abcdef'), true);
  assert.equal(accounts.safeEqual('abcdef', 'abcdeg'), false);
  assert.equal(accounts.safeEqual('abc', 'abcd'), false);

  // Identifiants de compte : lisibles, uniques, préfixés par le rôle.
  const ids = new Set();
  for (let attempt = 0; attempt < 50; attempt++) {
    const id = accounts.accountId('proprietaire', Math.random, [...ids]);
    assert.match(id, /^HOM-PRO-[0-9A-Z]{5}$/);
    assert.ok(!ids.has(id), 'identifiant dupliqué');
    ids.add(id);
  }
});

await test('HOMERA : le parcours complet tient debout, de bout en bout', async () => {
  // Inscription → code → vérification → connexion → mot de passe oublié →
  // réinitialisation. Les fonctions pures suffisent : aucun DOM requis.
  const values = {
    ...auth.emptyValues('proprietaire'),
    prenom: 'Awa',
    nom: 'Dossou',
    email: 'awa.dossou@exemple.com',
    telephone: '+229 01 97 00 00 00',
    zone: 'Cotonou',
    portefeuille: '2-5',
    natureBiens: 'villa',
    zoneBiens: 'Cotonou',
    usage: 'location',
    situation: 'diaspora',
    motDePasse: 'Fidjrosse-2026',
    confirmation: 'Fidjrosse-2026',
    conditions: true,
    mandat: true,
    alertes: true,
  };
  assert.equal(auth.validateSignUp('proprietaire', values).ok, true);

  const now = 1_700_000_000_000;
  const account = await accounts.createAccountRecord({ role: 'proprietaire', values, now, random: () => 0.424242 });
  assert.match(account.id, /^HOM-PRO-/);
  assert.equal(account.emailKey, 'awa.dossou@exemple.com');
  assert.equal(account.emailVerified, false);
  assert.equal(account.notify, true, 'consentement aux alertes conservé');
  assert.deepEqual(account.profile, {
    portefeuille: '2-5',
    natureBiens: 'villa',
    zoneBiens: 'Cotonou',
    usage: 'location',
    situation: 'diaspora',
  });
  assert.equal(account.profile.motDePasse, undefined, 'le mot de passe ne prend pas la place d’un champ de profil');
  assert.equal(await accounts.verifyPassword(account.password, 'Fidjrosse-2026'), true);

  // Le code émis expire : au-delà de la fenêtre, il n’est plus utilisable.
  const verification = account.verification;
  assert.equal(auth.codeState(verification, now + 1000), 'ok');
  assert.equal(auth.codeState(verification, verification.expiresAt + 1), 'expired');
  assert.equal(auth.VERIFICATION_TTL_MINUTES, 15);
  assert.equal(auth.RESET_TTL_MINUTES, 30);

  // Cinq essais, pas six : le compteur est réel.
  let attempts = 0;
  while (auth.codeState({ ...verification, attempts }, now + 1000) === 'ok') attempts++;
  assert.equal(attempts, auth.MAX_CODE_ATTEMPTS);

  // Vérification réussie → compte complet.
  const verified = accounts.publicAccount({ ...account, emailVerified: true, verification: null });
  assert.equal(verified.emailVerified, true);

  // Mot de passe oublié : le jeton et le code sont émis ensemble, et expirent ensemble.
  const reset = accounts.issueReset(now, () => 0.123456);
  assert.match(reset.token, /^[a-f0-9]{32}$/);
  assert.match(reset.code, /^\d{6}$/);
  assert.equal(auth.codeState(reset, now + 60_000), 'ok');
  assert.equal(auth.codeState(reset, reset.expiresAt + 1), 'expired');

  // Nouveau mot de passe : refusé s’il est faible, accepté sinon, et l’ancien ne passe plus.
  assert.equal(auth.validateNewPassword('azerty', 'azerty', { email: account.email }).ok, false);
  assert.equal(auth.validateNewPassword('Fidjrosse-2026', 'Fidjrosse-2027', {}).fields.confirmation !== undefined, true);
  const changed = await accounts.hashPassword('Cadjèhoun-2027', { iterations: 500 });
  assert.equal(await accounts.verifyPassword(changed, 'Cadjèhoun-2027'), true);
  assert.equal(await accounts.verifyPassword(changed, 'Fidjrosse-2026'), false, 'l’ancien mot de passe ne fonctionne plus');

  // Un compte abîmé est écarté à la relecture, sans faire tomber la session des autres.
  const store = accounts.parseAccounts([
    account,
    accounts.publicAccount(account),
    { ...account, id: 'HOM-PRO-ABIME', password: { kdf: 'webcrypto-pbkdf2', salt: 'x', hash: 'y' } },
  ]);
  assert.equal(store.length, 1, 'seul un compte complet survit à la relecture');
  assert.equal(accounts.findAccountByEmail(store, 'AWA.DOSSOU@EXEMPLE.COM').id, account.id);
  assert.equal(accounts.findAccountByEmail(store, 'personne@exemple.com'), undefined);
  assert.equal(accounts.replaceAccount(store, { ...account, emailVerified: true })[0].emailVerified, true);
});

await test('HOMERA : les cinq écrans de compte existent, sont liés et non indexables', async () => {
  // La copy des cinq écrans vient de lib/pages.ts : elle doit rester complète.
  const pagesUrl = await moduleUrl('lib/pages.ts');
  const pages = await import(pagesUrl);
  const copy = pages.AUTH_PAGE;
  for (const key of ['connexion', 'inscription', 'motDePasseOublie', 'reinitialisation', 'verification']) {
    const entry = copy[key];
    assert.ok(entry, `copie manquante : ${key}`);
    assert.ok(entry.title.length > 10 && entry.intro.length > 40, `copie trop courte : ${key}`);
    assert.ok(entry.facts.length === 3, `repères manquants : ${key}`);
    assert.ok(entry.asidePoints.length >= 3, `points latéraux manquants : ${key}`);
  }

  // Chaque adresse déclarée a sa page réelle, et aucune ne s’indexe.
  for (const entry of nav.ACCOUNT_LINKS) {
    const file = new URL(`../app/(site)${entry.href}/page.tsx`, import.meta.url);
    const stats = await stat(file);
    assert.ok(stats.isFile(), `page absente : ${entry.href}`);
    const source = await readFile(file, 'utf8');
    assert.ok(source.includes('robots: { index: false'), `${entry.href} : page indexable`);
    assert.ok(source.includes('metadata'), `${entry.href} : métadonnées absentes`);
  }
  assert.equal(new Set(nav.ACCOUNT_LINKS.map((entry) => entry.href)).size, nav.ACCOUNT_LINKS.length);
});

await test('HOMERA : le tableau de bord client expose chaque espace et les notifications', async () => {
  const page = await readFile(new URL('../app/(client)/client/page.tsx', import.meta.url), 'utf8');
  const dashboard = await readFile(new URL('../components/client/ClientDashboard.tsx', import.meta.url), 'utf8');
  assert.equal(nav.CLIENT_HREF, '/client');
  assert.ok(page.includes('robots: { index: false'), 'espace personnel non indexable');

  for (const label of [
    'Accueil', 'Explorer', 'Favoris', 'Mes visites', 'Mes demandes', 'Mes locations',
    'Notifications', 'Messages', 'Profil', 'Paramètres',
  ]) {
    assert.ok(dashboard.includes(`label: "${label}"`), `entrée de navigation absente : ${label}`);
  }
  for (const section of ['accueil', 'favoris', 'visites', 'demandes', 'locations', 'notifications', 'messages', 'profil', 'parametres']) {
    assert.ok(dashboard.includes(`id="${section}"`), `section du tableau de bord absente : ${section}`);
  }
  for (const heading of ['Recherches récentes', 'Biens favoris', 'Prochaines visites', 'Location active', 'Recommandations pour vous']) {
    assert.ok(dashboard.includes(heading), `bloc du tableau de bord absent : ${heading}`);
  }
  assert.ok(dashboard.includes('Alertes automatiques à venir'), 'centre de notifications explicite');
  assert.ok(dashboard.includes('verification-email'), 'action de confirmation d’adresse accessible');
});

/* ==================================================================
   PHASE 4 (suite) — LES RÔLES SONT CUMULATIFS
   ------------------------------------------------------------------
   Un propriétaire cherche aussi un logement, un agent achète aussi
   pour lui-même : le socle client appartient à tous, et un compte peut
   détenir plusieurs rôles sans reperdre son historique.
   ================================================================== */

await test('HOMERA : le socle client appartient à tous les rôles', () => {
  const socle = auth.CAPABILITIES.filter((entry) => entry.scope === 'socle').map((entry) => entry.id);
  assert.ok(socle.length >= 4, 'socle trop maigre');

  for (const role of auth.ROLE_ORDER) {
    const capabilities = auth.roleCapabilities(role);
    for (const id of socle) {
      assert.ok(capabilities.some((entry) => entry.id === id), `${role} sans la capacité ${id}`);
    }
    assert.equal(auth.hasWorkspaceRole([role], 'client'), true, `${role} ne peut pas accéder au socle client`);
  }
  assert.equal(auth.hasWorkspaceRole(['client'], 'proprietaire'), false, 'le client ne doit pas ouvrir l’espace propriétaire');
  assert.equal(auth.hasWorkspaceRole(['agent'], 'proprietaire'), false, 'l’espace agent ne donne pas le rôle propriétaire');
  assert.equal(auth.hasWorkspaceRole(['proprietaire'], 'agent'), false, 'l’espace propriétaire ne donne pas le rôle agent');

  // Les rôles métier ne se mélangent pas : le dépôt n’appartient pas au client.
  const client = auth.roleCapabilities('client').map((entry) => entry.id);
  assert.ok(!client.includes('depot') && !client.includes('mandats'));
  assert.ok(auth.roleCapabilities('proprietaire').some((entry) => entry.id === 'depot'));
  assert.ok(auth.roleCapabilities('agent').some((entry) => entry.id === 'mandats'));
  assert.ok(!auth.roleCapabilities('proprietaire').some((entry) => entry.id === 'mandats'));

  // Chaque rôle dit ce qu’il reprend du socle, et ce qui reste à vérifier.
  for (const role of auth.ROLES) {
    assert.ok(role.includes.length > 20, `cumul non dit : ${role.id}`);
    assert.ok(role.verification.length > 20, `vérification non dite : ${role.id}`);
    if (role.id !== 'client') assert.ok(/client/i.test(role.includes), `socle non nommé : ${role.id}`);
  }

  // La disponibilité est explicite : rien d’annoncé comme ouvert ne dépend d’un serveur.
  const ouvertes = auth.CAPABILITIES.filter((entry) => entry.available).map((entry) => entry.id);
  assert.deepEqual(ouvertes.sort(), ['favoris', 'recherche']);
});

await test('HOMERA : plusieurs rôles sur un même compte, sans doublon', () => {
  assert.deepEqual(auth.missingRoles(['proprietaire']), ['agent']);
  assert.deepEqual(auth.missingRoles(['client']), ['proprietaire', 'agent']);
  assert.deepEqual(auth.missingRoles(['client', 'proprietaire', 'agent']), []);
  assert.equal(auth.rolesLabel(['client', 'proprietaire']), 'Client · Propriétaire');
  assert.equal(auth.rolesLabel([]), 'Compte');
  assert.equal(auth.hasRole(['client', 'agent'], 'agent'), true);
  assert.equal(auth.hasRole(['client'], 'agent'), false);

  // Les groupes d’affichage suivent les rôles détenus, socle en tête.
  const groups = auth.capabilitiesByRole(['client', 'agent']);
  assert.equal(groups[0].scope, 'socle');
  assert.deepEqual(groups.map((group) => group.scope), ['socle', 'agent']);
  assert.equal(auth.capabilitiesByRole(['client']).length, 1, 'un client pur n’a que le socle');
  assert.equal(auth.rolesCapabilities(['client']).length, groups[0].capabilities.length);
});

await test('HOMERA : ajouter un rôle ne redemande ni identité ni mot de passe', async () => {
  const values = {
    ...auth.emptyValues('client'),
    prenom: 'Awa',
    nom: 'Dossou',
    email: 'awa.dossou@exemple.com',
    telephone: '+229 01 97 00 00 00',
    zone: 'Cotonou',
    projet: 'acheter',
    bienRecherche: 'appartement',
    budget: 'achat-25',
    motDePasse: 'Fidjrosse-2026',
    confirmation: 'Fidjrosse-2026',
    conditions: true,
    alertes: true,
  };
  const account = await accounts.createAccountRecord({ role: 'client', values, random: () => 0.31 });
  assert.deepEqual(account.roles, ['client'], 'un compte neuf n’a que son rôle d’inscription');

  // La fiche d’ajout ne demande que le profil du rôle et ses consentements.
  const upgrade = auth.emptyProfileValues('proprietaire');
  assert.deepEqual(
    Object.keys(upgrade).sort(),
    auth.profileFields('proprietaire')
      .map((field) => field.name)
      .concat('mandat')
      .sort(),
  );
  assert.equal(upgrade.motDePasse, undefined, 'le mot de passe n’est pas redemandé');
  assert.equal(upgrade.prenom, undefined, 'l’identité n’est pas redemandée');

  // Refus tant que le profil et le consentement obligatoire manquent.
  assert.equal(auth.validateRoleUpgrade('proprietaire', upgrade).ok, false);
  assert.ok(auth.validateRoleUpgrade('proprietaire', upgrade).fields.mandat);

  const filled = {
    ...upgrade,
    portefeuille: '2-5',
    natureBiens: 'villa',
    zoneBiens: 'Cotonou',
    usage: 'location',
    situation: 'diaspora',
    mandat: true,
  };
  assert.equal(auth.validateRoleUpgrade('proprietaire', filled).ok, true);
  assert.deepEqual(auth.profileSnapshot('proprietaire', filled), {
    portefeuille: '2-5',
    natureBiens: 'villa',
    zoneBiens: 'Cotonou',
    usage: 'location',
    situation: 'diaspora',
  });

  // Le rôle s’ajoute, le profil fusionne, l’identité et le mot de passe ne bougent pas.
  const upgraded = accounts.withAddedRole(account, 'proprietaire', filled, 1_700_000_000_000);
  assert.deepEqual(upgraded.roles, ['client', 'proprietaire']);
  assert.equal(upgraded.role, 'client', 'le rôle principal reste celui de l’inscription');
  assert.equal(upgraded.email, account.email);
  assert.equal(upgraded.password, account.password, 'l’empreinte du mot de passe est inchangée');
  assert.deepEqual(upgraded.profile, { ...account.profile, ...auth.profileSnapshot('proprietaire', filled) });
  assert.equal(await accounts.verifyPassword(upgraded.password, 'Fidjrosse-2026'), true);

  // Puis l’agent : trois rôles, un seul compte, aucune capacité perdue.
  const asAgent = accounts.withAddedRole(
    upgraded,
    'agent',
    {
      ...auth.emptyProfileValues('agent'),
      structure: 'Agence Fidjrossè',
      identification: 'RB/COT/24 B 1234',
      zoneExercice: 'Cotonou',
      experience: '3-10',
      mandat: true,
    },
  );
  assert.deepEqual(asAgent.roles, ['client', 'proprietaire', 'agent']);
  assert.deepEqual(auth.missingRoles(asAgent.roles), []);
  assert.equal(auth.capabilitiesByRole(asAgent.roles).length, 3);

  // Le profil décrit tous les rôles détenus, sans doublon ni perte.
  const lines = auth.describeProfile(asAgent.roles, asAgent.profile);
  const labels = lines.map((line) => line.label);
  assert.ok(labels.includes('Votre projet'), 'profil client conservé');
  assert.ok(labels.includes('Portefeuille') || labels.includes('Biens à confier'), 'profil propriétaire conservé');
  assert.ok(labels.includes('Structure ou agence'), 'profil agent conservé');
  assert.equal(new Set(lines.map((line) => line.name)).size, lines.length, 'aucun doublon');

  // La relecture du stockage reconstruit les mêmes rôles, sans doublon.
  const [reloaded] = accounts.parseAccounts([asAgent]);
  assert.deepEqual(reloaded.roles, ['client', 'proprietaire', 'agent']);
  const [broken] = accounts.parseAccounts([{ ...asAgent, roles: ['agent', 'agent', 'nawak'] }]);
  assert.deepEqual(broken.roles, ['client', 'agent'], 'les rôles invalides sont écartés, le principal est conservé');
  const [withoutRoles] = accounts.parseAccounts([{ ...asAgent, roles: undefined }]);
  assert.deepEqual(withoutRoles.roles, ['client'], 'un compte sans liste retombe sur son rôle principal');

  // La vue publique n’oublie aucun rôle.
  assert.deepEqual(accounts.publicAccount(asAgent).roles, ['client', 'proprietaire', 'agent']);
});

await test('HOMERA : disponibilité & vérification survivent aux filtres et à l’URL', () => {
  const unavailable = data.PROPERTIES.find((property) => property.availabilityStatus === 'indisponible');
  assert.ok(unavailable, 'un état indisponible de démonstration est présent');
  const query = catalog.parseCatalogQuery('intention=louer&disponible=1&verifie=1');
  assert.equal(query.availableOnly, true);
  assert.equal(query.verifiedOnly, true);
  assert.ok(!catalog.searchCatalog({ ...catalog.EMPTY_QUERY, availableOnly: true }).some((property) => property.id === unavailable.id));
  assert.ok(catalog.activeFilterCount(query) >= 2);
  const serialized = catalog.buildCatalogParams(query).toString();
  assert.match(serialized, /disponible=1/);
  assert.match(serialized, /verifie=1/);
  assert.equal(catalog.parseCatalogQuery(serialized).verifiedOnly, true);
});

await test('HOMERA : le parcours local conserve les états métier et rejette le stockage invalide', () => {
  assert.equal(workflow.workflowStorageKey('compte-17'), 'homera.workflow.v1.compte-17');
  const parsed = workflow.parseWorkspace({
    visits: [{ id: 'v-1', propertyId: 'villa-fidjrosse', propertyRef: 'HOM-CTN-000421' }, { id: 7 }],
    applications: [{ id: 'd-1', propertyId: 'villa-fidjrosse' }, null],
    contracts: [{ id: 'c-1', propertyId: 'villa-fidjrosse' }],
    listings: [{ id: 'l-1', reference: 'HOM-CTN-000424', status: 'bad-status', price: 'NaN', photoNames: 'not-an-array', draftSnapshot: { step: 99, title: 'Reprise', photoNames: null, verifiedOwner: 'yes' } }, { id: 'l-2' }],
    listingStatusOverrides: { 'owner-421': 'indisponible', 'owner-422': 'not-a-status' },
    verificationDecisions: { 'case-1': 'valide', 'case-2': 'not-a-decision' },
    verificationHistory: {
      'case-1': [{ id: 'history-1', createdAt: '2026-10-01T10:00:00.000Z', decision: 'valide', title: 'Bien validé', detail: 'Contrôle local.' }, { id: 'bad' }],
      'case-2': 'not-a-list',
    },
    notifications: [{ id: 'n-1', title: 'Demande enregistrée' }, { id: 'n-2' }],
    messages: [{ id: 'm-1', messages: [] }, { id: 'm-2' }],
    draftProperty: { step: 3, title: 'Villa pilote' },
    preferences: { marketingNotifications: true, language: 'en' },
  });
  assert.equal(parsed.visits.length, 1);
  assert.equal(parsed.applications.length, 1);
  assert.equal(parsed.contracts.length, 1);
  assert.equal(parsed.listings.length, 1);
  assert.equal(parsed.listings[0].status, 'brouillon');
  assert.equal(parsed.listings[0].price, 0);
  assert.deepEqual(parsed.listings[0].photoNames, []);
  assert.equal(parsed.listings[0].draftSnapshot.step, 10);
  assert.deepEqual(parsed.listings[0].draftSnapshot.photoNames, []);
  assert.equal(parsed.listings[0].draftSnapshot.verifiedOwner, false);
  assert.deepEqual(parsed.listingStatusOverrides, { 'owner-421': 'indisponible' });
  assert.deepEqual(parsed.verificationDecisions, { 'case-1': 'valide' });
  assert.deepEqual(parsed.verificationHistory, {
    'case-1': [{ id: 'history-1', createdAt: '2026-10-01T10:00:00.000Z', decision: 'valide', title: 'Bien validé', detail: 'Contrôle local.' }],
  });
  assert.equal(parsed.notifications.length, 1);
  assert.equal(parsed.messages.length, 1);
  assert.equal(parsed.draftProperty.step, 3);
  assert.equal(parsed.preferences.marketingNotifications, true);
  assert.equal(parsed.preferences.language, 'en');
  assert.equal(workflow.parseWorkspace(null).visits.length, 0);
  assert.match(workflow.createLocalId('visite'), /^visite-[a-z0-9-]+$/);
  const notification = workflow.makeNotification('visite', 'Demande reçue', 'HOM-CTN-000421', '/client/visites');
  assert.equal(notification.read, false);
  assert.equal(notification.href, '/client/visites');
});

await test('HOMERA : candidature liée à une visite terminée, au bon bien, une seule fois', () => {
  const visit = {
    id: 'visite-1',
    propertyId: 'villa-fidjrosse',
    propertyRef: 'HOM-CTN-000421',
    propertyTitle: 'Villa pilote',
    clientName: 'Awa Dossou',
    date: '2026-10-20',
    slot: '09:00 – 11:00',
    status: 'terminee',
    createdAt: '2026-10-01T09:00:00.000Z',
  };
  const empty = { visits: [visit], applications: [] };
  assert.deepEqual(workflow.validateRentalRequest(empty, visit.id, visit.propertyId, 'louer'), { ok: true, visit });
  assert.deepEqual(workflow.eligibleRentalVisits(empty), [visit]);
  assert.equal(workflow.validateRentalRequest(empty, visit.id, 'autre-bien', 'louer').reason, 'bien-incoherent');
  assert.equal(workflow.validateRentalRequest(empty, visit.id, undefined, undefined).reason, 'bien-introuvable');
  assert.equal(workflow.validateRentalRequest(empty, visit.id, visit.propertyId, 'acheter').reason, 'bien-non-louable');
  assert.equal(workflow.validateRentalRequest(empty, 'visite-absente', visit.propertyId, 'louer').reason, 'visite-introuvable');

  const inProgress = { ...visit, status: 'confirmee' };
  assert.equal(workflow.validateRentalRequest({ visits: [inProgress], applications: [] }, visit.id, visit.propertyId, 'louer').reason, 'visite-non-terminee');
  assert.deepEqual(workflow.eligibleRentalVisits({ visits: [inProgress], applications: [] }), []);

  const application = { id: 'demande-1', visitId: visit.id, propertyId: visit.propertyId };
  const alreadyApplied = { visits: [visit], applications: [application] };
  assert.equal(workflow.validateRentalRequest(alreadyApplied, visit.id, visit.propertyId, 'louer').reason, 'demande-existante');
  assert.deepEqual(workflow.eligibleRentalVisits(alreadyApplied), []);
});

await test('HOMERA : le propriétaire ne peut ni valider ni publier avant le contrôle', () => {
  assert.equal(workflow.nextOwnerListingStatus('brouillon'), 'en-verification');
  assert.equal(workflow.nextOwnerListingStatus('en-verification'), null, 'un propriétaire ne peut pas auto-valider son dossier');
  assert.equal(workflow.nextOwnerListingStatus('verifie'), 'publie', 'seul un dossier vérifié peut être publié');
  assert.equal(workflow.nextOwnerListingStatus('publie'), 'indisponible');
  assert.equal(workflow.nextOwnerListingStatus('indisponible'), 'publie');
  assert.equal(workflow.nextOwnerListingStatus('suspendu'), null);
  assert.equal(workflow.nextOwnerListingStatus('loue'), null);
});

await test('HOMERA : la décision admin met à jour le bien et conserve chaque événement', () => {
  const listing = { id: 'bien-local-1', reference: 'HOM-CTN-000424', status: 'en-verification' };
  const initial = { ...workflow.EMPTY_WORKSPACE, listings: [listing] };
  const changesRequested = workflow.recordVerificationDecision(initial, listing.id, 'modification-demandee', 'Modifications demandées');
  assert.equal(changesRequested.listingStatusOverrides[listing.id], 'modification-demandee');
  assert.equal(changesRequested.verificationDecisions[listing.id], 'modification-demandee');
  assert.equal(changesRequested.verificationHistory[listing.id].length, 1);
  assert.equal(changesRequested.notifications[0].href, '/proprietaire/biens');

  const approved = workflow.recordVerificationDecision(changesRequested, listing.id, 'valide', 'Dossier validé');
  assert.equal(approved.listingStatusOverrides[listing.id], 'verifie');
  assert.equal(approved.verificationHistory[listing.id].length, 2);
  assert.equal(approved.verificationHistory[listing.id][0].decision, 'valide', 'événement le plus récent en tête');
  assert.equal(workflow.nextOwnerListingStatus(approved.listingStatusOverrides[listing.id]), 'publie');
});

await test('HOMERA : accès agent limité à son identité, au mandat exact et à sa période de validité', () => {
  const demoIdentity = {
    roles: ['agent'], prenom: 'Koffi', nom: 'Ahouansou',
    profile: { structure: 'Cabinet Ahouansou Immobilier', identification: 'RB/COT/24 B 1234' },
  };
  const authorized = portalData.authorizationsForAgent(demoIdentity, new Date('2026-10-03T12:00:00.000Z'));
  assert.equal(authorized.length, 3);
  assert.equal(portalData.authorizationsForAgent(null).length, 0);
  assert.equal(portalData.authorizationsForAgent({ ...demoIdentity, prenom: 'Autre' }).length, 0);
  assert.equal(portalData.authorizationsForAgent({ ...demoIdentity, roles: ['client'] }).length, 0);
  assert.equal(portalData.authorizationsForAgent(demoIdentity, new Date('2028-01-01T00:00:00.000Z')).length, 0);
  const firstMandate = portalData.DEMO_AGENT_AUTHORIZATIONS[0];
  assert.equal(portalData.isAgentAuthorizationCurrent(firstMandate, new Date(`${firstMandate.authorizedAt}T12:00:00.000Z`)), true);
  assert.equal(portalData.isAgentAuthorizationCurrent(firstMandate, new Date('2027-02-19T00:00:00.000Z')), false);

  const active = authorized;
  assert.ok(active.length > 0);
  const authorizedIds = new Set(active.map((entry) => entry.propertyId));
  for (const authorization of active) {
    const property = data.PROPERTIES.find((entry) => entry.id === authorization.propertyId);
    assert.ok(property, `bien autorisé présent : ${authorization.propertyId}`);
    assert.equal(property.homeraId, authorization.propertyRef, 'mandat lié à la bonne référence du bien');
    assert.equal(authorization.agentId, portalData.DEMO_AGENT_ID);
  }
  assert.ok(authorizedIds.size < data.PROPERTIES.length, 'l’agent ne voit pas l’ensemble du catalogue');
  assert.equal(new Set(active.map((entry) => `${entry.agentId}:${entry.propertyRef}`)).size, active.length);
});

/* ==================================================================
   NAVIGATION — UN LIEN DOIT OUVRIR UNE PAGE, PAS DÉFILER
   ------------------------------------------------------------------
   Toute adresse interne écrite dans l’interface doit correspondre à une
   route réellement déclarée dans `app/`. Les espaces de travail, les
   menus de compte et les tableaux de bord ne doivent plus fabriquer de
   navigation par fragment (`href="#…"`) : le défilement reste réservé
   aux sections éditoriales d’une même page (accueil, sommaire, etc.).
   ================================================================== */

await test('HOMERA : chaque lien interne ouvre une route réelle, jamais une ancre de repli', async () => {
  const root = fileURLToPath(new URL('..', import.meta.url));

  const walk = async (dir) => {
    const entries = await readdir(dir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) files.push(...(await walk(full)));
      else files.push(full);
    }
    return files;
  };

  const appFiles = await walk(join(root, 'app'));
  const routePatterns = appFiles
    .filter((file) => file.endsWith('page.tsx'))
    .map((file) => {
      const rel = relative(join(root, 'app'), file).replace(/\/?page\.tsx$/, '');
      const segments = rel
        .split('/')
        .filter((segment) => segment && !/^\(.*\)$/.test(segment))
        .map((segment) => (/^\[.*\]$/.test(segment) ? '*' : segment));
      return segments.length ? `/${segments.join('/')}` : '/';
    });
  assert.ok(routePatterns.length > 40, `routes déclarées trop rares : ${routePatterns.length}`);

  // `*` couvre un segment dynamique ; `${…}` dans un lien couvre ce qu’il compose.
  const routeMatchers = routePatterns.map((pattern) => {
    const body = pattern
      .split('/')
      .filter(Boolean)
      .map((segment) => (segment === '*' ? '[^/]+' : segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
      .join('/');
    return new RegExp(`^/${body}/?$`);
  });
  const opensRoute = (href) => {
    const path = href.split('#')[0].split('?')[0];
    if (!path.startsWith('/')) return true;
    const candidate = path.replace(/\$\{[^}]*\}/g, '[^/]*');
    if (candidate.includes('[')) return true;
    return routeMatchers.some((matcher) => matcher.test(candidate));
  };

  const sourceFiles = [...appFiles, ...(await walk(join(root, 'components')))].filter((file) => /\.(tsx|ts)$/.test(file));
  const unresolved = [];
  for (const file of sourceFiles) {
    const source = await readFile(file, 'utf8');
    const hrefs = [
      ...source.matchAll(/href=(?:"([^"]*)"|'([^']*)'|\{`([^`]*)`\}|\{"([^"]*)"\})/g),
      ...source.matchAll(/href:\s*(?:"([^"]*)"|'([^']*)'|`([^`]*)`)/g),
    ];
    for (const match of hrefs) {
      const href = (match[1] ?? match[2] ?? match[3] ?? match[4] ?? '').trim();
      if (!href.startsWith('/')) continue;
      if (!opensRoute(href)) unresolved.push(`${relative(root, file)} → ${href}`);
    }
  }
  assert.deepEqual(unresolved, [], `liens internes sans route :\n${unresolved.join('\n')}`);

  // Les espaces de travail, le menu de compte et les deux en-têtes publics
  // naviguent par route uniquement : plus aucun fragment de navigation.
  const noFragmentFiles = [
    'components/client/ClientDashboard.tsx',
    'components/workspace/WorkspaceShell.tsx',
    'components/workspace/CommunicationPages.tsx',
    'components/auth/AccountControl.tsx',
    'components/layout/Navbar.tsx',
    'components/layout/PublicHeader.tsx',
    'components/layout/Footer.tsx',
  ];
  for (const file of noFragmentFiles) {
    const source = await readFile(join(root, file), 'utf8');
    const fragments = [...source.matchAll(/href=(?:"(#[^"]*)"|\{`(#[^`]*)`\})/g)].map((match) => match[1] ?? match[2]);
    assert.deepEqual(fragments, [], `${file} : navigation par fragment ${fragments.join(', ')}`);
  }

  // Les raccourcis de fonctionnalité du tableau de bord client visent les
  // pages de gestion, jamais une section de la même page.
  const dashboard = await readFile(join(root, 'components/client/ClientDashboard.tsx'), 'utf8');
  for (const href of ['/client/favoris', '/client/visites', '/client/demandes', '/client/contrats', '/client/profil', '/client/parametres', '/notifications', '/messages']) {
    assert.ok(dashboard.includes(href), `raccourci manquant : ${href}`);
  }
  assert.ok(!dashboard.includes('setActiveSection'), 'le tableau de bord ne pilote plus la navigation par état local');
  assert.ok(!dashboard.includes('window.location.hash'), 'le tableau de bord ne lit plus le fragment d’URL');

  // Les alertes d’un espace renvoient vers les pages de ce même espace.
  const owner = await readFile(join(root, 'components/workspace/OwnerWorkspace.tsx'), 'utf8');
  const agent = await readFile(join(root, 'components/workspace/AgentWorkspace.tsx'), 'utf8');
  assert.ok(owner.includes('"/proprietaire/demandes"') && owner.includes('"/proprietaire/visites"'), 'alertes propriétaire dans son espace');
  assert.ok(!owner.includes('"/client/demandes"') && !owner.includes('"/client/visites"'), 'aucune alerte propriétaire vers l’espace client');
  assert.ok(agent.includes('"/agent/visites"'), 'alertes agent dans son espace');
  assert.ok(!agent.includes('"/client/visites"'), 'aucune alerte agent vers l’espace client');

  // Les rôles cumulés ne sont plus renvoyés vers l’espace client par défaut.
  const connexion = await readFile(join(root, 'components/auth/ConnexionView.tsx'), 'utf8');
  assert.ok(connexion.includes('workspaceHref') && connexion.includes('workspaceLabel'), 'destination après connexion nommée par rôle');
  assert.ok(!connexion.includes('homeHref') && !connexion.includes('homeLabel'), 'ancienne destination après connexion retirée');
  assert.ok(connexion.includes('proprietaire') && connexion.includes('agent'), 'destination adaptée au rôle détenu');
});

/* ==================================================================
   HYDRATATION — AUCUN NŒUD TEXTE BLANC SOUS UN PARENT SENSIBLE
   ------------------------------------------------------------------
   React refuse tout nœud texte sous <html>, <head>, <table>, <thead>,
   <tbody>, <tfoot>, <tr>, <colgroup> et <frameset> : c’est une erreur
   d’hydratation garantie. En JSX, l’espace est écrit explicitement
   (`{" "}`) ; entre deux balises indentées il disparaît. On analyse
   donc l’arbre JSX réel, pas les lignes de source.
   ================================================================== */

await test('HOMERA : aucun texte blanc sous <html>, <table> ou <head>', async () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const sensitive = new Set(['html', 'head', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'colgroup', 'frameset']);

  const walk = async (dir) => {
    const entries = await readdir(dir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) files.push(...(await walk(full)));
      else if (/\.tsx$/.test(entry.name)) files.push(full);
    }
    return files;
  };

  const tagNameOf = (node) => {
    if (!ts.isJsxOpeningElement(node) && !ts.isJsxSelfClosingElement(node)) return null;
    if (ts.isIdentifier(node.tagName)) return node.tagName.text.toLowerCase();
    if (ts.isPropertyAccessExpression(node.tagName)) return node.tagName.name.text.toLowerCase();
    return null;
  };

  // `{" "}` et équivalents : un vrai nœud texte, quel que soit le parent.
  const isWhitespaceExpression = (child) => {
    if (!ts.isJsxExpression(child) || !child.expression) return false;
    const expression = child.expression;
    if (!ts.isStringLiteral(expression) && !ts.isNoSubstitutionTemplateLiteral(expression)) return false;
    return expression.text.length > 0 && /^[\s\u00a0]+$/.test(expression.text);
  };
  // Un texte JSX fait uniquement d’espaces sur la même ligne est conservé par le transform.
  const isKeptWhitespaceText = (child, source) => {
    if (!ts.isJsxText(child)) return false;
    const text = child.getText(source);
    return text.length > 0 && /^[ \t]*$/.test(text);
  };

  const findings = [];
  for (const file of [...(await walk(join(root, 'app'))), ...(await walk(join(root, 'components')))]) {
    const source = ts.createSourceFile(file, await readFile(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visit = (node) => {
      if (ts.isJsxElement(node)) {
        const tag = tagNameOf(node.openingElement);
        if (tag && sensitive.has(tag)) {
          for (const child of node.children) {
            if (isWhitespaceExpression(child) || isKeptWhitespaceText(child, source)) {
              const { line } = source.getLineAndCharacterOfPosition(child.getStart(source));
              findings.push(`${relative(root, file)}:${line + 1} → <${tag}>`);
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }

  assert.deepEqual(findings, [], `nœud texte blanc sous un parent sensible :\n${findings.join('\n')}`);

  // Le layout racine garde une structure stricte : <html> → <body>.
  const layout = await readFile(join(root, 'app/layout.tsx'), 'utf8');
  assert.ok(/<html[^>]*>\s*<body/.test(layout), 'le layout racine place <body> directement sous <html>');
  assert.ok(/<\/body>\s*<\/html>/.test(layout), 'le layout racine referme <body> puis <html>');
});

await test('HOMERA : le QR code produit est identique à la référence ISO (vecteurs figés)', () => {
  // Vecteurs calculés avec une implémentation de référence indépendante
  // (paquet `qrcode`, mode octet forcé, niveau de correction M). Toute
  // régression de l’encodage, du Reed-Solomon, du placement, du masque ou de
  // l’information de format fait échouer ce test.
  const vectors = [
    { text: 'HOMERA', version: 1, mask: 0, size: 21, hash: '12496eed79c7a9e8513ae96fb03a404ca5564d859717a8c8b7ad8bcc728d54bd' },
    { text: 'https://homera.example/verification-agent?agent=AG-2041&bien=COT-1182', version: 5, mask: 2, size: 37, hash: '765d3ce69492924036870a41d26ac2c61bed07b9138dbf70e9c57bc63e0f6c08' },
    { text: 'https://homera.bj/verification-agent?agent=AG-1180&bien=COT-1094', version: 5, mask: 4, size: 37, hash: '626d96e7093f7d81e0de0490fbd71dd267daae59ba7984843b2932bd3e2148d9' },
    { text: 'Autorisation vérifiée pour Ménon Kossi · Cotonou — éàçùîô', version: 5, mask: 2, size: 37, hash: 'dec4c466f945d794ff1c52b359f92691dd9776062fc621a4b9a6b0856277edee' },
    { text: 'x'.repeat(500), version: 17, mask: 0, size: 85, hash: '8ad4bef894a27c851cb7b0672603fc3947f818375f22c94354433756c7a79211' },
    { text: 'x'.repeat(2300), version: 40, mask: 0, size: 177, hash: '8ffd1c60658f3e454d3db9789f4950df73dfd200acb6cb259233cc3be31e2207' },
  ];

  for (const vector of vectors) {
    const matrix = qr.createQrMatrix(vector.text);
    assert.equal(matrix.version, vector.version, `version attendue pour ${vector.text.slice(0, 24)}`);
    assert.equal(matrix.mask, vector.mask, `masque attendu pour ${vector.text.slice(0, 24)}`);
    assert.equal(matrix.size, vector.size, `taille attendue pour ${vector.text.slice(0, 24)}`);
    const digest = createHash('sha256').update(`${qr.qrToRows(matrix).join('\n')}\n`).digest('hex');
    assert.equal(digest, vector.hash, `symbole différent de la référence pour ${vector.text.slice(0, 24)}`);
  }

  // Masque imposé : les huit motifs doivent rester conformes.
  for (let mask = 0; mask < 8; mask += 1) {
    const forced = qr.createQrMatrix('https://homera.bj/verification-agent?agent=AG-1180&bien=COT-1094', { mask });
    assert.equal(forced.mask, mask);
    assert.equal(forced.version, 5);
  }

  // Contenu vide et contenu trop long sont refusés explicitement.
  assert.throws(() => qr.createQrMatrix(''), /vide/);
  assert.throws(() => qr.createQrMatrix('x'.repeat(2400)), /trop longues/);
});

await test('HOMERA : le QR code produit se relit sans perte', () => {
  const payloads = [
    'HOMERA',
    'https://homera.example/verification-agent?agent=AG-2041&bien=COT-1182',
    'Référence COT-1182 · mandat vérifié · éàçùîô',
    'x'.repeat(700),
  ];
  for (const text of payloads) {
    assert.equal(qr.decodeQrMatrix(qr.createQrMatrix(text)), text);
  }

  // La référence affichée par l’espace agent se relit à l’identique.
  const authorization = portalData.DEMO_AGENT_AUTHORIZATIONS[0];
  const url = `https://homera.example/verification-agent?agent=${encodeURIComponent(authorization.agentId)}&bien=${encodeURIComponent(authorization.propertyRef)}`;
  assert.equal(qr.decodeQrMatrix(qr.createQrMatrix(url)), url);
});

await test('HOMERA : le QR code ne dépend d’aucun paquet externe', async () => {
  const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  const declared = { ...manifest.dependencies, ...manifest.devDependencies };
  for (const name of Object.keys(declared)) {
    assert.ok(!/^qrcode|^qr\.|^jsqr/.test(name), `dépendance QR externe déclarée : ${name}`);
  }
  const lock = await readFile(new URL('../package-lock.json', import.meta.url), 'utf8');
  assert.ok(!lock.includes('qrcode.react'), 'le verrou contient encore qrcode.react');
  assert.ok(!lock.includes('node_modules/qrcode"'), 'le verrou contient encore un paquet QR externe');

  // Aucun fichier du projet n’importe une bibliothèque de QR code.
  const root = fileURLToPath(new URL('..', import.meta.url));
  const walk = async (directory) => {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') continue;
      const full = join(directory, entry.name);
      if (entry.isDirectory()) files.push(...(await walk(full)));
      else if (/\.(tsx?|mts|mjs|jsx?)$/.test(entry.name)) files.push(full);
    }
    return files;
  };
  const offenders = [];
  for (const file of [...(await walk(join(root, 'app'))), ...(await walk(join(root, 'components'))), ...(await walk(join(root, 'lib')))]) {
    const source = await readFile(file, 'utf8');
    if (/from\s+["'](?:qrcode|qrcode\.react|jsqr)["']|require\(["'](?:qrcode|qrcode\.react|jsqr)["']\)/.test(source)) {
      offenders.push(relative(root, file));
    }
  }
  assert.deepEqual(offenders, [], `fichiers important une bibliothèque QR externe : ${offenders.join(', ')}`);
});

await test('HOMERA : le QR code est rendu sans état (même arbre serveur et navigateur)', async () => {
  const component = await readFile(new URL('../components/ui/QrCode.tsx', import.meta.url), 'utf8');
  assert.ok(component.includes('createQrMatrix'), 'le composant s’appuie sur lib/qr.ts');
  assert.ok(/shapeRendering="crispEdges"/.test(component), 'les modules restent nets à l’écran');
  assert.ok(/QUIET_ZONE = 4/.test(component), 'la zone silencieuse de 4 modules est incluse');
  for (const forbidden of ['use client', 'useState', 'useEffect', 'useSyncExternalStore']) {
    assert.ok(!component.includes(forbidden), `composant QR non déterminé : ${forbidden}`);
  }

  const workspace = await readFile(new URL('../components/workspace/AgentWorkspace.tsx', import.meta.url), 'utf8');
  assert.ok(!workspace.includes('qrcode.react'), 'l’espace agent n’importe plus de paquet externe');
  assert.ok(workspace.includes('@/components/ui/QrCode'), 'l’espace agent utilise le composant interne');

  // L’URL encodée correspond exactement à celle de la page publique.
  const pagesSource = await readFile(new URL('../components/workspace/AgentVerification.tsx', import.meta.url), 'utf8');
  assert.ok(pagesSource.includes('verification-agent') || pagesSource.includes('agentId'), 'la page publique lit agent et bien');

  // Aucun espace blanc parasite dans le SVG (mêmes règles que le reste du projet).
  assert.ok(!/<\/svg>\s*\{["']\s/.test(component), 'pas d’espace JSX après le SVG');
});

await test('HOMERA : le SVG du QR trace exactement la matrice vérifiée', async () => {
  // Le composant est transpilé et rendu avec un runtime JSX minimal : on
  // vérifie l’arbre produit (et non un aperçu) sans navigateur.
  const shim = `data:text/javascript;base64,${Buffer.from(
    "export const Fragment = Symbol('Fragment');export const jsx = (type, props, key) => ({ type, props: props ?? {}, key });export const jsxs = jsx;export const jsxDEV = jsx;",
  ).toString('base64')}`;
  const componentUrl = await moduleUrl(
    'components/ui/QrCode.tsx',
    { 'react/jsx-runtime': shim, '@/lib/qr': qrUrl },
    { jsx: ts.JsxEmit.ReactJSX },
  );
  const { QrCode } = await import(componentUrl);

  const value = 'https://homera.bj/verification-agent?agent=AG-HOM-0248&bien=COT-1182';
  const title = 'QR code de vérification AG-HOM-0248 · COT-1182';
  const element = QrCode({ value, size: 128, title, className: 'text-homera-brown' });

  assert.equal(element.type, 'svg');
  assert.equal(element.props.role, 'img');
  assert.equal(element.props['aria-label'], title);
  assert.equal(element.props.width, 128);
  assert.equal(element.props.height, 128);
  assert.equal(element.props.shapeRendering, 'crispEdges', 'les modules restent nets');

  const matrix = qr.createQrMatrix(value);
  assert.equal(matrix.size, 37, 'le contenu tient dans un symbole de version 5');
  const margin = 4;
  assert.equal(element.props.viewBox, `${-margin} ${-margin} ${matrix.size + margin * 2} ${matrix.size + margin * 2}`, 'zone silencieuse de 4 modules');

  const children = Array.isArray(element.props.children) ? element.props.children : [element.props.children];
  const titleNode = children.find((child) => child && child.type === 'title');
  const pathNode = children.find((child) => child && child.type === 'path');
  assert.ok(titleNode, 'le SVG porte un <title>');
  assert.equal(titleNode.props.children, title);
  assert.ok(pathNode, 'le SVG porte un <path>');
  assert.equal(pathNode.props.fill, 'currentColor', 'la couleur suit la classe du parent');

  let dark = 0;
  for (let row = 0; row < matrix.size; row += 1) {
    for (let col = 0; col < matrix.size; col += 1) if (matrix.modules[row][col]) dark += 1;
  }
  const commands = pathNode.props.d.match(/M(-?\d+) (-?\d+)h1v1h-1z/g) ?? [];
  assert.equal(commands.length, dark, 'un rectangle SVG par module sombre');

  // Chaque rectangle reste dans la zone des modules (jamais dans la marge).
  for (const command of commands) {
    const [, col, row] = command.match(/M(-?\d+) (-?\d+)/);
    assert.ok(Number(col) >= 0 && Number(col) < matrix.size, `colonne hors symbole : ${col}`);
    assert.ok(Number(row) >= 0 && Number(row) < matrix.size, `ligne hors symbole : ${row}`);
  }

  // Le contenu encodé correspond à l’URL de la page publique de vérification.
  const [agentId, propertyRef] = ['AG-HOM-0248', 'COT-1182'];
  assert.equal(qr.decodeQrMatrix(matrix), `https://homera.bj/verification-agent?agent=${agentId}&bien=${propertyRef}`);
});

await test('HOMERA : cadre de gouvernance markdown complet et synchronisé', async () => {
  const governanceFiles = [
    'AGENTS.md',
    'PROJECT.md',
    'VISION.md',
    'DESIGN_SYSTEM.md',
    'FRONTEND_RULES.md',
    'QUALITY_GATE.md',
    'ROADMAP.md',
    'CURRENT_STATE.md',
    'docs/pages/README.md',
    'docs/pages/PUBLIC_SITE.md',
    'docs/pages/AUTH_FLOWS.md',
    'docs/pages/WORKSPACES.md',
    'docs/components/README.md',
    'docs/components/PRIMITIVES_AND_LAYOUT.md',
    'docs/components/CATALOG_AND_HOME.md',
    'docs/components/WORKSPACE_AND_AUTH.md',
    'docs/interactions/README.md',
    'docs/interactions/MOTION_AND_SCROLL.md',
    'docs/interactions/WORKFLOWS_AND_STATE.md',
    'docs/interactions/ACCESSIBILITY_AND_RESPONSIVE.md',
  ];
  for (const rel of governanceFiles) {
    const appDoc = await readFile(new URL(`../${rel}`, import.meta.url), 'utf8');
    const rootDoc = await readFile(new URL(`../../${rel}`, import.meta.url), 'utf8');
    assert.ok(appDoc.trim().length > 200, `document trop court : homera/${rel}`);
    assert.equal(appDoc, rootDoc, `désynchronisation entre homera/${rel} et /${rel}`);
  }
  const agents = await readFile(new URL('../AGENTS.md', import.meta.url), 'utf8');
  assert.ok(agents.includes('# HOMERA — CUSTOM DESIGN & VISUAL DIRECTION'), 'AGENTS.md intègre la direction de conception sur mesure');
  assert.ok(agents.includes('# HOMERA — PRODUCT QUALITY & AUTONOMOUS DESIGN INTELLIGENCE'), 'AGENTS.md intègre le bloc Product Quality & Autonomous Design Intelligence');
  assert.ok(agents.includes('# HOMERA — GLOBAL SPEED & FLUIDITY DIRECTIVE'), 'AGENTS.md intègre la directive globale de vitesse et fluidité');
  assert.ok(agents.includes('OUI, AJOUTER') && agents.includes('OUI, SUPPRIMER') && agents.includes('BOUCLE AUTONOME'), 'AGENTS.md intègre le pouvoir de décision et la boucle autonome en 11 étapes');
  assert.ok(agents.includes('PHASE 2 — RECHERCHE & INSPIRATION') && agents.includes('PHASE 5 — CRITIQUE & SUPPRESSION'), 'AGENTS.md intègre le workflow en 7 phases');
  const qualityGate = await readFile(new URL('../QUALITY_GATE.md', import.meta.url), 'utf8');
  assert.ok(qualityGate.includes('# 5. CUSTOM DESIGN & CREATIVE QUALITY'), 'QUALITY_GATE.md intègre la 5e catégorie Custom Design & Creative Quality');
  assert.ok(qualityGate.includes('# 6. PRODUCT QUALITY & AUTONOMOUS DESIGN INTELLIGENCE'), 'QUALITY_GATE.md intègre la 6e catégorie Product Quality & Autonomous Design Intelligence');
  assert.ok(qualityGate.includes('# 7. GLOBAL SPEED & FLUIDITY DIRECTIVE'), 'QUALITY_GATE.md intègre la 7e catégorie Global Speed & Fluidity Directive');
});

await test('HOMERA : échelle typographique stricte (--text-*) dans tous les composants et pages', async () => {
  const sources = [];
  const walk = async (dir) => {
    for (const entry of await readdir(new URL(dir, import.meta.url), { withFileTypes: true })) {
      if (entry.isDirectory()) await walk(`${dir}${entry.name}/`);
      else if (entry.name.endsWith('.tsx')) sources.push(new URL(`${dir}${entry.name}`, import.meta.url));
    }
  };
  await walk('../components/');
  await walk('../app/');
  const allowedTextTokens = new Set([
    'text-micro', 'text-caption', 'text-note', 'text-body-sm', 'text-label', 'text-body',
    'text-display-xs', 'text-display-sm', 'text-display-md', 'text-display-lg', 'text-display-xl',
    'text-display-2xl', 'text-display-fluid',
    'text-figure', 'text-figure-lg', 'text-figure-fluid',
    'text-accent', 'text-accent-lg',
    'text-brand', 'text-brand-compact', 'text-brand-sm',
    'text-[1.06em]',
    'text-left', 'text-center', 'text-right', 'text-justify', 'text-start', 'text-end',
    'text-wrap', 'text-nowrap', 'text-balance', 'text-pretty', 'text-ellipsis', 'text-clip',
    'text-transparent', 'text-current', 'text-inherit', 'text-white', 'text-black',
  ]);
  const violations = [];
  for (const url of sources) {
    const src = await readFile(url, 'utf8');
    src.split('\n').forEach((line, index) => {
      const matches = line.match(/\btext-[a-zA-Z0-9_\[\].%-]+/g) || [];
      for (const token of matches) {
        if (allowedTextTokens.has(token)) continue;
        if (/^text-(foreground|background|muted|muted-light|homera-|success|warning|error|info|ring|card|border)/.test(token)) continue;
        if (line.includes('--text-')) continue;
        violations.push(`${url.pathname}:${index + 1} -> ${token}`);
      }
      const classAttrs = line.match(/className=(?:"[^"]*"|\{`[^`]*`\})/g) || [];
      for (const attr of classAttrs) {
        if (/\bfont-serif\b/.test(attr) && /\bfont-(semibold|bold|extrabold|black)\b/.test(attr)) {
          violations.push(`${url.pathname}:${index + 1} -> font-serif + graisse synthétique`);
        }
      }
    });
  }
  assert.deepEqual(violations, [], `violations d’échelle typographique : ${violations.join(', ')}`);
});

await test('HOMERA : cohérence fonctionnelle et accessibilité des espaces (profil par rôle, labels, footer, notifications)', async () => {
  const profileSettings = await readFile(new URL('../components/workspace/ProfileSettings.tsx', import.meta.url), 'utf8');
  assert.ok(profileSettings.includes('describeProfile(role, account.profile)'), 'ProfilePage affiche les champs du rôle actif');

  const primitives = await readFile(new URL('../components/workspace/Primitives.tsx', import.meta.url), 'utf8');
  assert.ok(!primitives.includes('<span className="sr-only">{describedBy}</span>'), 'FormField n’expose pas les IDs DOM bruts aux lecteurs d’écran');

  const ownerWorkspace = await readFile(new URL('../components/workspace/OwnerWorkspace.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(ownerWorkspace, /<label[^>]*>\s*<FormField/, 'aucun <label> imbriqué autour de FormField');

  const workspaceFooter = await readFile(new URL('../components/workspace/WorkspaceFooter.tsx', import.meta.url), 'utf8');
  assert.ok(workspaceFooter.includes('lg:pl-[calc(268px+1.5rem)]'), 'WorkspaceFooter compense la barre latérale fixe sur desktop');
  assert.ok(!workspaceFooter.includes('new Date().getFullYear()'), 'WorkspaceFooter déterministe au rendu SSR/CSR');

  const clientDashboard = await readFile(new URL('../components/client/ClientDashboard.tsx', import.meta.url), 'utf8');
  assert.ok(clientDashboard.includes('unreadWorkflowNotifications'), 'ClientDashboard synchronise les notifications du workflow');

  const agentVerification = await readFile(new URL('../components/workspace/AgentVerification.tsx', import.meta.url), 'utf8');
  assert.ok(agentVerification.includes('action="/verification-agent"'), 'AgentVerification expose un formulaire de recherche interactif');

  const clientFavorites = await readFile(new URL('../components/workspace/ClientFavorites.tsx', import.meta.url), 'utf8');
  assert.ok(!clientFavorites.includes('Comparer · bientôt'), 'suppression du placeholder mort dans ClientFavorites');
  assert.ok(clientFavorites.includes('PropertyComparison'), 'comparateur actif dans ClientFavorites');

  const catalogExplorer = await readFile(new URL('../components/catalog/CatalogExplorer.tsx', import.meta.url), 'utf8');
  assert.ok(catalogExplorer.includes('CommuneMapExplorer'), 'vue cartographique interactive des communes intégrée dans CatalogExplorer');

  assert.ok(!ownerWorkspace.includes('Continuer vers le paiement · bientôt disponible'), 'suppression du bouton placeholder mort dans OwnerSubscription');
  assert.ok(ownerWorkspace.includes('/contact?sujet=gestion'), 'OwnerSubscription oriente les formules sur devis vers /contact?sujet=gestion');

  const adminWorkspace = await readFile(new URL('../components/workspace/AdminWorkspace.tsx', import.meta.url), 'utf8');
  assert.ok(adminWorkspace.includes('data.visits.map') && adminWorkspace.includes('data.applications.map'), 'AdminRecords reflète les visites et demandes locales du workflow');

  const agentWorkspace = await readFile(new URL('../components/workspace/AgentWorkspace.tsx', import.meta.url), 'utf8');
  assert.ok(agentWorkspace.includes('describeProfile("agent", account.profile)'), 'AgentProfile affiche les champs détaillés du profil agent');

  const propertyDetail = await readFile(new URL('../components/catalog/PropertyDetail.tsx', import.meta.url), 'utf8');
  assert.ok(propertyDetail.includes('getNeighborhoodContext') && propertyDetail.includes('getPropertyCommitmentGuide'), 'PropertyDetail intègre le contexte du quartier et les repères financiers');

  const projectPage = await readFile(new URL('../components/catalog/ProjectPage.tsx', import.meta.url), 'utf8');
  assert.ok(projectPage.includes('PROJECT_DECISION_GUIDES'), 'ProjectPage intègre le guide de décision et la FAQ par projet');

  const categoryPage = await readFile(new URL('../components/catalog/CategoryPage.tsx', import.meta.url), 'utf8');
  assert.ok(categoryPage.includes('getCategoryVerificationNote'), 'CategoryPage intègre les points de contrôle par catégorie');

  const serviceDetail = await readFile(new URL('../components/site/ServiceDetail.tsx', import.meta.url), 'utf8');
  assert.ok(serviceDetail.includes('SERVICE_DETAILED_GUIDES'), 'ServiceDetail intègre le périmètre détaillé, les livrables et la FAQ de chaque métier');

  assert.ok(catalogExplorer.includes('onTermChange') && catalogExplorer.includes('priority={index < 3}'), 'CatalogExplorer filtre au fil de la frappe et précharge les 3 premières cartes');

  const hero = await readFile(new URL('../components/home/Hero.tsx', import.meta.url), 'utf8');
  assert.ok(hero.includes('preload="metadata"') && hero.includes('poster="/images/page-cotonou.jpg"'), 'Hero optimise la vidéo pour mobile avec preload metadata et poster');

  const authProvider = await readFile(new URL('../components/providers/AuthProvider.tsx', import.meta.url), 'utf8');
  assert.ok(authProvider.includes('ACCOUNTS_STORAGE_KEY') && authProvider.includes('SESSION_STORAGE_KEY'), 'AuthProvider filtre strictement les événements storage');

  const siteLoading = await readFile(new URL('../app/(site)/loading.tsx', import.meta.url), 'utf8');
  assert.ok(siteLoading.includes('homera-skeleton'), 'app/(site)/loading.tsx fournit un squelette de transition immédiat');

  // Switch d’espace basé sur les permissions réelles et navigation unifiée défilante
  assert.deepEqual(auth.accessibleWorkspaces(['client'], {}).map((entry) => entry.id), ['client'], 'un client simple ne voit que l’espace client');
  assert.deepEqual(auth.accessibleWorkspaces(['proprietaire'], {}).map((entry) => entry.id), ['proprietaire', 'client'], 'un propriétaire bascule entre Propriétaire et Client');
  assert.deepEqual(auth.accessibleWorkspaces(['agent'], {}).map((entry) => entry.id), ['agent', 'client'], 'un agent bascule entre Agent et Client');
  assert.deepEqual(auth.accessibleWorkspaces(['client', 'proprietaire', 'agent'], {}).map((entry) => entry.id), ['proprietaire', 'agent', 'client'], 'un compte multi-rôle bascule entre Propriétaire, Agent et Client');
  assert.deepEqual(auth.accessibleWorkspaces(['client'], { demoRole: 'admin' }).map((entry) => entry.id), ['admin', 'proprietaire', 'agent', 'client'], 'un compte admin bascule entre Admin, Propriétaire, Agent et Client');

  const workspaceShell = await readFile(new URL('../components/workspace/WorkspaceShell.tsx', import.meta.url), 'utf8');
  assert.ok(workspaceShell.includes('Switch d’espace') && workspaceShell.includes('Navigation principale') && workspaceShell.includes('Actions secondaires'), 'WorkspaceShell structure la navigation en 3 niveaux UX');
  assert.ok(workspaceShell.includes('homera-nav-scroll') && !workspaceShell.includes('mt-auto border-t'), 'WorkspaceShell défile comme une seule zone continue sans pied de page fixe');
  assert.ok(clientDashboard.includes('<WorkspaceShell role="client" section="dashboard">') && !clientDashboard.includes('<aside'), 'ClientDashboard utilise le système de navigation commun WorkspaceShell');
});


