import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
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
const format = await import(await moduleUrl('lib/format.ts'));
const mediaUrl = await moduleUrl('lib/media.generated.ts');
const media = await import(mediaUrl);
const data = await import(await moduleUrl('lib/content.ts', { '@/lib/media.generated': mediaUrl }));
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
await test('HOMERA : les 16 médias référencés existent, les couvertures sont dédiées', async () => {
  assert.equal(Object.keys(media.MEDIA).length, 16);
  for (const asset of Object.values(media.MEDIA)) {
    assert.ok((await stat(new URL(`../public${asset.src}`, import.meta.url))).size > 0);
    assert.ok(asset.width > 0 && asset.height > 0 && asset.blurDataURL.startsWith('data:image/'));
  }
  for (const story of data.EDITORIAL.stories.slice(0, 3)) assert.ok(story.media.startsWith('editorial-'));
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
