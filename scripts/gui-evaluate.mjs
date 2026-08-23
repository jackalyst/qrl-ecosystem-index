#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const HELP = `Usage: npm run gui:evaluate -- [options]

Options:
  --config <path>      Scenario config (default: gui-evaluation.config.mjs)
  --url <url>          Override the config base URL
  --output <path>      Override the evidence output directory
  --scenario <id>      Run one scenario (repeatable)
  --viewport <id>      Run one viewport (repeatable)
  --channel <name>     Browser channel, for example chrome
  --headed             Show the browser while the evaluation runs
  --strict-console     Treat console warnings as failures too
  --help               Show this help
`;

const parseArgs = (argv) => {
  const args = {
    config: "gui-evaluation.config.mjs",
    scenarios: [],
    viewports: [],
    headed: false,
    strictConsole: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = () => {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`Missing value for ${token}`);
      }
      index += 1;
      return value;
    };

    switch (token) {
      case "--config":
        args.config = next();
        break;
      case "--url":
        args.url = next();
        break;
      case "--output":
        args.output = next();
        break;
      case "--scenario":
        args.scenarios.push(next());
        break;
      case "--viewport":
        args.viewports.push(next());
        break;
      case "--channel":
        args.channel = next();
        break;
      case "--headed":
        args.headed = true;
        break;
      case "--strict-console":
        args.strictConsole = true;
        break;
      case "--help":
        args.help = true;
        break;
      default:
        throw new Error(`Unknown option: ${token}`);
    }
  }

  return args;
};

const slug = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const timestamp = () => new Date().toISOString().replace(/[:.]/g, "-");

const relativePath = (from, to) => path.relative(from, to).split(path.sep).join("/");

const formatDetails = (details) => {
  if (details === undefined || details === null || details === "") return "";
  if (typeof details === "string") return details;
  return JSON.stringify(details);
};

const checkFactory = (checks, phase) => async (name, assertion, details) => {
  try {
    const outcome = typeof assertion === "function" ? await assertion() : assertion;
    const pass =
      typeof outcome === "object" && outcome !== null && "pass" in outcome
        ? Boolean(outcome.pass)
        : Boolean(outcome);
    const resolvedDetails =
      typeof outcome === "object" && outcome !== null && "details" in outcome
        ? outcome.details
        : details;
    checks.push({ name, phase, pass, details: resolvedDetails });
    return pass;
  } catch (error) {
    checks.push({
      name,
      phase,
      pass: false,
      details: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
};

const attachDiagnostics = (page) => {
  const diagnostics = [];

  page.on("console", (message) => {
    if (["warning", "error"].includes(message.type())) {
      diagnostics.push({
        type: `console-${message.type()}`,
        text: message.text(),
        location: message.location(),
      });
    }
  });
  page.on("pageerror", (error) => {
    diagnostics.push({ type: "page-error", text: error.message });
  });
  page.on("requestfailed", (request) => {
    diagnostics.push({
      type: "request-failed",
      method: request.method(),
      url: request.url(),
      text: request.failure()?.errorText ?? "Request failed",
    });
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      diagnostics.push({
        type: "http-error",
        status: response.status(),
        url: response.url(),
      });
    }
  });

  return diagnostics;
};

const createContext = async (browser, viewport) => {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.deviceScaleFactor ?? 1,
    isMobile: viewport.isMobile ?? false,
    hasTouch: viewport.hasTouch ?? false,
    locale: "en-CA",
    colorScheme: "light",
    reducedMotion: "reduce",
  });
  await context.addInitScript(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
  });
  return context;
};

const navigate = async ({ page, url, readySelector, check }) => {
  const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await check("Navigation returns a successful document", () => {
    const status = response?.status() ?? 0;
    return { pass: status >= 200 && status < 400, details: { status, url } };
  });
  if (readySelector) {
    await page.locator(readySelector).waitFor({ state: "visible", timeout: 10_000 });
  }
  await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
};

const collectMetrics = async (page, criticalRegions = []) =>
  page.evaluate((regions) => {
    const root = document.documentElement;
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const measuredRegions = regions.map((region) => {
      const element = document.querySelector(region.selector);
      if (!element) {
        return { ...region, present: false, visible: false, box: null };
      }
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      const visible =
        rect.width > 0 &&
        rect.height > 0 &&
        style.display !== "none" &&
        style.visibility !== "hidden";
      return {
        ...region,
        present: true,
        visible,
        box: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          right: Math.round(rect.right),
          bottom: Math.round(rect.bottom),
        },
        fitsHorizontally: rect.left >= -1 && rect.right <= viewport.width + 1,
        fitsInitialViewport:
          !region.initialViewport ||
          (rect.top >= -1 && rect.bottom <= viewport.height + 1),
      };
    });

    return {
      title: document.title,
      h1: document.querySelector("h1")?.textContent?.trim() ?? "",
      viewport,
      document: {
        clientWidth: root.clientWidth,
        clientHeight: root.clientHeight,
        scrollWidth: root.scrollWidth,
        scrollHeight: root.scrollHeight,
        canScrollX: root.scrollWidth > root.clientWidth + 1,
        canScrollY: root.scrollHeight > root.clientHeight + 1,
      },
      criticalRegions: measuredRegions,
    };
  }, criticalRegions);

const addBaselineChecks = async ({ page, criticalRegions, check }) => {
  const metrics = await collectMetrics(page, criticalRegions);
  await check("Document title is present", metrics.title.length > 0, { title: metrics.title });
  await check("Page has a primary heading", metrics.h1.length > 0, { h1: metrics.h1 });
  await check("Page has no horizontal document overflow", !metrics.document.canScrollX, metrics.document);

  for (const region of metrics.criticalRegions) {
    await check(`${region.name} is present and visible`, region.present && region.visible, region.box);
    await check(`${region.name} fits horizontally`, region.fitsHorizontally === true, region.box);
    if (region.initialViewport) {
      await check(`${region.name} fits the initial viewport`, region.fitsInitialViewport === true, region.box);
    }
  }

  return metrics;
};

const addDiagnosticChecks = async ({ diagnostics, baseOrigin, policy, strictConsole, check }) => {
  const sameOrigin = (entry) => {
    if (!entry.url) return false;
    try {
      return new URL(entry.url).origin === baseOrigin;
    } catch {
      return false;
    }
  };
  const pageErrors = diagnostics.filter((entry) => entry.type === "page-error");
  const consoleErrors = diagnostics.filter((entry) => entry.type === "console-error");
  const consoleWarnings = diagnostics.filter((entry) => entry.type === "console-warning");
  const sameOriginRequestFailures = diagnostics.filter(
    (entry) => entry.type === "request-failed" && sameOrigin(entry),
  );
  const sameOriginHttpErrors = diagnostics.filter(
    (entry) => entry.type === "http-error" && sameOrigin(entry),
  );

  if (policy.failOnPageErrors ?? true) {
    await check("No uncaught page errors", pageErrors.length === 0, pageErrors);
  }
  if (policy.failOnConsoleErrors ?? true) {
    await check("No console errors", consoleErrors.length === 0, consoleErrors);
  }
  if (strictConsole) {
    await check("No console warnings", consoleWarnings.length === 0, consoleWarnings);
  }
  if (policy.failOnSameOriginRequestFailures ?? true) {
    await check(
      "No same-origin request failures",
      sameOriginRequestFailures.length === 0,
      sameOriginRequestFailures,
    );
  }
  if (policy.failOnSameOriginHttpErrors ?? true) {
    await check(
      "No same-origin HTTP errors",
      sameOriginHttpErrors.length === 0,
      sameOriginHttpErrors,
    );
  }
};

const runPass = async ({
  browser,
  baseURL,
  runDir,
  scenario,
  viewport,
  phase,
  policy,
  strictConsole,
}) => {
  const context = await createContext(browser, viewport);
  const page = await context.newPage();
  const diagnostics = attachDiagnostics(page);
  const checks = [];
  const check = checkFactory(checks, phase);
  const url = new URL(scenario.path, baseURL).href;
  const screenshots = [];
  let metrics;

  const capture = async (label, options = {}) => {
    const filename = `${slug(scenario.id)}--${slug(viewport.id)}--${slug(label)}.png`;
    const filepath = path.join(runDir, filename);
    await page.screenshot({
      path: filepath,
      type: "png",
      fullPage: options.fullPage ?? false,
      animations: "disabled",
      caret: "hide",
      scale: "css",
    });
    screenshots.push({
      label,
      path: relativePath(runDir, filepath),
      fullPage: options.fullPage ?? false,
      secondary: options.secondary ?? false,
    });
    return filepath;
  };

  try {
    await navigate({ page, url, readySelector: scenario.readySelector, check });
    metrics = await addBaselineChecks({
      page,
      criticalRegions: scenario.criticalRegions ?? [],
      check,
    });
    const runner = phase === "functional" ? scenario.functional : scenario.visual;
    if (runner) {
      await runner({ page, viewport, check, capture });
    }
    await addDiagnosticChecks({
      diagnostics,
      baseOrigin: new URL(baseURL).origin,
      policy,
      strictConsole,
      check,
    });
  } catch (error) {
    checks.push({
      name: `${phase} pass completes`,
      phase,
      pass: false,
      details: error instanceof Error ? error.stack ?? error.message : String(error),
    });
    if (phase === "visual") {
      await capture("failure").catch(() => {});
    }
  } finally {
    await context.close();
  }

  return {
    phase,
    url,
    status: checks.every((entry) => entry.pass) ? "pass" : "fail",
    checks,
    diagnostics,
    screenshots,
    metrics,
  };
};

const renderMarkdown = (report) => {
  const lines = [
    `# GUI evaluation: ${report.project}`,
    "",
    `- Run: ${report.runId}`,
    `- Base URL: ${report.baseURL}`,
    `- Browser: ${report.browser}`,
    `- Result: **${report.status.toUpperCase()}**`,
    "",
  ];

  for (const result of report.results) {
    lines.push(`## ${result.scenarioLabel} — ${result.viewportLabel}`, "");
    for (const pass of result.passes) {
      lines.push(`### ${pass.phase}`, "", "| Check | Result | Details |", "| --- | --- | --- |");
      for (const check of pass.checks) {
        lines.push(
          `| ${check.name.replaceAll("|", "\\|")} | ${check.pass ? "PASS" : "FAIL"} | ${formatDetails(check.details).replaceAll("|", "\\|")} |`,
        );
      }
      lines.push("");

      if (pass.screenshots.length > 0) {
        lines.push("Screenshots:", "");
        for (const screenshot of pass.screenshots) {
          lines.push(`- ${screenshot.label}: \`${screenshot.path}\``);
        }
        lines.push("");
      }

      if (pass.diagnostics.length > 0) {
        lines.push("Diagnostics:", "", "```json", JSON.stringify(pass.diagnostics, null, 2), "```", "");
      }
    }
  }

  return `${lines.join("\n")}\n`;
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(HELP);
    return;
  }

  const root = process.cwd();
  const configPath = path.resolve(root, args.config);
  const config = (await import(`${pathToFileURL(configPath).href}?run=${Date.now()}`)).default;
  const baseURL = new URL(args.url ?? config.baseURL).href;
  const outputRoot = path.resolve(root, args.output ?? config.outputDir ?? "artifacts/gui-evaluation");
  const runId = `${timestamp()}--${slug(config.name ?? "project")}`;
  const runDir = path.join(outputRoot, runId);
  await mkdir(runDir, { recursive: true });

  const scenarios = (config.scenarios ?? []).filter(
    (scenario) => args.scenarios.length === 0 || args.scenarios.includes(scenario.id),
  );
  const viewports = (config.viewports ?? []).filter(
    (viewport) => args.viewports.length === 0 || args.viewports.includes(viewport.id),
  );

  if (scenarios.length === 0) throw new Error("No scenarios selected");
  if (viewports.length === 0) throw new Error("No viewports selected");

  const launchOptions = { headless: !args.headed };
  if (args.channel) launchOptions.channel = args.channel;
  const browser = await chromium.launch(launchOptions);
  const browserVersion = browser.version();
  const results = [];

  try {
    for (const scenario of scenarios) {
      for (const viewport of viewports) {
        process.stdout.write(`Evaluating ${scenario.id} at ${viewport.id}...\n`);
        const passes = [];
        for (const phase of ["functional", "visual"]) {
          passes.push(
            await runPass({
              browser,
              baseURL,
              runDir,
              scenario,
              viewport,
              phase,
              policy: config.policy ?? {},
              strictConsole: args.strictConsole,
            }),
          );
        }
        results.push({
          scenario: scenario.id,
          scenarioLabel: scenario.label ?? scenario.id,
          viewport: viewport.id,
          viewportLabel: viewport.label ?? viewport.id,
          status: passes.every((pass) => pass.status === "pass") ? "pass" : "fail",
          passes,
        });
      }
    }
  } finally {
    await browser.close();
  }

  const report = {
    schemaVersion: 1,
    project: config.name ?? "project",
    runId,
    generatedAt: new Date().toISOString(),
    baseURL,
    browser: `${args.channel ?? "playwright-chromium"} ${browserVersion}`,
    status: results.every((result) => result.status === "pass") ? "pass" : "fail",
    results,
  };
  const jsonPath = path.join(runDir, "report.json");
  const markdownPath = path.join(runDir, "report.md");
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(markdownPath, renderMarkdown(report));
  await writeFile(
    path.join(outputRoot, "latest.json"),
    `${JSON.stringify({ runId, runDir: relativePath(root, runDir), status: report.status }, null, 2)}\n`,
  );

  process.stdout.write(`GUI evaluation ${report.status}: ${relativePath(root, markdownPath)}\n`);
  if (report.status !== "pass") process.exitCode = 1;
};

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
