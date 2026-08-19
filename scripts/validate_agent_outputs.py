#!/usr/bin/env python3
"""Validate the generated agent-facing Hugo outputs."""

from __future__ import annotations

import json
import re
import sys
import xml.etree.ElementTree as ET
from datetime import datetime
from html.parser import HTMLParser
from pathlib import Path
from typing import Any
from urllib.parse import unquote, urljoin, urlparse

import yaml


CANONICAL_ORIGIN = "https://www.qrlecosystem.com"
CANONICAL_HOST = "www.qrlecosystem.com"
ROOT = Path(__file__).resolve().parents[1]
LLMS_LINK_PATTERN = re.compile(
    r"^- \[([^\]]+)\]\((https://[^)\s]+)\)(?:: .+)?$"
)
FORBIDDEN_ORIGINS = (
    "https://qrlecosystem.io",
    "http://qrlecosystem.io",
    "https://qrlecosystem.com",
    "http://qrlecosystem.com",
    "http://www.qrlecosystem.com",
)
INDEX_REQUIRED_PROJECT_FIELDS = {
    "id",
    "name",
    "project_type",
    "primary_category",
    "secondary_categories",
    "capabilities",
    "platforms",
    "keywords",
    "maturity",
    "availability",
    "display_status",
    "qrl_relationship",
    "qrl_support",
    "deployments",
    "description",
    "primary_url",
    "source_availability",
    "repositories",
    "links",
}
INDEX_OPTIONAL_PROJECT_FIELDS = {"maintenance", "logo"}
LEGACY_INDEX_FIELDS = {
    "category",
    "status",
    "qrl_versions",
    "github",
    "open_source",
    "audited",
    "audit",
    "author",
    "tags",
}
RETIRED_TAXONOMY_REDIRECTS = {
    "/project-types/dapps/": "/project-types/protocols/",
    "/project-types/community/": "/project-types/resources/",
    "/categories/defi/": "/categories/finance/",
    "/categories/nft/": "/categories/assets-tokenization/",
    "/categories/dao/": "/categories/governance-coordination/",
    "/categories/gaming/": "/categories/gaming-virtual-worlds/",
    "/categories/identity/": "/categories/identity-naming-privacy/",
    "/categories/oracle/": "/capabilities/oracle/",
    "/categories/bridge/": "/categories/interoperability-messaging-data/",
    "/categories/social/": "/categories/social-creator-content/",
    "/categories/wallet/": "/capabilities/wallet/",
    "/categories/explorer/": "/capabilities/explorer/",
    "/categories/marketplace/": "/capabilities/marketplace/",
    "/categories/token-creation/": "/categories/assets-tokenization/",
    "/categories/payments/": "/categories/payments-commerce/",
    "/categories/node/": "/capabilities/node-client/",
    "/categories/mining-pool/": "/capabilities/mining-pool/",
    "/categories/rpc-service/": "/capabilities/rpc/",
    "/categories/indexer/": "/categories/network-operations/",
    "/categories/monitoring/": "/categories/network-operations/",
    "/categories/faucet/": "/capabilities/faucet/",
    "/categories/library/": "/capabilities/library/",
    "/categories/sdk/": "/capabilities/sdk/",
    "/categories/cli/": "/capabilities/cli/",
    "/categories/compiler/": "/capabilities/compiler/",
    "/categories/developer-utility/": "/categories/developer-experience/",
    "/categories/template/": "/capabilities/contract-template/",
    "/categories/testing/": "/categories/developer-experience/",
    "/categories/analytics/": "/capabilities/analytics/",
    "/categories/education/": "/categories/education-research-ecosystem/",
    "/categories/news/": "/capabilities/news/",
    "/categories/forum/": "/categories/social-creator-content/",
    "/categories/ecosystem-coordination/": "/categories/governance-coordination/",
}


class PageMetadataParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.canonical_links: list[str] = []
        self.markdown_links: list[str] = []

    def handle_starttag(
        self, tag: str, attrs: list[tuple[str, str | None]]
    ) -> None:
        if tag != "link":
            return

        values = dict(attrs)
        relationships = (values.get("rel") or "").split()
        href = values.get("href")
        if not href:
            return
        if "canonical" in relationships:
            self.canonical_links.append(href)
        if "alternate" in relationships and values.get("type") == "text/markdown":
            self.markdown_links.append(href)


class HomepageSpotlightParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.spotlights: list[dict[str, Any]] = []
        self.current: dict[str, Any] | None = None

    def handle_starttag(
        self, tag: str, attrs: list[tuple[str, str | None]]
    ) -> None:
        values = dict(attrs)
        if tag == "aside" and "data-project-spotlight" in values:
            self.current = {"attrs": values, "links": [], "images": []}
            self.spotlights.append(self.current)
            return

        if self.current is None:
            return
        if tag == "a" and values.get("href"):
            self.current["links"].append(values["href"])
        if tag == "img":
            self.current["images"].append(values)

    def handle_endtag(self, tag: str) -> None:
        if tag == "aside":
            self.current = None


def spotlight_candidates() -> dict[str, dict[str, str]]:
    candidates: dict[str, dict[str, str]] = {}
    for yaml_path in sorted((ROOT / "projects" / "active").glob("*.yaml")):
        data = yaml.safe_load(yaml_path.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            continue
        images = [
            item
            for item in data.get("gallery") or []
            if isinstance(item, dict) and item.get("type") == "image"
        ]
        if (
            data.get("maturity") != "stable"
            or data.get("availability") != "live"
            or not images
        ):
            continue
        first_image = images[0]
        candidates[data["id"]] = {
            "path": first_image["path"],
            "caption": first_image["caption"],
        }
    return candidates


def published_path(publish_dir: Path, url_path: str) -> Path:
    return publish_dir / unquote(url_path).lstrip("/")


def main() -> int:
    publish_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("website/public")
    errors: list[str] = []
    index_projects_by_id: dict[str, dict[str, Any]] = {}

    required_files = {
        "llms.txt",
        "robots.txt",
        "sitemap.xml",
        "index.json",
        "index.html.md",
    }
    for relative_path in sorted(required_files):
        if not (publish_dir / relative_path).is_file():
            errors.append(f"Missing required output: {relative_path}")

    index_path = publish_dir / "index.json"
    if index_path.is_file():
        try:
            index_data = json.loads(index_path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError) as error:
            errors.append(f"Unable to parse index.json: {error}")
        else:
            if set(index_data) != {"schema_version", "generated_at", "count", "projects"}:
                errors.append(f"index.json has unexpected top-level fields: {sorted(index_data)}")
            if index_data.get("schema_version") != 6:
                errors.append("index.json schema_version must be 6")
            projects = index_data.get("projects")
            if not isinstance(projects, list):
                errors.append("index.json projects must be an array")
                projects = []
            if index_data.get("count") != len(projects):
                errors.append("index.json count does not match the project array")
            try:
                datetime.fromisoformat(index_data.get("generated_at", "").replace("Z", "+00:00"))
            except (AttributeError, ValueError):
                errors.append("index.json generated_at is not an RFC 3339 timestamp")

            project_ids: list[str] = []
            for position, project in enumerate(projects):
                if not isinstance(project, dict):
                    errors.append(f"index.json projects[{position}] must be an object")
                    continue
                fields = set(project)
                missing = INDEX_REQUIRED_PROJECT_FIELDS - fields
                unexpected = fields - INDEX_REQUIRED_PROJECT_FIELDS - INDEX_OPTIONAL_PROJECT_FIELDS
                legacy = fields & LEGACY_INDEX_FIELDS
                if missing:
                    errors.append(f"index.json projects[{position}] is missing {sorted(missing)}")
                if unexpected:
                    errors.append(f"index.json projects[{position}] has unexpected fields {sorted(unexpected)}")
                if legacy:
                    errors.append(f"index.json projects[{position}] contains legacy fields {sorted(legacy)}")
                project_id = project.get("id")
                if isinstance(project_id, str):
                    project_ids.append(project_id)
                    index_projects_by_id[project_id] = project
                if not project.get("capabilities"):
                    errors.append(f"index.json projects[{position}] has no capabilities")
                if not isinstance(project.get("platforms"), list):
                    errors.append(f"index.json projects[{position}] platforms must be an array")
                if not isinstance(project.get("qrl_support"), list) or not project.get("qrl_support"):
                    errors.append(f"index.json projects[{position}] has no qrl_support")
            if len(project_ids) != len(set(project_ids)):
                errors.append("index.json contains duplicate project IDs")

    homepage_path = publish_dir / "index.html"
    if homepage_path.is_file():
        homepage_html = homepage_path.read_text(encoding="utf-8")
        spotlight_parser = HomepageSpotlightParser()
        spotlight_parser.feed(homepage_html)
        candidates = spotlight_candidates()
        expected_count = 1 if candidates else 0
        if len(spotlight_parser.spotlights) != expected_count:
            errors.append(
                "Homepage must contain "
                f"{expected_count} project spotlight(s); found "
                f"{len(spotlight_parser.spotlights)}"
            )
        elif expected_count == 1:
            spotlight = spotlight_parser.spotlights[0]
            attrs = spotlight["attrs"]
            project_id = attrs.get("data-project-id")
            if project_id not in candidates:
                errors.append(
                    f"Homepage spotlight project is not eligible: {project_id!r}"
                )
            else:
                image = candidates[project_id]
                expected_href = f"/projects/{project_id}/"
                expected_src = f"/images/screenshots/{image['path']}"
                if attrs.get("data-project-maturity") != "stable":
                    errors.append("Homepage spotlight maturity must be stable")
                if attrs.get("data-project-availability") != "live":
                    errors.append("Homepage spotlight availability must be live")
                if attrs.get("data-project-image") != image["path"]:
                    errors.append("Homepage spotlight does not use the first gallery image")
                if not spotlight["links"] or any(
                    href != expected_href for href in spotlight["links"]
                ):
                    errors.append(
                        "Homepage spotlight links must all target the internal project listing"
                    )
                if len(spotlight["images"]) != 1:
                    errors.append("Homepage spotlight must contain exactly one image")
                else:
                    rendered_image = spotlight["images"][0]
                    if rendered_image.get("src") != expected_src:
                        errors.append("Homepage spotlight screenshot path is incorrect")
                    if rendered_image.get("alt") != image["caption"]:
                        errors.append("Homepage spotlight screenshot alt must match its caption")
                    if rendered_image.get("loading") != "eager":
                        errors.append("Homepage spotlight screenshot must load eagerly")
                    if rendered_image.get("fetchpriority") != "high":
                        errors.append(
                            "Homepage spotlight screenshot must have high fetch priority"
                        )
                    image_path = publish_dir / expected_src.lstrip("/")
                    if not image_path.is_file():
                        errors.append(
                            f"Homepage spotlight screenshot is not published: {expected_src}"
                        )
                indexed_project = index_projects_by_id.get(project_id)
                if not indexed_project:
                    errors.append("Homepage spotlight project is missing from index.json")
                elif (
                    indexed_project.get("maturity") != "stable"
                    or indexed_project.get("availability") != "live"
                ):
                    errors.append(
                        "Homepage spotlight project is not stable and live in index.json"
                    )
                listing_path = publish_dir / "projects" / project_id / "index.html"
                if not listing_path.is_file():
                    errors.append(
                        f"Homepage spotlight listing is not published: {expected_href}"
                    )
        if "Projects in view" in homepage_html:
            errors.append("Homepage still contains the retired Projects in view section")

    for retired_path, target_path in RETIRED_TAXONOMY_REDIRECTS.items():
        alias_file = published_path(publish_dir, retired_path) / "index.html"
        if not alias_file.is_file():
            errors.append(f"Missing retired-taxonomy redirect: {retired_path}")
            continue
        alias_html = alias_file.read_text(encoding="utf-8")
        absolute_target = f"{CANONICAL_ORIGIN}{target_path}"
        if absolute_target not in alias_html:
            errors.append(f"{retired_path} does not redirect to {target_path}")

    sitemap_path = publish_dir / "sitemap.xml"
    sitemap_urls: list[str] = []
    if sitemap_path.is_file():
        try:
            sitemap_root = ET.parse(sitemap_path).getroot()
            sitemap_urls = [
                element.text.strip()
                for element in sitemap_root.findall("{*}url/{*}loc")
                if element.text
            ]
        except (ET.ParseError, OSError) as error:
            errors.append(f"Unable to parse sitemap.xml: {error}")

    if not sitemap_urls:
        errors.append("sitemap.xml contains no page URLs")

    expected_markdown_files: set[Path] = set()
    for page_url in sitemap_urls:
        parsed = urlparse(page_url)
        if parsed.scheme != "https" or parsed.netloc != CANONICAL_HOST:
            errors.append(f"Non-canonical sitemap URL: {page_url}")
            continue
        if not parsed.path.endswith("/"):
            errors.append(f"Sitemap content URL must end with '/': {page_url}")
            continue
        if "/projects/active/" in parsed.path or "/projects/archived/" in parsed.path:
            errors.append(f"Project sitemap URL exposes status directory: {page_url}")
        if any(marker in parsed.path for marker in (".md", "llms.txt", "robots.txt")):
            errors.append(f"Agent output must not appear in sitemap.xml: {page_url}")

        output_dir = published_path(publish_dir, parsed.path)
        html_path = output_dir / "index.html"
        markdown_path = output_dir / "index.html.md"
        expected_markdown_files.add(markdown_path)

        if not html_path.is_file():
            errors.append(f"Sitemap URL has no generated HTML file: {page_url}")
            continue
        if not markdown_path.is_file():
            errors.append(f"Sitemap URL has no Markdown alternative: {page_url}")

        html = html_path.read_text(encoding="utf-8")
        parser = PageMetadataParser()
        parser.feed(html)

        if parser.canonical_links != [page_url]:
            errors.append(
                f"{html_path}: expected one canonical link to {page_url}, "
                f"found {parser.canonical_links}"
            )

        expected_markdown_url = urljoin(page_url, "index.html.md")
        if parser.markdown_links != [expected_markdown_url]:
            errors.append(
                f"{html_path}: expected one Markdown alternate link to "
                f"{expected_markdown_url}, found {parser.markdown_links}"
            )

    actual_markdown_files = set(publish_dir.rglob("index.html.md"))
    missing_markdown = expected_markdown_files - actual_markdown_files
    extra_markdown = actual_markdown_files - expected_markdown_files
    for path in sorted(missing_markdown):
        errors.append(f"Missing Markdown output: {path}")
    for path in sorted(extra_markdown):
        errors.append(f"Markdown output is not represented in sitemap.xml: {path}")

    forbidden_markup = ("<!doctype", "<html", "<head", "<body", "<script")
    for markdown_path in sorted(actual_markdown_files):
        markdown = markdown_path.read_text(encoding="utf-8")
        if not markdown.startswith("# "):
            errors.append(f"{markdown_path}: Markdown output must start with an H1")
        if markdown.startswith("---"):
            errors.append(f"{markdown_path}: Markdown output contains front matter")
        lowered = markdown.lower()
        for marker in forbidden_markup:
            if marker in lowered:
                errors.append(f"{markdown_path}: contains HTML shell marker {marker!r}")

    llms_path = publish_dir / "llms.txt"
    if llms_path.is_file():
        llms_text = llms_path.read_text(encoding="utf-8")
        llms_lines = llms_text.splitlines()
        if not llms_lines or llms_lines[0] != "# QRL Ecosystem Index":
            errors.append("llms.txt must start with the site H1")

        headings = [line for line in llms_lines if line.startswith("## ")]
        expected_headings = ["## Core Resources", "## Projects", "## Optional"]
        if headings != expected_headings:
            errors.append(
                f"llms.txt sections must be {expected_headings}; found {headings}"
            )

        first_section = next(
            (index for index, line in enumerate(llms_lines) if line.startswith("## ")),
            len(llms_lines),
        )
        if not any(line.startswith("> ") for line in llms_lines[1:first_section]):
            errors.append("llms.txt must include a summary blockquote before its sections")

        links: list[tuple[str, str]] = []
        for line_number, line in enumerate(llms_lines, start=1):
            if not line.startswith("- ["):
                continue
            match = LLMS_LINK_PATTERN.fullmatch(line)
            if not match:
                errors.append(f"llms.txt:{line_number}: invalid file-list entry")
                continue
            links.append((match.group(1), match.group(2)))

        urls = [url for _, url in links]
        if len(urls) != len(set(urls)):
            errors.append("llms.txt contains duplicate URLs")

        for _, url in links:
            parsed = urlparse(url)
            if parsed.scheme != "https":
                errors.append(f"llms.txt link is not HTTPS: {url}")
            if parsed.netloc == CANONICAL_HOST:
                if parsed.query or parsed.fragment:
                    errors.append(f"Internal llms.txt link must be canonical: {url}")
                    continue
                if (
                    "/projects/active/" in parsed.path
                    or "/projects/archived/" in parsed.path
                ):
                    errors.append(f"llms.txt project link exposes status directory: {url}")
                local_path = published_path(publish_dir, parsed.path)
                if not local_path.is_file():
                    errors.append(f"Internal llms.txt link does not resolve: {url}")

        try:
            projects_start = llms_lines.index("## Projects") + 1
            optional_start = llms_lines.index("## Optional")
            project_names = [
                match.group(1)
                for line in llms_lines[projects_start:optional_start]
                if (match := LLMS_LINK_PATTERN.fullmatch(line))
            ]
            if project_names != sorted(project_names, key=str.casefold):
                errors.append("llms.txt project links are not alphabetically ordered")
        except ValueError:
            pass

    robots_path = publish_dir / "robots.txt"
    if robots_path.is_file():
        robots_lines = [
            line.strip()
            for line in robots_path.read_text(encoding="utf-8").splitlines()
            if line.strip()
        ]
        expected_robots = [
            "User-agent: *",
            "Allow: /",
            f"Sitemap: {CANONICAL_ORIGIN}/sitemap.xml",
        ]
        if robots_lines != expected_robots:
            errors.append(
                f"robots.txt must contain {expected_robots}; found {robots_lines}"
            )

    checked_suffixes = {".html", ".md", ".txt", ".xml", ".json"}
    for output_path in publish_dir.rglob("*"):
        if not output_path.is_file() or output_path.suffix not in checked_suffixes:
            continue
        text = output_path.read_text(encoding="utf-8")
        for origin in FORBIDDEN_ORIGINS:
            if origin in text:
                errors.append(f"{output_path}: contains forbidden origin {origin}")

    if errors:
        print("AGENT OUTPUT VALIDATION ERRORS:")
        for error in errors:
            print(f"  - {error}")
        return 1

    print(
        f"Agent outputs are valid: {len(sitemap_urls)} HTML pages, "
        f"{len(actual_markdown_files)} Markdown alternatives."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
