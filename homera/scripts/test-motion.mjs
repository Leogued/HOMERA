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
    const accent = channels(theme === light ? theme['--homera-terracotta-dark'] : theme['--homera-terracotta']);
    assert.ok(ratio(accent, bg) >= 4.5);
    assert.ok(ratio(channels('#ffffff'), channels(theme['--homera-terracotta-dark'])) >= 4.5);
    assert.ok(ratio(channels(theme['--muted']), bg) >= 4.5);
    assert.ok(ratio(channels(theme['--info']), bg) >= 4.5, `--info illisible (${theme['--info']})`);
    assert.ok(ratio(channels(theme['--ring']), bg) >= 3, '--ring insuffisant pour un anneau de focus');
    const secondary = channels(theme['--foreground']).map((channel, index) => channel * .78 + bg[index] * .22);
    assert.ok(ratio(secondary, bg) >= 4.5);
  }
  assert.ok(ratio(channels('#e0a45e'), channels('#3e2418')) >= 4.5);
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
