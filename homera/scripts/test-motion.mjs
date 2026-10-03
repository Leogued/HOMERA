import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';

const moduleUrl = async (file, replacements = {}) => {
  let { outputText } = ts.transpileModule(await readFile(new URL(`../${file}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
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
  assert.equal(await accounts.verifyPassword({ ...record, hash: record.hash.replace(/.$/, '0') }, password), false);

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
