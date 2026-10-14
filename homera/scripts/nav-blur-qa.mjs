/* ------------------------------------------------------------------
   QA des sous-menus de navigation (desktop + mobile).

   NOTE : le nom du fichier est conservé pour ne pas casser le harnais
   Playwright existant, mais les panneaux ne sont PLUS en verre dépoli :
   ils sont en couleur unie opaque (décision : fini le flou, place au
   solide conforme à la charte).

   Utilisation (depuis VS Code, Playwright installé sur la machine) :
     1. démarrer le site :  npm run dev      (http://localhost:3000)
     2. exécuter ce module avec un harnais Playwright qui fournit `page`
        et affiche la valeur retournée.
   Les captures sont écrites dans le dossier courant (chemins relatifs :
   aucun chemin absolu Windows ne doit figurer ici).

   Le script ÉCHOUE (throw) si un panneau n'est pas conforme :
     - fond calculé totalement opaque (alpha = 1)
     - teinte attendue : nuit #1c110b sur l'accueil, crème #faf6ef
       sur les pages (thème clair), nuit opaque sur mobile
     - aucun backdrop-filter résiduel (effet mort sous un fond opaque)
     - largeur >= 224 px (min-w-56), chaque panneau épousant son contenu
   Les captures PNG restent l'arbitre final : à l'œil, chaque panneau
   doit être uni, net, et dimensionné à son contenu.

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

// Panneau uni : opaque, teinte exacte, sans flou résiduel, pas étriqué.
function assertSolidPanel(measured, expectedRgb, minWidth, where) {
  const match = measured.background?.match(/rgba?\(([^)]+)\)/);
  const parts = match ? match[1].split(',').map((p) => p.trim()) : [];
  const alpha = parts.length === 4 ? Number(parts[3]) : 1;
  if (!match || alpha < 1) {
    throw new Error(`[nav-blur-qa] ${where} : fond translucide (${measured.background}), opaque requis.`);
  }
  if (expectedRgb && !measured.background.startsWith(expectedRgb)) {
    throw new Error(`[nav-blur-qa] ${where} : fond ${measured.background}, ${expectedRgb} attendu.`);
  }
  if (measured.backdropFilter && measured.backdropFilter !== 'none') {
    throw new Error(`[nav-blur-qa] ${where} : backdrop-filter résiduel (${measured.backdropFilter}), à retirer.`);
  }
  if (minWidth && measured.width < minWidth) {
    throw new Error(`[nav-blur-qa] ${where} : largeur ${measured.width}px < ${minWidth}px (min-w-56).`);
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
        width: Math.round(element.getBoundingClientRect().width),
        headerZIndex: header ? getComputedStyle(header).zIndex : null,
      };
    });
    assertSolidPanel(result, 'rgb(28, 17, 11)', 224, `accueil #${id}`);
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
      width: Math.round(element.getBoundingClientRect().width),
      headerBackdropFilter: header ? getComputedStyle(header).backdropFilter : null,
      headerZIndex: header ? getComputedStyle(header).zIndex : null,
    };
  });
  assertSolidPanel(publicHeader, 'rgb(250, 246, 239)', 224, 'explorer #public-menu-services');

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
  assertSolidPanel({ background: mobile.surface }, 'rgb(28, 17, 11)', 0, 'mobile #homera-mobile-menu');
  await page.screenshot({ path: 'nav-blur-mobile.png' });

  return { desktop, publicHeader, mobile };
}
