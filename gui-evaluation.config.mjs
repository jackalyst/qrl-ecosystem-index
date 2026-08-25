const visibleProjectCards = async (page) =>
  page.locator("[data-project-list] .project-card:visible").count();

const resultCount = async (page) =>
  Number.parseInt((await page.locator("[data-result-count]").innerText()).trim(), 10);

const gridColumnCount = async (page) =>
  page.locator("[data-project-list]").evaluate((element) =>
    getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean).length,
  );

const dismissAnalyticsConsent = async (page) => {
  const decline = page.locator("[data-analytics-decline]");
  if ((await decline.count()) > 0 && (await decline.isVisible())) {
    await decline.click();
  }
};

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
        await dismissAnalyticsConsent(page);
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
        await check(
          `Directory uses ${viewport.isMobile ? "one" : "two"} result column${viewport.isMobile ? "" : "s"}`,
          async () => (await gridColumnCount(page)) === (viewport.isMobile ? 1 : 2),
        );
        await check("Directory includes every media fallback", async () => {
          const counts = Object.fromEntries(
            await Promise.all(
              ["image", "logo", "initials"].map(async (kind) => [
                kind,
                await page.locator(`[data-project-media="${kind}"]`).count(),
              ]),
            ),
          );
          return { pass: Object.values(counts).every((count) => count > 0), details: counts };
        });

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

        await page.locator("[data-active-filters] [data-clear-filters]").click();
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
          const filterTrigger = page.locator("[data-filter-dialog-open]");
          const filterDialog = page.locator("[data-filter-dialog]");
          await filterTrigger.click();
          await check(
            "Mobile filter sheet opens as a modal",
            async () =>
              (await filterTrigger.getAttribute("aria-expanded")) === "true" &&
              (await filterDialog.evaluate((element) => element.matches(":modal"))),
          );

          await filterDialog.locator("[data-project-qrl-generation]").selectOption("2.0");
          const filteredCount = await resultCount(page);
          await check("Mobile filters update results and CTA live", async () => {
            const cta = filterDialog.locator(".filter-dialog-apply");
            const activeCount = await page.locator("[data-active-filter-count]").innerText();
            const ctaText = (await cta.innerText()).replace(/\s+/g, " ").trim();
            return {
              pass:
                filteredCount > 0 &&
                filteredCount < originalCount &&
                ctaText === `Show ${filteredCount} ${filteredCount === 1 ? "project" : "projects"}` &&
                activeCount.trim() === "1",
              details: { originalCount, filteredCount, ctaText, activeCount: activeCount.trim() },
            };
          });

          await filterDialog.locator(".filter-dialog-apply").click();
          await check(
            "Closing the filter sheet restores trigger focus",
            async () =>
              !(await filterDialog.evaluate((element) => element.open)) &&
              (await filterTrigger.evaluate((element) => document.activeElement === element)),
          );
          await page.locator("[data-active-filters] [data-clear-filters]").click();

          await filterTrigger.click();
          await page.keyboard.press("Escape");
          await check(
            "Escape closes the filter sheet",
            async () => !(await filterDialog.evaluate((element) => element.open)),
          );

          await filterTrigger.click();
          await page.mouse.click(5, 5);
          await check(
            "Backdrop click closes the filter sheet",
            async () => !(await filterDialog.evaluate((element) => element.open)),
          );

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
        await dismissAnalyticsConsent(page);
        await page.evaluate(() => window.scrollTo(0, 0));
        await capture("initial");

        const search = page.locator("[data-project-search]");
        for (const mediaState of [
          { query: "QRL Now", capture: "media-image-card" },
          { query: "QuantaPool", capture: "media-logo-card" },
          { query: "Qrysm", capture: "media-initials-card" },
        ]) {
          await search.fill(mediaState.query);
          await page
            .locator("[data-project-list] .project-card:visible")
            .scrollIntoViewIfNeeded();
          await capture(mediaState.capture);
        }

        await search.fill("no-such-qrl-project-987654321");
        const noResults = page.locator("[data-no-results]");
        await noResults.scrollIntoViewIfNeeded();
        await check(
          "Empty-state message remains visible in the evaluated viewport",
          async () =>
            (await noResults.isVisible()) && (await intersectsViewport(noResults)),
        );
        await capture("empty-directory");
        await page.locator("[data-active-filters] [data-clear-filters]").click();

        const themeToggle = page.locator("[data-theme-toggle]");
        await themeToggle.click();
        await page.evaluate(() => window.scrollTo(0, 0));
        await capture("dark-theme-initial");
        await themeToggle.click();

        if (viewport.isMobile) {
          const filterTrigger = page.locator("[data-filter-dialog-open]");
          await page.locator("[data-project-filter]").scrollIntoViewIfNeeded();
          await filterTrigger.click();
          await capture("filters-open");
          await page.keyboard.press("Escape");

          await page.evaluate(() => window.scrollTo(0, 0));
          await page.locator("[data-nav-toggle]").click();
          await capture("navigation-open");
          await page.keyboard.press("Escape");
        }

        await page.evaluate(() => window.scrollTo(0, 0));
        await capture("full-page", { fullPage: true, secondary: true });
      },
    },
    {
      id: "projects",
      label: "Full project directory",
      path: "/projects/",
      readySelector: "[data-project-directory]",
      criticalRegions: [
        {
          name: "project directory heading",
          selector: ".page-hero",
          initialViewport: true,
        },
        {
          name: "project directory controls",
          selector: "[data-project-filter]",
        },
        {
          name: "project directory grid",
          selector: "[data-project-list]",
        },
      ],
      async functional({ page, viewport, check }) {
        await dismissAnalyticsConsent(page);
        const originalCount = await resultCount(page);
        await check(
          "Full directory renders every project",
          async () => originalCount > 0 && (await visibleProjectCards(page)) === originalCount,
          { originalCount },
        );
        await check(
          `Full directory uses ${viewport.isMobile ? "one" : "two"} column${viewport.isMobile ? "" : "s"}`,
          async () => (await gridColumnCount(page)) === (viewport.isMobile ? 1 : 2),
        );

        const titles = await page.locator("[data-project-list] .project-card-title").allTextContents();
        const expectedFirst = [...titles].sort((first, second) =>
          first.localeCompare(second, undefined, { sensitivity: "base" }),
        )[0];
        await page.locator("[data-project-sort]").selectOption("name-asc");
        await check("Sorting A–Z reorders cards and persists in the URL", async () => {
          const firstTitle = await page
            .locator("[data-project-list] .project-card:visible .project-card-title")
            .first()
            .innerText();
          return firstTitle === expectedFirst && new URL(page.url()).searchParams.get("sort") === "name-asc";
        });
        await page.locator("[data-project-sort]").selectOption("latest");
      },
      async visual({ page, capture }) {
        await dismissAnalyticsConsent(page);
        await capture("initial");
        await capture("full-page", { fullPage: true, secondary: true });
      },
    },
    {
      id: "finance-category",
      label: "Finance taxonomy directory",
      path: "/categories/finance/",
      readySelector: "[data-project-directory]",
      criticalRegions: [
        {
          name: "taxonomy heading",
          selector: ".page-hero",
          initialViewport: true,
        },
        {
          name: "taxonomy project controls",
          selector: "[data-project-filter]",
        },
        {
          name: "taxonomy project grid",
          selector: "[data-project-list]",
        },
      ],
      async functional({ page, viewport, check }) {
        await dismissAnalyticsConsent(page);
        const originalCount = await resultCount(page);
        await check(
          "Taxonomy directory renders its matching projects",
          async () => originalCount > 0 && (await visibleProjectCards(page)) === originalCount,
          { originalCount },
        );
        await check(
          "Taxonomy directory renders only its supported filter subset",
          async () =>
            (await page.locator("[data-project-qrl-generation]").count()) === 1 &&
            (await page.locator("[data-project-type]").count()) === 0,
        );
        await check(
          `Taxonomy grid uses ${viewport.isMobile ? "one" : "two"} column${viewport.isMobile ? "" : "s"}`,
          async () => (await gridColumnCount(page)) === (viewport.isMobile ? 1 : 2),
        );

        const search = page.locator("[data-project-search]");
        await search.fill("QRL Now");
        await check(
          "Taxonomy search narrows its local result set",
          async () => (await resultCount(page)) === 1 && (await visibleProjectCards(page)) === 1,
        );
        await page.locator("[data-active-filters] [data-clear-filters]").click();
      },
      async visual({ page, viewport, capture }) {
        await dismissAnalyticsConsent(page);
        await capture("initial");
        if (viewport.isMobile) {
          await page.locator("[data-project-filter]").scrollIntoViewIfNeeded();
          await page.locator("[data-filter-dialog-open]").click();
          await capture("filters-open");
          await page.keyboard.press("Escape");
        }
        await capture("full-page", { fullPage: true, secondary: true });
      },
    },
  ],
};
