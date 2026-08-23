# QRL Ecosystem Index

A community-maintained, version-controlled directory of projects supporting QRL 1.x, QRL 2.0, or both. Listings are informational and are not endorsements, ownership verification, or security assessments.

## Schema v6

The index uses independent facets instead of a coupled type/category hierarchy:

- Artifact type: `protocol`, `application`, `infrastructure`, `tooling`, or `resource`.
- Use case: one primary category and up to two secondary categories.
- Function: one to four controlled capabilities that represent primary visitor goals.
- Platform: zero or more controlled places where the project can be used.
- QRL connection: relationship, supported generations/environments, and concrete deployments.
- Lifecycle: maturity, availability, and optional maintenance activity.
- Provenance: structured publishers, maintainers, repositories, links, licenses, security reviews, and project relationships.

The controlled values and labels are defined in `website/data/classification.yaml`; `schema/project.schema.json` is the normative record contract. Legacy v5 fields are rejected.

## Lifecycle model

`maturity` describes product maturity: `prototype`, `beta`, `stable`, or `deprecated`.

`availability` describes current access: `live`, `limited`, `paused`, `offline`, or `archived`. Only `archived` records belong in `projects/archived/`; every other availability belongs in `projects/active/`.

The visible status combines these facts. A non-live availability takes precedence; otherwise the site shows maturity and the available environment summary, such as `Beta · Testnet`.

## Machine-readable access

The published site at [www.qrlecosystem.com](https://www.qrlecosystem.com/) provides:

- [`/index.json`](https://www.qrlecosystem.com/index.json) — schema v6 project summaries. This is a deliberate breaking contract with `schema_version: 6`; no legacy endpoint is maintained.
- [`/llms.txt`](https://www.qrlecosystem.com/llms.txt) — curated site context and links following the [llms.txt proposal](https://llmstxt.org/).
- `/index.html.md` and `/<path>/index.html.md` — Markdown alternatives for public pages.
- [`/sitemap.xml`](https://www.qrlecosystem.com/sitemap.xml) — canonical HTML page inventory.
- [`/robots.txt`](https://www.qrlecosystem.com/robots.txt) — crawl policy and sitemap location.

Project URLs remain `/projects/<id>/`. Retired taxonomy paths have permanent HTML redirects; redirects are not API compatibility.

Generated project content and media are deterministic. The documented exception is `/index.json`'s `generated_at` field, which records the UTC generation time.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the schema, classification, media, and submission requirements. Start from `projects/template.yaml`.

The trust, reporting, compromise, delisting, and takedown rules are in [docs/MODERATION.md](docs/MODERATION.md). Reviewer procedures are in [docs/REVIEWING.md](docs/REVIEWING.md).

## Local development

Install dependencies, validate the data, generate derived files, and start Hugo:

```sh
go mod download
python3 -m pip install -r requirements-validation.txt
python3 scripts/validate_projects.py
go test ./...
go run scripts/generate.go
hugo server --source website --bind 127.0.0.1 --port 1313
```

Run the generator whenever project YAML or media changes. Generated project pages, copied media, social cards, and `website/static/index.json` belong in the same change as their source data.

For production-style verification:

```sh
hugo --source website --gc --minify --cleanDestinationDir --forceSyncStatic
python3 scripts/validate_agent_outputs.py
```

For functional and visual GUI evaluation with local Chromium:

```sh
npm ci
npx playwright install chromium
hugo server --source website --bind 127.0.0.1 --port 1313
npm run gui:evaluate:local
```

See [`docs/GUI_EVALUATION.md`](docs/GUI_EVALUATION.md) for viewport selection, Chrome support, generated evidence, and adapting the harness to larger projects.

Do not commit `public/` or `website/public/` build output.

## Repository structure

```text
qrl-ecosystem-index/
├── projects/
│   ├── active/
│   ├── archived/
│   └── template.yaml
├── schema/project.schema.json
├── images/
│   ├── logos/
│   └── screenshots/
├── scripts/
├── website/
│   ├── content/
│   ├── layouts/
│   ├── assets/
│   └── static/index.json
├── CONTRIBUTING.md
└── requirements-validation.txt
```
