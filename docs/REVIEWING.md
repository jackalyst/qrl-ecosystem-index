# Schema v6 Reviewer Guidance

Review the record as a set of independent, factual facets. Passing the JSON schema is necessary but does not establish accuracy, ownership, safety, or endorsement.

## Review sequence

1. **Identity and scope**: confirm the filename matches the stable project ID, the canonical ID has not been changed for a rename, and the project has a material QRL connection.
2. **Classification**: verify that artifact type describes what the project is, categories describe use cases, capabilities describe one to four demonstrated visitor goals, and platforms describe where it can be used. Secondary categories must add meaningful scope rather than keywords.
3. **Lifecycle**: check maturity independently from availability. Treat network environment as deployment/support data, not maturity.
4. **QRL metadata**: compare relationship and support claims with public documentation or source material. Protocols require deployment records; deployment network/environment must agree with support.
5. **Provenance**: inspect publisher, maintainer contact, repositories, link priority, dates, relationships, and previous names. Do not infer organizational ownership from branding.
6. **Source and licenses**: each repository gets its own valid SPDX expression. `NOASSERTION` means the repository license is genuinely unknown, not that licensing is inapplicable.
7. **Security reviews**: confirm the linked report exists and that scope, revision, deployments, and remediation status do not overstate what it covers. Never turn a report into an “Audited” or “Safe” badge.
8. **Media**: verify project-scoped raster paths, useful captions, and validator results. SVG, disguised files, metadata-bearing images, and executable embeds are not accepted.
9. **Moderation**: look for impersonation, compromised destinations, malicious downloads, or misleading endorsement claims. Follow `docs/MODERATION.md` for escalation.
10. **Generated output**: require regenerated project content, copied media, social card, and v6 JSON in the same change. Confirm `/projects/<id>/` remains stable.

## Classification heuristics

- A `protocol` contains on-chain or protocol-level logic and therefore has at least one concrete deployment.
- An `application` is primarily used directly by people, even when it includes supporting libraries.
- `infrastructure` is operated or network-facing software such as nodes, indexers, RPC, mining, or monitoring.
- `tooling` is used to create, test, deploy, integrate, inspect, or verify other software.
- A `resource` primarily informs or coordinates people.

When two categories fit, choose the project's main user outcome as primary and add only documented secondary use cases. Capabilities should be narrow, demonstrable, and important enough that a visitor would intentionally filter for them. Put delivery format in `platforms` and preserve granular implementation details as `keywords`.

## Evidence and uncertainty

Evidence fields are optional during the initial v6 release and do not control eligibility or labels. Reviewers should still prefer direct project documentation, repository revisions, network explorers, release records, and security reports over unsourced prose.

If a factual identifier is unknown, keep the list empty. Do not approve placeholders such as `none`, `deployment-specific`, or a fabricated address. Use conservative source-verification and remediation values when the public record is incomplete.

## Required checks

```sh
python3 -m pip install -r requirements-validation.txt
python3 scripts/validate_projects.py
python3 -m unittest discover -s scripts -p 'validate_*_test.py'
go test ./...
go run scripts/generate.go
hugo --source website --gc --minify --cleanDestinationDir --forceSyncStatic
python3 scripts/validate_agent_outputs.py
```

For visible changes, check combined facet filtering, zero-result behavior, keyboard focus, mobile layout, taxonomy pages, detail pages, and permanent aliases for retired taxonomy URLs.
