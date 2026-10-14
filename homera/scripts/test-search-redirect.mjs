/* ------------------------------------------------------------------
   HOMERA — Recherche d’accueil : redirection + critères réellement appliqués.

   Couvre les 7 cas obligatoires :
     1. Acheter + localisation + type + montant
     2. Louer + localisation + type
     3. Séjour + localisation
     4. Acheter, critères vides
     5. Louer, critères vides
     6. Sans projet -> explorateur global
     7. Aucun bien correspondant -> état vide explicite

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
import { catalogHref, criteriaToCatalogQuery, searchDestination } from '../lib/properties.ts';

const BASE = process.env.HOMERA_BASE_URL ?? 'http://127.0.0.1:3000';

const CASES = [
  {
    name: '1. Acheter + Cotonou + appartement + 50M',
    criteria: { project: 'acheter', location: 'Cotonou', propertyType: 'appartement', budget: '50 000 000' },
    url: '/acheter?intention=acheter&type=appartement&ville=Cotonou&prix-max=50000000',
    present: ['HOM-CTN-000671', '1 bien', '>Cotonou<', '>Appartement<'],
    absent: ['HOM-CTN-000658'],
  },
  {
    name: '2. Louer + Abomey-Calavi + maison',
    criteria: { project: 'louer', location: 'Abomey-Calavi', propertyType: 'maison', budget: '' },
    url: '/louer?intention=louer&type=villa&ville=Abomey-Calavi',
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
    present: ['14 biens'],
    absent: ['Aucun bien ne correspond à ces critères</h2>'],
  },
  {
    name: '6. Sans projet -> explorateur global',
    criteria: { project: '', location: 'Cotonou', propertyType: '', budget: '' },
    url: '/explorer?ville=Cotonou',
    present: ['21 biens'],
    absent: ['intention='],
  },
  {
    name: '7. Aucun bien (budget 1 000)',
    criteria: { project: 'louer', location: '', propertyType: '', budget: '1 000' },
    url: '/louer?intention=louer&prix-max=1000',
    present: ['Aucun bien ne correspond à ces critères</h2>', 'Aucun bien ne correspond à ces critères dans la rubrique Louer', 'Aucun bien'],
    absent: ['HOM-'],
  },
];

await test('recherche : adresses construites exactes (7 cas)', () => {
  for (const entry of CASES) {
    const built = catalogHref(criteriaToCatalogQuery(entry.criteria), searchDestination(entry.criteria));
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
    for (const needle of entry.absent) assert.ok(!html.includes(needle), `${entry.name} : présent « ${needle} »`);
  });
}
