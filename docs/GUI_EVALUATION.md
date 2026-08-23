# Reusable GUI evaluation

The repository includes a standalone Playwright harness for repeatable functional and visual evaluation. It uses a local Playwright-managed Chromium by default and does not depend on the ChatGPT desktop browser.

## One-time setup

```sh
npm ci
npx playwright install chromium
```

Playwright-managed Chromium is the reproducible default. To use the locally installed Google Chrome instead, pass `--channel chrome` when running the evaluation.

## Run the QRL site evaluation

Start Hugo in one terminal:

```sh
hugo server --source website --bind 127.0.0.1 --port 1313
```

Run the evaluation in another terminal:

```sh
npm run gui:evaluate:local
```

If the site is already running elsewhere, override its URL:

```sh
npm run gui:evaluate -- --url http://127.0.0.1:1314/
```

Useful options:

```text
--headed                 Show Chromium during the run
--channel chrome         Use locally installed Google Chrome
--scenario home          Run one scenario; repeat for more
--viewport mobile        Run one viewport; repeat for more
--strict-console         Treat console warnings as failures
--output <directory>     Choose the evidence root
--config <file>          Use another project's scenario config
```

Each run writes an immutable evidence directory under `artifacts/gui-evaluation/` containing:

- viewport and state screenshots;
- full-page screenshots as secondary evidence;
- functional and visual checks;
- viewport and critical-region measurements;
- console errors and warnings, uncaught page errors, failed requests, and HTTP errors;
- `report.json` for automation and `report.md` for review.

Generated evidence is intentionally ignored by Git. Copy selected screenshots into a tracked documentation directory only when they belong in a review or release artifact.

## Adapt the harness to another project

The engine lives in `scripts/gui-evaluate.mjs`; project knowledge lives in `gui-evaluation.config.mjs`. For another project, copy the config and change:

1. `baseURL` and the desktop/mobile viewport inventory.
2. The route scenarios and their `readySelector` values.
3. Critical regions that must be present, visible, and horizontally contained.
4. `functional` checks, which exercise controls through normal Playwright input.
5. `visual` states and their `capture()` calls.

The two passes are intentionally separate. A functional result does not prove visual quality, and a screenshot does not prove interaction correctness.

Every scoping project should begin with a small QA inventory that maps requirements and user-visible claims to:

- a functional check;
- the specific visual state and viewport where the claim matters;
- the evidence file expected from the run;
- at least two exploratory or off-happy-path scenarios.

The included QRL configuration demonstrates search success, a zero-result search, filter recovery, theme cycling, desktop navigation, mobile navigation, minimum mobile width, critical-region fit, and screenshot capture.
