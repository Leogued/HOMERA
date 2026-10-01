import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const fromFile = process.argv[2] === '--file';
const base = new URL(fromFile ? 'http://127.0.0.1:3000' : process.argv[2] ?? 'http://127.0.0.1:3000');
const fetchOk = async (path, options = {}) => {
  const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(90000), ...options });
  assert.equal(response.status, 200, `${path} : HTTP ${response.status}`);
  return response;
};
const raw = fromFile ? await readFile(process.argv[3] ?? '.next/server/app/index.html', 'utf8') : await (await fetchOk('/')).text();
// Le payload RSC contient du code, pas des attributs du DOM rendu.
const html = raw.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
const idSet = new Set(ids);
assert.equal(ids.length, idSet.size, 'Un identifiant dupliqué existe dans le HTML');
const references = [...html.matchAll(/\b(?:aria-controls|aria-labelledby|aria-describedby)="([^"]+)"/g)].flatMap((match) => match[1].split(/\s+/));
for (const reference of references) assert.ok(idSet.has(reference), `Référence aria orpheline : ${reference}`);
assert.equal([...html.matchAll(/<h1\b/g)].length, 1, 'Un seul h1');
for (const id of ['hero', 'chiffres', 'explorer', 'biens', 'bien-homera', 'protocole', 'services', 'magazine', 'manifeste']) assert.ok(idSet.has(id), `Chapitre manquant : ${id}`);
for (const intent of ['acheter', 'louer', 'sejour', 'investir']) assert.ok(idSet.has(`intent-${intent}`), `Intention manquante : ${intent}`);
for (const id of ['acheter', 'louer', 'sejour', 'services']) assert.ok(idSet.has(`menu-${id}`), `Menu manquant : ${id}`);
for (let index = 0; index < 7; index++) assert.ok(idSet.has(`protocol-step-${index}`), `Étape manquante : ${index}`);
for (const id of ['localisation', 'statut', 'proprietaire', 'verification', 'agent', 'date']) assert.ok(idSet.has(`dossier-field-${id}`), `Donnée manquante : ${id}`);
for (const id of ['gestion', 'maintenance', 'demenagement', 'travaux']) assert.ok(idSet.has(`services-${id}`), `Service manquant : ${id}`);
const anchors = [...html.matchAll(/href="#([^"]+)"/g)].map((match) => match[1]);
for (const anchor of anchors) if (anchor !== 'login') assert.ok(idSet.has(anchor), `Ancre orpheline : ${anchor}`);
assert.ok(html.includes('/video/background_video.mp4'), 'La vidéo d’origine est conservée');
assert.ok(html.includes('Pause vidéo'), 'Contrôle de la vidéo accessible');
assert.ok(html.includes('L’immobilier commence par un lieu.'), 'Transition éditoriale présente');
assert.ok(html.includes('Explorer HOMERA'), 'Action finale présente');
assert.ok(html.includes('démonstration'), 'Les données de démo doivent être signalées');
assert.ok(!html.includes('NaN'), 'Pas de valeur NaN');

// Audit de structure limité, sans simuler un navigateur : pas d'interactifs imbriqués.
const stack = [];
const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
for (const match of html.matchAll(/<(\/?)([a-z][\w-]*)\b([^>]*)>/gi)) {
  const closing = Boolean(match[1]), tag = match[2].toLowerCase(), attrs = match[3];
  if (closing) { const index = stack.lastIndexOf(tag); if (index >= 0) stack.length = index; continue; }
  if (['a', 'button', 'input', 'select', 'textarea'].includes(tag)) {
    assert.ok(!stack.some((parent) => ['a', 'button'].includes(parent)), `Élément ${tag} imbriqué dans un lien ou bouton`);
  }
  if (!voidTags.has(tag) && !attrs.endsWith('/')) stack.push(tag);
}
console.log(`✓ ${ids.length} identifiants uniques ; ${references.length} références aria résolues`);
console.log('✓ 9 chapitres, 4 intentions, 6 données reliées, 7 étapes, 4 services');
console.log('✓ Ancres valides (hors #login préexistant), aucun interactif imbriqué');
console.log('✓ Vidéo, texte signature, CTA et mentions de démonstration présents');

if (!fromFile) {
  const cssPaths = [...new Set([...html.matchAll(/href="([^\"]+\.css(?:\?[^\"]*)?)"/g)].map((match) => match[1].replaceAll('&amp;', '&')))];
  let css = '';
  for (const path of cssPaths) css += await (await fetchOk(path)).text();
  for (const selector of ['homera-hero-video', 'homera-intent-doors', 'homera-property-gallery', 'homera-story-sticky', 'homera-dossier-field', 'homera-protocol-copy', 'homera-final-action']) assert.ok(css.includes(selector), `CSS non compilé : ${selector}`);
  assert.ok(css.includes('prefers-reduced-motion'), 'CSS pour le mouvement réduit');
  assert.ok(css.includes('min-height: 700px') || css.includes('min-height:700px'), 'Garde de hauteur pour les sticky');
  const image = await fetchOk('/_next/image?url=%2Fimages%2Fprop-villa.jpg&w=1080&q=72', { headers: { Accept: 'image/avif' } });
  assert.ok(image.headers.get('content-type')?.startsWith('image/'), 'Image optimisée servie');
  const bytes = (await image.arrayBuffer()).byteLength;
  assert.ok(bytes > 0, 'Image non vide');
  console.log(`✓ CSS des scènes et du mouvement réduit compilé ; image ${image.headers.get('content-type')} : ${bytes} octets`);
}
console.log(fromFile ? 'Audit statique de production terminé (pas de test navigateur).' : 'Audit HTTP terminé (pas de test visuel ou tactile).');
