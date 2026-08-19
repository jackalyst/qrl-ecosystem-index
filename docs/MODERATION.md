# Moderation, Trust, and Takedown Policy

## Purpose

The QRL Ecosystem Index is a community-maintained factual directory. Inclusion means that a project is relevant enough to document; it does not mean the maintainers endorse the project, verified its owner, reviewed its source, or consider it safe.

This policy covers inaccurate listings, impersonation, compromised projects, harmful links, delisting, removal, and takedown requests. Decisions prioritize visitor safety, factual accuracy, a useful historical record, and a fair opportunity to respond.

## Publication states

Only **archived** is a normal project `availability` value in schema v6. The other terms below are moderation outcomes and must not be encoded as project availability, maturity, maintenance, capabilities, or keywords.

- **Archived**: the project is historical or no longer normally active. Its factual page remains discoverable, may retain outbound links, and lives in `projects/archived/` with `availability: archived`.
- **Delisted**: maintainers have excluded a project from the public directory because it no longer meets listing policy, repeatedly presents materially misleading information, or creates an unresolved safety or impersonation concern. Delisting is an editorial action, not a statement that every part of the project is malicious.
- **Removed**: no public project page is rendered. Removal is used for spam, unlawful material, content with no meaningful QRL relationship, dangerous links that cannot be safely preserved, or a substantiated takedown requiring complete withdrawal.
- **Compromised**: there is credible evidence that a project's code, release channel, website, repository, maintainer account, or deployment has been taken over or is serving harmful content. “Compromised” describes an incident, not ordinary inactivity.

A future moderation registry will preserve delisted, removed, and compromised IDs as structured moderation records. Until that registry and sanitized warning tombstones are implemented, maintainers apply the policy through reviewed repository changes and retain the decision record in the corresponding issue or pull request. A credible active compromise may be handled as a temporary removal so visitors are not sent to unsafe destinations.

## Reporting a concern

Open a **Listing or safety concern** issue and provide:

- the project ID and affected URLs;
- the concern type and a concise factual description;
- public evidence, capture dates, and any relevant repository revision or deployment identifier;
- whether there is an immediate risk from following an outbound link;
- any relationship you have to the project.

Do not publish secrets, personal information, exploit code, seed phrases, private keys, or material that would increase user risk. If a report concerns a vulnerability that could be abused, use the repository's private security-reporting channel when one is available and disclose only enough publicly to route the report.

False or misleading reports, harassment, and attempts to use moderation to settle unrelated disputes may be closed without action.

## Initial response

Maintainers should acknowledge a safety report, preserve the submitted evidence, and classify urgency.

- For an apparently malicious redirect, account takeover, malware distribution, or credential theft, remove or disable the affected outbound destination as soon as practical while reviewing the broader listing.
- For an ownership, classification, staleness, or factual dispute without immediate user risk, leave the listing available while evidence is reviewed unless the content itself is harmful.
- For legal takedown requests, preserve the request privately where required and seek appropriate project or organizational guidance rather than making legal conclusions in the listing.

## Impersonation and ownership disputes

Names containing “QRL,” official-looking branding, and claims of organizational affiliation receive additional scrutiny. Reviewers compare public publisher and maintainer material, repository history, domains, and any evidence supplied by the parties.

The index may clarify the publisher, add non-affiliation wording, remove a misleading link, or delist/remove a project when material impersonation remains unresolved. An ownership claim is not accepted solely because the claimant controls a social account or submits a signed statement; the total public record is considered.

Schema v6 includes optional ownership and relationship evidence, but the initial release does not display “Ownership verified” or other trust labels.

## Compromise response

Credible compromise indicators include hostile content appearing on a previously valid domain, unauthorized releases, a maintainer or repository takeover, malicious package replacement, or verified deployment control loss.

Maintainers should:

1. prevent the directory from directing visitors to the suspected harmful destination;
2. preserve factual evidence and timestamps without copying harmful payloads into the repository;
3. contact known maintainers through previously established public channels when safe;
4. distinguish the compromised channel from unaffected repositories or deployments;
5. restore links only after public recovery evidence is available.

The planned moderation registry will allow a compromised ID to render a sanitized, outbound-link-free warning tombstone. That behavior and public compromise labels are intentionally deferred from the initial schema v6 launch.

## Delisting, removal, and appeals

Material decisions should record the project ID, reason, evidence considered, affected links or deployments, decision date, and reviewers. Except for urgent safety action, maintainers should give a reachable project contact a reasonable opportunity to respond.

An affected publisher or maintainer may appeal with new factual evidence. A different maintainer should review the appeal where practical. Reinstatement can restore the same stable project ID and canonical URL; it does not erase the decision record.

## Trust-label rollout

At schema v6 launch, evidence is optional, ownership verification is optional, and no public trust labels are emitted. After an initial contribution cycle, the maintainers may activate labels such as **Self-reported**, **Evidence checked**, **Ownership verified**, and **Stale** only when definitions, review procedures, and enough metadata exist to apply them consistently.

Automated availability checks must remain factual. They do not change a listing state, rank a project, or create an endorsement without human review.
