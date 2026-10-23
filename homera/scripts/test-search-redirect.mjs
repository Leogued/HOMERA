/* ------------------------------------------------------------------
   HOMERA — Recherche d’accueil : destination + critères réellement appliqués.

   Règle de destination : le tri se fait SUR LA PAGE DE SOUS-MENU.
     - projet + type connu  -> /{projet}/{sous-rubrique} (type dans le
       chemin, le reste en paramètres : ville, budget…)
     - projet sans type (ou type sans rubrique : studio à acheter,
       séjour par type)     -> /{projet} + paramètres complets
     - sans projet          -> /explorer + paramètres (recherche globale)

   Cas couverts (les 7 obligatoires + 2 replis) :
     1. Acheter + Cotonou + appartement + 50M   -> /acheter/appartements
     2. Louer + Abomey-Calavi + maison          -> /louer/maisons
     3. Séjour + Ouidah                        -> /sejour
     4. Acheter, critères vides                 -> /acheter
     5. Louer, critères vides                   -> /louer
     6. Sans projet                             -> /explorer
     7. Aucun bien (budget 1 000)               -> état vide explicite
     8. Séjour + appartement (pas de rubrique)  -> /sejour + type
     9. Acheter + studio (pas de rubrique)      -> /acheter + type, vide
    10. Fourchette posée sur place (min+max)     -> servie uniquement

   Deux couches vérifiées VRAIMENT :
     A. construction de l’adresse (logique pure, exécutée ici) ;
     B. page de destination servie (HTTP) : bons biens, compteur,
        pastilles de filtres pré-remplies, état vide.
   Le clic client (router.push) est verrouillé par test-motion sur le
   code du module ; le parcours souris complet relève du navigateur.

   Lancement :
     HOMERA_BASE_URL=http://127.0.0.1:3103 node --experimental-strip-types \
       --no-warnings --import ./scripts/ts-alias-register.mjs \
       scripts/test-search-redirect.mjs
   ------------------------------------------------------------------ */
import test from 'node:test';
import assert from 'node:assert/strict';
import { searchDestination, searchHref } from '../lib/nav.ts';

const BASE = process.env.HOMERA_BASE_URL ?? 'http://127.0.0.1:3000';

const CASES = [
  {
    name: '1. Acheter + Cotonou + appartement + 50M',
    criteria: { project: 'acheter', location: 'Cotonou', propertyType: 'appartement', budget: '50 000 000' },
    url: '/acheter/appartements?ville=Cotonou&prix-max=50000000',
    present: ['HOM-CTN-000671', '1 bien', '>Cotonou<'],
    absent: ['HOM-CTN-000658'],
  },
  {
    name: '2. Louer + Abomey-Calavi + maison',
    criteria: { project: 'louer', location: 'Abomey-Calavi', propertyType: 'maison', budget: '' },
    url: '/louer/maisons?ville=Abomey-Calavi',
    present: ['HOM-CAL-000342', '1 bien', '>Abomey-Calavi<'],
    absent: [],
  },
  {
    name: '3. Séjour + Ouidah',
    criteria: { project: 'sejour', location: 'Ouidah', propertyType: '', budget: '' },
    url: '/sejour?intention=sejour&ville=Ouidah',
    present: ['HOM-OUH-000075', 'HOM-OUH-000081', '2 biens'],
    absent: [],
  },
  {
    name: '4. Acheter, critères vides',
    criteria: { project: 'acheter', location: '', propertyType: '', budget: '' },
    url: '/acheter?intention=acheter',
    present: ['13 biens'],
    absent: ['Aucun bien ne correspond à ces critères</h2>'],
  },
  {
    name: '5. Louer, critères vides',
    criteria: { project: 'louer', location: '', propertyType: '', budget: '' },
    url: '/louer?intention=louer',
    present: ['16 biens'],
    absent: ['Aucun bien ne correspond à ces critères</h2>'],
  },
  {
    name: '6. Sans projet -> explorateur global',
    criteria: { project: '', location: 'Cotonou', propertyType: '', budget: '' },
    url: '/explorer?ville=Cotonou',
    present: ['HOM-', 'affichés'],
    absent: ['intention=', 'Aucun bien ne correspond', 'font-semibold">23 biens'],
  },
  {
    name: '7. Aucun bien (budget 1 000)',
    criteria: { project: 'louer', location: '', propertyType: '', budget: '1 000' },
    url: '/louer?intention=louer&prix-max=1000',
    present: ['Aucun bien ne correspond à ces critères</h2>', 'Aucun bien ne correspond à ces critères dans la rubrique Louer', 'Aucun bien'],
    absent: ['HOM-'],
  },
  {
    name: '8. Séjour + appartement (repli page projet)',
    criteria: { project: 'sejour', location: '', propertyType: 'appartement', budget: '' },
    url: '/sejour?intention=sejour&type=appartement',
    present: ['5 biens', 'HOM-PNV-000084', '>Appartement<'],
    absent: [],
  },
  {
    name: '9. Acheter + studio (repli vide)',
    criteria: { project: 'acheter', location: '', propertyType: 'studio', budget: '' },
    url: '/acheter?intention=acheter&type=studio',
    present: ['Aucun bien ne correspond à ces critères</h2>', 'Aucun bien ne correspond à ces critères dans la rubrique Acheter'],
    // "(HOM-...)" est le texte d'aide générique, pas une annonce : on l'écarte avant contrôle.
    ignore: ['(HOM-...)'],
    absent: ['HOM-'],
  },
  {
    name: '10. prix min+max (fourchette sur place)',
    criteria: null, // la borne basse se pose sur la page, pas depuis l'accueil
    url: '/acheter/appartements?ville=Cotonou&prix-min=40000000&prix-max=70000000',
    present: ['HOM-CTN-000658'],
    absent: ['HOM-CTN-000671'],
  },
];

await test('recherche : adresses construites exactes (9 cas)', () => {
  for (const entry of CASES) {
    if (!entry.criteria) continue;
    const built = searchHref(entry.criteria);
    assert.equal(built, entry.url, `${entry.name} : ${built}`);
  }
  assert.equal(searchDestination({ project: 'xxx', location: '', propertyType: '', budget: '' }), '/explorer');
});

for (const entry of CASES) {
  await test(`recherche servie : ${entry.name}`, async () => {
    const response = await fetch(new URL(entry.url, BASE), { signal: AbortSignal.timeout(30000) });
    assert.equal(response.status, 200, `${entry.name} : HTTP ${response.status}`);
    const html = await response.text();
    for (const needle of entry.present) assert.ok(html.includes(needle), `${entry.name} : absent « ${needle} »`);
    let body = html;
    for (const drop of entry.ignore ?? []) body = body.replaceAll(drop, '');
    for (const needle of entry.absent) assert.ok(!body.includes(needle), `${entry.name} : présent « ${needle} »`);
  });
}

await test('recherche : robustesse des critères (§9.6)', () => {
  const base = { project: 'acheter', location: 'Cotonou', propertyType: 'appartement', budget: '50000000' };
  const reordered = { budget: '50000000', propertyType: 'appartement', location: 'Cotonou', project: 'acheter' };
  assert.equal(searchHref(reordered), searchHref(base), 'ordre de sélection indifférent');
  assert.equal(
    searchHref({ ...base, propertyType: 'chateau' }),
    '/acheter?intention=acheter&ville=Cotonou&prix-max=50000000',
    'type inconnu écarté, projet conservé',
  );
  assert.ok(!searchHref({ ...base, location: 'Paris' }).includes('ville='), 'ville inconnue écartée');
  for (const bad of ['abc', '0', '']) {
    assert.ok(!searchHref({ ...base, budget: bad }).includes('prix-max'), `budget « ${bad} » ignoré`);
  }
  assert.ok(
    searchHref({ ...base, budget: '-500' }).includes('prix-max=500'),
    'budget « -500 » assaini comme à la saisie',
  );
  assert.ok(
    searchHref({ ...base, budget: '50\u202f000\u202f000' }).includes('prix-max=50000000'),
    'montant formaté compris',
  );
});

await test('recherche servie : URL partagée déterministe (§9.6)', async () => {
  const url = new URL('/acheter/appartements?ville=Cotonou&prix-max=50000000', BASE);
  const refs = async () =>
    [...(await (await fetch(url, { signal: AbortSignal.timeout(30000) })).text()).matchAll(/HOM-[A-Z]+-\d+/g)]
      .map((match) => match[0])
      .sort();
  assert.deepEqual(await refs(), await refs(), 'deux lectures, mêmes biens');
});
