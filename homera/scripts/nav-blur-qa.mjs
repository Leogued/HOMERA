export default async function run(page) {
  page.setDefaultNavigationTimeout(120000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });

  const desktop = [];
  for (const name of ["acheter", "louer", "sejour", "services"]) {
    const trigger = page.locator(`button[aria-controls="menu-${name}"]`);
    await trigger.hover();
    const panel = page.locator(`#menu-${name} .homera-nav-panel`);
    await panel.waitFor({ state: "visible" });
    desktop.push(
      await panel.evaluate((element) => {
        const style = getComputedStyle(element);
        const header = element.closest("header");
        return {
          name: element.getAttribute("aria-label"),
          background: style.backgroundColor,
          backdropFilter: style.backdropFilter,
          webkitBackdropFilter: style.webkitBackdropFilter,
          opacity: style.opacity,
          headerZIndex: header ? getComputedStyle(header).zIndex : null,
        };
      }),
    );
    if (name === "services") {
      await page.screenshot({ path: "G:/LABO/HOMERA/homera/nav-blur-desktop.png" });
    }
  }

  await page.goto("http://localhost:3000/explorer", { waitUntil: "domcontentloaded" });
  await page.locator('button[aria-controls="menu-services"]').hover();
  const publicPanel = page.locator("#menu-services .homera-nav-panel");
  await publicPanel.waitFor({ state: "visible" });
  const publicHeader = await publicPanel.evaluate((element) => {
    const style = getComputedStyle(element);
    const header = element.closest("header");
    return {
      background: style.backgroundColor,
      backdropFilter: style.backdropFilter,
      webkitBackdropFilter: style.webkitBackdropFilter,
      headerBackdropFilter: header ? getComputedStyle(header).backdropFilter : null,
      headerZIndex: header ? getComputedStyle(header).zIndex : null,
    };
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  await page.locator("#homera-mobile-menu").waitFor({ state: "visible" });
  await page.locator("#homera-mobile-menu").getByRole("button", { name: "Services" }).click();
  const mobile = await page.locator("#homera-mobile-menu").evaluate((element) => {
    const background = element.querySelector(":scope > div.absolute");
    return {
      visible: getComputedStyle(element).visibility,
      surface: background ? getComputedStyle(background).backgroundColor : null,
      expanded: element.querySelector('button[aria-expanded="true"]')?.textContent?.trim() ?? null,
      childLinks: element.querySelectorAll('a[href^="/services/"]').length,
    };
  });
  await page.screenshot({ path: "G:/LABO/HOMERA/homera/nav-blur-mobile.png" });

  return { desktop, publicHeader, mobile };
}