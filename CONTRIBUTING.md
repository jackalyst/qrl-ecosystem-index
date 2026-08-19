# Contributing to the QRL Ecosystem Index

Thank you for helping maintain a useful, factual directory of the QRL ecosystem. A listing is informational: inclusion is not an endorsement, ownership verification, or security assessment.

Project records use schema v6. Start from `projects/template.yaml`; legacy fields such as `category`, `tags`, `status`, `qrl_versions`, `github`, `open_source`, and `audited` are rejected.

## Before submitting

- Use a stable lowercase, hyphenated `id`. The filename must be `<id>.yaml`, and existing IDs and `/projects/<id>/` URLs must not change during a rename.
- Put `availability: archived` records in `projects/archived/`. Put every other availability in `projects/active/`.
- Describe only features and relationships that can be checked from public project material.
- Avoid branding that could imply QRL Foundation ownership or endorsement. If a name uses “QRL,” make the publisher and any non-official status clear.
- Read the [moderation and takedown policy](docs/MODERATION.md).

## Faceted classification

Classification facets are independent. Choose one artifact type, one primary use-case category, up to two secondary categories, one to four capabilities, and any applicable platforms. The canonical labels and values live in `website/data/classification.yaml`.

### Project types

| Value | Meaning |
|---|---|
| `protocol` | On-chain or protocol-level logic used by people or other software |
| `application` | User-facing software and interfaces |
| `infrastructure` | Networked software or operated services |
| `tooling` | Software used to build, test, deploy, integrate, inspect, or verify |
| `resource` | Community information, research, coordination, or programs; shown as “Community & Resources” |

Protocols must include at least one `deployments` record.

### Use-case categories

`primary_category` is required. `secondary_categories` contains zero to two unique values and cannot repeat the primary category.

| Value | UI label |
|---|---|
| `finance` | Finance |
| `payments-commerce` | Payments & commerce |
| `assets-tokenization` | Assets & tokenization |
| `identity-naming-privacy` | Identity, naming & privacy |
| `governance-coordination` | Governance & coordination |
| `interoperability-messaging-data` | Interoperability, messaging & data |
| `gaming-virtual-worlds` | Gaming & virtual worlds |
| `social-creator-content` | Social, creator & content |
| `security-custody-account-management` | Security, custody & account management |
| `network-operations` | Network operations |
| `developer-experience` | Developer experience |
| `education-research-ecosystem` | Education, research & ecosystem |
| `utility-storage-compute` | Utility, storage & compute |

### Capabilities and keywords

`capabilities` contains one to four controlled, factual functions that represent major reasons a visitor would seek out the project. Do not list every feature. Capabilities create browsable taxonomy pages, and every controlled value must be represented by a current listing.

| Audience | Controlled capabilities |
|---|---|
| Users and ecosystem | `analytics`, `atomic-swap`, `dex`, `education`, `explorer`, `faucet`, `hardware-wallet`, `liquid-staking`, `marketplace`, `news`, `notarization`, `oracle`, `payments`, `prediction-market`, `staking`, `wallet` |
| Builders and operators | `cli`, `compiler`, `contract-template`, `deployment`, `key-management`, `library`, `mining-pool`, `node-client`, `rpc`, `sdk`, `token-creator`, `validator`, `wallet-connector` |

`platforms` is required, but may be empty when it does not apply. Its controlled values are `web`, `browser-extension`, `desktop`, and `mobile`. Platforms are searchable and filterable but do not create taxonomy pages.

`keywords` are lowercase, hyphenated search terms. They improve text search but never create taxonomy pages. Do not duplicate controlled facets merely to influence navigation.

## Lifecycle and QRL support

Lifecycle is split into separate facts:

- `maturity`: `prototype`, `beta`, `stable`, or `deprecated`.
- `availability`: `live`, `limited`, `paused`, `offline`, or `archived`.
- Optional `maintenance`: `active`, `low-activity`, or `inactive`.

QRL metadata is also split:

- `qrl_relationship`: `native`, `deployed`, `integrated`, or `ecosystem-resource`.
- `qrl_support`: generations and environments the software or resource supports.
- `deployments`: concrete deployments with a stable ID, controlled network, operational state, identifiers, evidence links, and source-verification state.

Controlled deployment networks are `qrl-1-mainnet`, `qrl-1-testnet`, `qrl-1-local-private`, `qrl-2-testnet-v2`, `qrl-2-devnet`, and `qrl-2-local-private`. QRL 2.0 mainnet is not available as a value.

Cross-field rules include:

- Deployment generation and environment must appear in `qrl_support`.
- Contract, proxy, implementation, and factory identifiers are QRL 2.0-only.
- `mining-pool` projects support QRL 1.x only.
- `validator`, `staking`, and `liquid-staking` capabilities require QRL 2.0 support.
- Use an empty `identifiers` list when no factual identifier is known. Do not add placeholders.

## Publisher, maintainers, source, and links

- `publisher` identifies the person or organization that presents the project.
- `maintainers` contains at least one name and a public HTTPS contact URL.
- `source_availability` is `full`, `partial`, `unavailable`, or `not-applicable`.
- `repositories` contains stable IDs, roles, URLs, and valid SPDX license expressions. Use `NOASSERTION` only when a listed repository's license is genuinely unknown. Repository-specific licenses take precedence.
- `links` holds websites, documentation, applications, app stores, packages, support, community, social, status, governance, and security destinations. At most one link may have `primary: true`.

Dates maintained by this directory are `listed_at` and `data_updated_at`. Optional factual dates are `project_launched_at`, `last_release_at`, and `last_verified_at`.

Use `relationships` to connect existing project IDs through `fork-of`, `successor-to`, `frontend-for`, `uses-protocol`, or `part-of`. Use `previous_names` for renames. Tokens and collections may be attached through `assets`; they are not standalone project types.

## Security reviews and evidence

Security reviews are factual report records, not a boolean or badge. Each `security_reviews` item names the auditor, links the report, describes its scope, and records remediation status. Add report dates, repository revisions, and affected deployment IDs when known. Never describe a project as “safe” or “audited” merely because a report exists.

The optional `evidence` structure is available for relationship, deployment, integration, and ownership references. During the initial schema v6 release it is not required and does not produce public trust labels. See [Moderation and trust](docs/MODERATION.md) for the staged policy.

## Logos and gallery media

All media must be local and project-scoped.

### Logos

1. Put files in `images/logos/<project-id>/`.
2. Reference them through `logos[]` as `<project-id>/<filename>`.
3. Use lowercase `.png` or `.webp` only. SVG is not accepted.

Logos must be genuine raster files, no larger than 1 MB or 10 megapixels, and contain no EXIF, XMP, or text metadata. The `logo` shorthand is not supported.

```yaml
logos:
  - path: your-project/icon.webp
    description: Your Project icon
```

### Gallery

Gallery images belong in `images/screenshots/<project-id>/` and use paths such as `<project-id>/dashboard.webp`. Accepted image formats are PNG, JPEG, and WebP. Images are limited to 2 MB and 10 megapixels and must not contain EXIF, XMP, or text metadata.

YouTube entries use only the 11-character video ID. Videos load through the controlled, click-to-load privacy-enhanced integration.

```yaml
gallery:
  - type: image
    path: your-project/dashboard.webp
    caption: Dashboard showing current network activity
  - type: youtube
    id: M7lc1UVf-VE
    caption: Project demonstration
```

Captions are required, plain text, and at most 160 characters. A gallery may contain 1–10 items.

### Homepage spotlight

The homepage spotlight is selected automatically from listings with `maturity: stable`, `availability: live`, and at least one gallery image. Eligible projects are ordered by their stable project ID and rotated weekly; there is no manual featured-project flag. Adding a valid screenshot makes an otherwise eligible project part of the same rotation and does not guarantee immediate placement.

## Submission workflow

1. Fork the repository.
2. Copy `projects/template.yaml` to the correct directory and rename it to match the project ID.
3. Fill in every required field and remove unused examples.
4. Add referenced media under the matching project-scoped directories.
5. Run the checks below.
6. Run `go run scripts/generate.go` and include the generated pages, media copies, social card, and `website/static/index.json` in the same change.
7. Open a pull request using the checklist.

```sh
python3 -m pip install -r requirements-validation.txt
python3 scripts/validate_projects.py
python3 -m unittest discover -s scripts -p 'validate_*_test.py'
go test ./...
go run scripts/generate.go
hugo --source website --gc --minify --cleanDestinationDir --forceSyncStatic
```

Reviewers check schema compliance, factual classification, relationship targets, source/license metadata, deployment references, media safety, and potential impersonation. See [Reviewer guidance](docs/REVIEWING.md).

Questions can be raised through a repository issue or the QRL community channels.
