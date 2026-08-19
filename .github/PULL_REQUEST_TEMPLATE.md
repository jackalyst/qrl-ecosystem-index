## Project Submission Checklist

- [ ] I used the schema v6 `projects/template.yaml` and removed all legacy fields
- [ ] The filename matches the `id` field in the YAML
- [ ] `availability: archived` is in `projects/archived/`; every other availability is in `projects/active/`
- [ ] My project `id` is unique and does not conflict with an existing entry
- [ ] I chose independent type, primary/secondary category, and capability facets from the controlled vocabulary
- [ ] QRL support and any deployments use controlled, mutually consistent generation/network values
- [ ] Publisher, maintainer, source availability, repository licenses, and links are factual and use public HTTPS URLs
- [ ] At most one link is primary; relationship, review, asset, and deployment references resolve
- [ ] All supplied URLs are reachable and I have read `CONTRIBUTING.md`
- [ ] My project is related to the QRL ecosystem
- [ ] Logos are local PNG/WebP files under `images/logos/<project-id>/`; no SVG or `logo` shorthand is used
- [ ] Gallery images are local PNG/JPEG/WebP files under `images/screenshots/<project-id>/`, no larger than 2 MB or 10 MP
- [ ] Media has genuine file signatures and contains no EXIF, XMP, or text metadata
- [ ] Security reports are represented as scoped `security_reviews`, without “audited,” “safe,” or ownership claims
- [ ] I ran the central validator, unit tests, generator, Go tests, and a production Hugo build
- [ ] Generated project pages, media copies, social card, and `website/static/index.json` are included

## Classification rationale

<!-- Briefly explain the chosen type, primary category, secondary categories, and capabilities. -->

## QRL support and deployment evidence

<!-- Link public documentation or source material that supports the relationship, environments, and any deployment identifiers. Evidence remains optional at launch, but it helps reviewers. -->

## Notes for Reviewers

<!-- Call out renames, relationships, security reports, moderation considerations, or unavailable facts. -->
