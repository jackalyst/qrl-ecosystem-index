const visibleProjectCards = async (page) =>
  page.locator("[data-project-list] .project-card:visible").count();

const resultCount = async (page) =>
  Number.parseInt((await page.locator("[data-result-count]").innerText()).trim(), 10);

const intersectsViewport = async (locator) =>
  locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      rect.right > 0 &&
      rect.bottom > 0 &&
      rect.left < window.innerWidth &&
      rect.top < window.innerHeight
    );
  });

export default {
  name: "qrl-ecosystem-index",
  baseURL: "http://127.0.0.1:1313/",
  outputDir: "artifacts/gui-evaluation",
  viewports: [
    {
      id: "desktop",
      label: "Desktop 1440 × 1000",
      width: 1440,
      height: 1000,
    },
    {
      id: "mobile",
      label: "Mobile 390 × 844",
      width: 390,
      height: 844,
      isMobile: true,
      hasTouch: true,
    },
  ],
  policy: {
    failOnConsoleErrors: true,
    failOnPageErrors: true,
    failOnSameOriginRequestFailures: true,
    failOnSameOriginHttpErrors: true,
  },
  scenarios: [
    {
      id: "home",
      label: "Homepage directory",
      path: "/",
      readySelector: "[data-project-directory]",
      criticalRegions: [
        {
          name: "site header",
          selector: ".site-header",
          initialViewport: true,
        },
        {
          name: "hero heading",
          selector: ".hero-content",
          initialViewport: true,
        },
        {
          name: "project filters",
          selector: "[data-project-filter]",
        },
        {
          name: "project grid",
          selector: "[data-project-list]",
        },
      ],
      async functional({ page, viewport, check }) {
        await check("Homepage heading is visible", async () => {
          const heading = page.getByRole("heading", {
            level: 1,
            name: "A clearer view of what’s being built on QRL.",
          });
          return (await heading.count()) === 1 && (await heading.isVisible());
        });

        const originalCount = await resultCount(page);
        await check(
          "Directory begins with project cards",
          async () => originalCount > 0 && (await visibleProjectCards(page)) === originalCount,
          { originalCount },
        );

        const search = page.locator("[data-project-search]");
        await search.fill("Zondscan");
        await check(
          "Search narrows the directory to Zondscan",
          async () => {
            const reportedCount = await resultCount(page);
            const visibleCount = await visibleProjectCards(page);
            const visibleText = await page
              .locator("[data-project-list] .project-card:visible")
              .innerText();
            return {
              pass:
                reportedCount === 1 &&
                visibleCount === 1 &&
                visibleText.toLowerCase().includes("zondscan"),
              details: { reportedCount, visibleCount, visibleText },
            };
          },
        );

        await search.fill("no-such-qrl-project-987654321");
        await check("A zero-result search shows the empty state", async () => {
          const noResults = page.locator("[data-no-results]");
          return (
            (await resultCount(page)) === 0 &&
            (await visibleProjectCards(page)) === 0 &&
            (await noResults.isVisible())
          );
        });

        await page.locator("[data-clear-filters]").click();
        await check(
          "Clearing filters restores the directory",
          async () =>
            (await resultCount(page)) === originalCount &&
            (await visibleProjectCards(page)) === originalCount,
        );

        const themeToggle = page.locator("[data-theme-toggle]");
        await themeToggle.click();
        await check(
          "Theme control switches to dark mode",
          async () =>
            (await page.locator("html").getAttribute("data-theme")) === "dark" &&
            (await themeToggle.getAttribute("aria-checked")) === "true",
        );
        await themeToggle.click();
        await check(
          "Theme control returns to light mode",
          async () =>
            (await page.locator("html").getAttribute("data-theme")) === "light" &&
            (await themeToggle.getAttribute("aria-checked")) === "false",
        );

        if (viewport.isMobile) {
          const menuToggle = page.locator("[data-nav-toggle]");
          await menuToggle.click();
          await check(
            "Mobile navigation opens",
            async () =>
              (await menuToggle.getAttribute("aria-expanded")) === "true" &&
              (await page.locator(".site-nav").getAttribute("class")).includes("nav-open"),
          );
          await page.keyboard.press("Escape");
          await check(
            "Escape closes mobile navigation",
            async () => (await menuToggle.getAttribute("aria-expanded")) === "false",
          );
        } else {
          const browse = page.locator(".nav-dropdown");
          await browse.hover();
          await check(
            "Desktop Browse menu opens on hover",
            async () => (await browse.locator("details").getAttribute("open")) !== null,
          );
          await page.getByRole("heading", { level: 1 }).hover();
          await check(
            "Desktop Browse menu closes after pointer leaves",
            async () => (await browse.locator("details").getAttribute("open")) === null,
          );
        }
      },
      async visual({ page, viewport, check, capture }) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await capture("initial");

        const search = page.locator("[data-project-search]");
        await search.fill("Zondscan");
        await page
          .locator("[data-project-list] .project-card:visible")
          .scrollIntoViewIfNeeded();
        await capture("filtered-directory");

        await search.fill("no-such-qrl-project-987654321");
        const noResults = page.locator("[data-no-results]");
        await noResults.scrollIntoViewIfNeeded();
        await check(
          "Empty-state message remains visible in the evaluated viewport",
          async () =>
            (await noResults.isVisible()) && (await intersectsViewport(noResults)),
        );
        await capture("empty-directory");
        await page.locator("[data-clear-filters]").click();

        const themeToggle = page.locator("[data-theme-toggle]");
        await themeToggle.click();
        await page.evaluate(() => window.scrollTo(0, 0));
        await capture("dark-theme-initial");
        await themeToggle.click();

        if (viewport.isMobile) {
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.locator("[data-nav-toggle]").click();
          await capture("navigation-open");
          await page.keyboard.press("Escape");
        }

        await page.evaluate(() => window.scrollTo(0, 0));
        await capture("full-page", { fullPage: true, secondary: true });
      },
    },
  ],
};
