/* ------------------------------------------------------------------
   QA visuelle du flou des sous-menus (navigation desktop + mobile).

   Utilisation (depuis VS Code, Playwright installé sur la machine) :
     1. démarrer le site :  npm run dev      (http://localhost:3000)
     2. exécuter ce module avec un harnais Playwright qui fournit `page`
        et affiche la valeur retournée.
   Les captures sont écrites dans le dossier courant (chemins relatifs :
   aucun chemin absolu Windows ne doit figurer ici).

   Le script ÉCHOUE (throw) si le givre est sous le seuil spécifié :
     - flou d'arrière-plan >= 100 px
     - désaturation saturate(0) présente
     - assombrissement brightness <= 0.85 présent
     - menu mobile : fond opaque (aucun contenu derrière)
   Les captures PNG restent l'arbitre final : à l'œil, le contenu
   derrière le panneau ne doit plus être reconnaissable.

   Rappel des identifiants réels (lib/nav.ts -> navPanelId sur le TITRE
   complet de l'entrée) :
     - accueil   : menu-acheter-un-bien-au-benin, menu-louer-un-logement-au-benin,
                   menu-sejourner-au-benin, menu-services (.homera-nav-panel)
     - pages     : public-menu-* (.homera-dropdown-enter, pas .homera-nav-panel)
   ------------------------------------------------------------------ */

// Panneaux desktop de l'accueil : identifiants complets, pas les libellés courts.
const DESKTOP_PANELS = [
  'menu-acheter-un-bien-au-benin',
  'menu-louer-un-logement-au-benin',
  'menu-sejourner-au-benin',
  'menu-services',
];

// Seuils du givre intense : refuser tout rendu en dessous.
function assertFrost(value, where) {
  const filter = value && value !== 'none' ? value : null;
  if (!filter) {
    throw new Error(`[nav-blur-qa] ${where} : backdrop-filter absent (navigateur incompatible ?).`);
  }
  const blur = filter.match(/blur\(([0-9.]+)px\)/);
  if (!blur || Number(blur[1]) < 100) {
    throw new Error(`[nav-blur-qa] ${where} : flou ${blur ? `${blur[1]}px` : 'absent'} < 100px requis.`);
  }
  if (!/saturate\(0%?\)/.test(filter)) {
    throw new Error(`[nav-blur-qa] ${where} : désaturation saturate(0) absente.`);
  }
  const brightness = filter.match(/brightness\(([0-9.]+)\)/);
  if (!brightness || Number(brightness[1]) > 0.85) {
    throw new Error(
      `[nav-blur-qa] ${where} : assombrissement ${brightness ? brightness[1] : 'absent'} insuffisant (<= 0.85 requis).`,
    );
  }
}

export default async function run(page) {
  page.setDefaultNavigationTimeout(120000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });

  const desktop = [];
  for (const id of DESKTOP_PANELS) {
    const trigger = page.locator(`button[aria-controls="${id}"]`);
    await trigger.hover();
    const panel = page.locator(`#${id} .homera-nav-panel`);
    await panel.waitFor({ state: 'visible' });
    const result = await panel.evaluate((element) => {
      const style = getComputedStyle(element);
      const header = element.closest('header');
      return {
        id: element.parentElement?.id ?? element.getAttribute('aria-label'),
        background: style.backgroundColor,
        backdropFilter: style.backdropFilter,
        webkitBackdropFilter: style.webkitBackdropFilter,
        opacity: style.opacity,
        headerZIndex: header ? getComputedStyle(header).zIndex : null,
      };
    });
    assertFrost(result.backdropFilter || result.webkitBackdropFilter, `accueil #${id}`);
    desktop.push(result);
    if (id === 'menu-services') {
      await page.screenshot({ path: 'nav-blur-desktop.png' });
    }
  }

  // Page explorer : préfixe public-menu-* et classe .homera-dropdown-enter.
  await page.goto('http://localhost:3000/explorer', { waitUntil: 'domcontentloaded' });
  await page.locator('button[aria-controls="public-menu-services"]').hover();
  const publicPanel = page.locator('#public-menu-services .homera-dropdown-enter');
  await publicPanel.waitFor({ state: 'visible' });
  const publicHeader = await publicPanel.evaluate((element) => {
    const style = getComputedStyle(element);
    const header = element.closest('header');
    return {
      background: style.backgroundColor,
      backdropFilter: style.backdropFilter,
      webkitBackdropFilter: style.webkitBackdropFilter,
      headerBackdropFilter: header ? getComputedStyle(header).backdropFilter : null,
      headerZIndex: header ? getComputedStyle(header).zIndex : null,
    };
  });
  assertFrost(publicHeader.backdropFilter || publicHeader.webkitBackdropFilter, 'explorer #public-menu-services');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Ouvrir le menu' }).click();
  await page.locator('#homera-mobile-menu').waitFor({ state: 'visible' });
  await page.locator('#homera-mobile-menu').getByRole('button', { name: 'Services' }).click();
  const mobile = await page.locator('#homera-mobile-menu').evaluate((element) => {
    const background = element.querySelector(':scope > div.absolute');
    return {
      visible: getComputedStyle(element).visibility,
      surface: background ? getComputedStyle(background).backgroundColor : null,
      expanded: element.querySelector('button[aria-expanded="true"]')?.textContent?.trim() ?? null,
      childLinks: element.querySelectorAll('a[href^="/services/"]').length,
    };
  });
  const alpha = mobile.surface?.match(/rgba?\([^)]*,\s*([0-9.]+)\s*\)/);
  if (alpha && Number(alpha[1]) < 1) {
    throw new Error(`[nav-blur-qa] mobile : fond du tiroir translucide (${mobile.surface}), opaque requis.`);
  }
  await page.screenshot({ path: 'nav-blur-mobile.png' });

  return { desktop, publicHeader, mobile };
}
