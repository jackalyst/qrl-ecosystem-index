#!/usr/bin/env python3
"""Validate the schema v6 contract, project records, and local media."""

from __future__ import annotations

import json
import struct
import sys
import xml.etree.ElementTree as ET
from datetime import date, datetime
from pathlib import Path, PurePosixPath
from typing import Any
from urllib.parse import urlparse

import jsonschema
import yaml
from license_expression import get_spdx_licensing

from validate_gallery import validate_gallery


ROOT = Path(__file__).resolve().parents[1]
CLASSIFICATION_PATH = ROOT / "website" / "data" / "classification.yaml"
SCHEMA_PATH = ROOT / "schema" / "project.schema.json"
MAX_LOGO_BYTES = 1024 * 1024
MAX_IMAGE_PIXELS = 10_000_000
LEGACY_FIELDS = {
    "project_type_specific",
    "qrl_versions",
    "status",
    "category",
    "tags",
    "author",
    "license",
    "created",
    "updated",
    "url",
    "github",
    "discord",
    "twitter",
    "docs",
    "logo",
    "open_source",
    "audited",
    "audits",
    "clients",
    "dapp",
    "application",
    "infrastructure",
    "tooling",
    "community",
}


def normalize_for_schema(value: Any) -> Any:
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    if isinstance(value, list):
        return [normalize_for_schema(item) for item in value]
    if isinstance(value, dict):
        return {key: normalize_for_schema(item) for key, item in value.items()}
    return value


def load_contract() -> tuple[dict[str, Any], dict[str, Any]]:
    classification = yaml.safe_load(CLASSIFICATION_PATH.read_text())
    schema = json.loads(SCHEMA_PATH.read_text())
    return classification, schema


def project_yaml_files() -> list[Path]:
    return sorted(
        path
        for path in (ROOT / "projects").glob("*/*.yaml")
        if path.name != "template.yaml"
    )


def validate_metadata(classification: dict[str, Any], schema: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    collection_fields = {
        "project_types": ("id", "label", "description", "taxonomy_slug"),
        "categories": ("id", "label", "description"),
        "capabilities": ("id", "label", "description"),
        "platforms": ("id", "label", "description"),
        "networks": ("id", "label", "generation", "environment"),
    }
    for collection_name, required_fields in collection_fields.items():
        items = classification.get(collection_name) or []
        identifiers = [item.get("id") for item in items]
        if not items:
            errors.append(f"classification has no {collection_name}")
        if len(identifiers) != len(set(identifiers)):
            errors.append(f"classification contains duplicate {collection_name} ids")
        for item in items:
            for field in required_fields:
                if not item.get(field):
                    errors.append(f"{collection_name} item is missing {field}: {item!r}")

    expected_types = [item["id"] for item in classification["project_types"]]
    expected_categories = [item["id"] for item in classification["categories"]]
    expected_capabilities = [item["id"] for item in classification["capabilities"]]
    expected_platforms = [item["id"] for item in classification["platforms"]]
    expected_networks = [item["id"] for item in classification["networks"]]
    if schema.get("version") != 6:
        errors.append(f"schema version is {schema.get('version')!r}, expected 6")
    if schema["properties"]["project_type"].get("enum") != expected_types:
        errors.append("schema project_type enum is out of sync with classification metadata")
    if schema["$defs"]["category"].get("enum") != expected_categories:
        errors.append("schema category enum is out of sync with classification metadata")
    if schema["$defs"]["capability"].get("enum") != expected_capabilities:
        errors.append("schema capability enum is out of sync with classification metadata")
    if schema["$defs"]["platform"].get("enum") != expected_platforms:
        errors.append("schema platform enum is out of sync with classification metadata")
    deployment_networks = schema["$defs"]["deployment"]["properties"]["network"].get("enum")
    if deployment_networks != expected_networks:
        errors.append("schema deployment network enum is out of sync with classification metadata")
    if any(network["generation"] == "2.0" and network["environment"] == "mainnet" for network in classification["networks"]):
        errors.append("QRL 2.0 mainnet must not be added before it is officially available")
    return errors


def https_url(value: str) -> bool:
    parsed = urlparse(value)
    return parsed.scheme == "https" and bool(parsed.netloc)


def png_dimensions(data: bytes) -> tuple[int, int] | None:
    if len(data) < 24 or data[:8] != b"\x89PNG\r\n\x1a\n":
        return None
    return struct.unpack(">II", data[16:24])


def webp_dimensions(data: bytes) -> tuple[int, int] | None:
    if len(data) < 30 or data[:4] != b"RIFF" or data[8:12] != b"WEBP":
        return None
    chunk = data[12:16]
    if chunk == b"VP8X":
        width = 1 + int.from_bytes(data[24:27], "little")
        height = 1 + int.from_bytes(data[27:30], "little")
        return width, height
    if chunk == b"VP8L" and data[20] == 0x2F:
        bits = int.from_bytes(data[21:25], "little")
        return (bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1
    if chunk == b"VP8 " and len(data) >= 30 and data[23:26] == b"\x9d\x01\x2a":
        return int.from_bytes(data[26:28], "little") & 0x3FFF, int.from_bytes(data[28:30], "little") & 0x3FFF
    return None


def raster_metadata_is_clean(path: Path, data: bytes) -> bool:
    if path.suffix == ".png":
        return not any(chunk in data for chunk in (b"eXIf", b"tEXt", b"zTXt", b"iTXt"))
    if path.suffix == ".webp":
        return b"EXIF" not in data and b"XMP " not in data
    if path.suffix in {".jpg", ".jpeg"}:
        return b"Exif\x00\x00" not in data and b"http://ns.adobe.com/xap/1.0/" not in data
    return False


def validate_logo(yaml_path: Path, project_id: str, logo: Any) -> list[str]:
    errors: list[str] = []
    if not isinstance(logo, dict) or not isinstance(logo.get("path"), str):
        return [f"{yaml_path}: every logos entry must be an object with a path"]
    logo_path = logo["path"]
    relative = PurePosixPath(logo_path)
    if len(relative.parts) != 2 or relative.parts[0] != project_id:
        return [f"{yaml_path}: logo path must be inside '{project_id}/': {logo_path}"]
    if relative.suffix not in {".png", ".webp", ".svg"}:
        return [f"{yaml_path}: logo must use a lowercase PNG, WebP, or SVG extension: {logo_path}"]
    full_path = ROOT / "images" / "logos" / Path(*relative.parts)
    if not full_path.is_file():
        return [f"{yaml_path}: logo file not found: {logo_path}"]
    if full_path.stat().st_size > MAX_LOGO_BYTES:
        errors.append(f"{yaml_path}: logo exceeds the 1 MB limit: {logo_path}")
    data = full_path.read_bytes()
    if relative.suffix == ".svg":
        try:
            root = ET.fromstring(data)
        except ET.ParseError:
            errors.append(f"{yaml_path}: logo contents do not match its extension: {logo_path}")
            return errors
        if root.tag not in {"svg", "{http://www.w3.org/2000/svg}svg"}:
            errors.append(f"{yaml_path}: logo contents do not match its extension: {logo_path}")
        return errors

    dimensions = png_dimensions(data) if relative.suffix == ".png" else webp_dimensions(data)
    if not dimensions:
        errors.append(f"{yaml_path}: logo contents do not match its extension: {logo_path}")
    elif dimensions[0] * dimensions[1] > MAX_IMAGE_PIXELS:
        errors.append(f"{yaml_path}: logo exceeds the 10 megapixel limit: {logo_path}")
    if not raster_metadata_is_clean(full_path, data):
        errors.append(f"{yaml_path}: logo contains embedded metadata: {logo_path}")
    return errors


def validate_spdx(expression: str) -> bool:
    if expression == "NOASSERTION":
        return True
    try:
        get_spdx_licensing().parse(expression, validate=True, strict=True)
    except Exception:
        return False
    return True


def validate_project(
    yaml_path: Path,
    data: dict[str, Any],
    schema: dict[str, Any],
    classification: dict[str, Any],
    all_ids: set[str],
) -> list[str]:
    errors: list[str] = []
    project_id = data.get("id", "MISSING")
    relative_path = yaml_path.relative_to(ROOT)
    validator = jsonschema.Draft202012Validator(schema, format_checker=jsonschema.FormatChecker())
    for error in sorted(validator.iter_errors(normalize_for_schema(data)), key=lambda item: list(item.path)):
        location = ".".join(str(item) for item in error.path)
        errors.append(f"{relative_path}: {location + ': ' if location else ''}{error.message}")

    legacy = sorted(LEGACY_FIELDS.intersection(data))
    if legacy:
        errors.append(f"{relative_path}: legacy fields are not allowed: {', '.join(legacy)}")
    if yaml_path.name != f"{project_id}.yaml":
        errors.append(f"{relative_path}: filename does not match id {project_id!r}")
    expected_directory = "archived" if data.get("availability") == "archived" else "active"
    if yaml_path.parent.name != expected_directory:
        errors.append(f"{relative_path}: availability requires projects/{expected_directory}/")

    if data.get("primary_category") in (data.get("secondary_categories") or []):
        errors.append(f"{relative_path}: primary_category cannot also be secondary")

    support = data.get("qrl_support") or []
    support_by_generation = {item.get("generation"): set(item.get("environments") or []) for item in support if isinstance(item, dict)}
    if len(support_by_generation) != len(support):
        errors.append(f"{relative_path}: qrl_support may contain only one record per generation")
    networks = {item["id"]: item for item in classification["networks"]}
    allowed_environments: dict[str, set[str]] = {}
    for network in networks.values():
        allowed_environments.setdefault(network["generation"], set()).add(network["environment"])
    for generation, environments in support_by_generation.items():
        invalid_environments = environments - allowed_environments.get(generation, set())
        if invalid_environments:
            errors.append(
                f"{relative_path}: {generation} does not support environments "
                f"{', '.join(sorted(invalid_environments))}"
            )
    deployments = data.get("deployments") or []
    if data.get("project_type") == "protocol" and not deployments:
        errors.append(f"{relative_path}: protocols require at least one deployment")
    deployment_ids: set[str] = set()
    for deployment in deployments:
        deployment_id = deployment.get("id")
        if deployment_id in deployment_ids:
            errors.append(f"{relative_path}: duplicate deployment id {deployment_id!r}")
        deployment_ids.add(deployment_id)
        network = networks.get(deployment.get("network"))
        if not network:
            continue
        environments = support_by_generation.get(network["generation"], set())
        if network["environment"] not in environments:
            errors.append(
                f"{relative_path}: deployment {deployment_id!r} is not represented in qrl_support"
            )
        for identifier in deployment.get("identifiers") or []:
            if identifier.get("type") in {"contract", "proxy", "implementation", "factory"} and network["generation"] != "2.0":
                errors.append(f"{relative_path}: contract identifiers require a QRL 2.0 network")
            if str(identifier.get("value", "")).strip().lower() in {"none", "deployment-specific"}:
                errors.append(f"{relative_path}: deployment identifiers cannot use placeholder values")

    generations = set(support_by_generation)
    capabilities = set(data.get("capabilities") or [])
    if "mining-pool" in capabilities and generations != {"1.x"}:
        errors.append(f"{relative_path}: mining-pool projects must support only QRL 1.x")
    qrl2_only = bool(capabilities.intersection({"validator", "liquid-staking"})) or (
        data.get("project_type") == "protocol" and "staking" in capabilities
    )
    if qrl2_only and generations != {"2.0"}:
        errors.append(f"{relative_path}: validator and protocol staking capabilities support only QRL 2.0")

    repositories = data.get("repositories") or []
    repository_ids = [repository.get("id") for repository in repositories]
    if len(repository_ids) != len(set(repository_ids)):
        errors.append(f"{relative_path}: repository ids must be unique")
    source_availability = data.get("source_availability")
    if source_availability in {"full", "partial"} and not repositories:
        errors.append(f"{relative_path}: public source availability requires a repository")
    if source_availability in {"unavailable", "not-applicable"} and repositories:
        errors.append(f"{relative_path}: unavailable or inapplicable source cannot list repositories")
    for repository in repositories:
        if not validate_spdx(repository.get("license", "")):
            errors.append(f"{relative_path}: invalid SPDX expression {repository.get('license')!r}")

    links = data.get("links") or []
    if sum(1 for link in links if link.get("primary")) > 1:
        errors.append(f"{relative_path}: links may contain at most one primary destination")
    if not links and not repositories:
        errors.append(f"{relative_path}: at least one link or repository is required")

    url_values: list[tuple[str, str]] = []
    publisher = data.get("publisher") or {}
    if publisher.get("url"):
        url_values.append(("publisher.url", publisher["url"]))
    for index, maintainer in enumerate(data.get("maintainers") or []):
        if maintainer.get("contact"):
            url_values.append((f"maintainers[{index}].contact", maintainer["contact"]))
    for collection, key in ((repositories, "url"), (links, "url"), (data.get("evidence") or [], "url")):
        for index, item in enumerate(collection):
            if item.get(key):
                url_values.append((f"{key}[{index}]", item[key]))
    for index, deployment in enumerate(deployments):
        for evidence_index, url in enumerate(deployment.get("evidence") or []):
            url_values.append((f"deployments[{index}].evidence[{evidence_index}]", url))
    for index, support_record in enumerate(support):
        for evidence_index, url in enumerate(support_record.get("evidence") or []):
            url_values.append((f"qrl_support[{index}].evidence[{evidence_index}]", url))
    for index, review in enumerate(data.get("security_reviews") or []):
        url_values.append((f"security_reviews[{index}].report_url", review.get("report_url", "")))
        if review.get("repository_id") and review["repository_id"] not in repository_ids:
            errors.append(f"{relative_path}: security review references unknown repository {review['repository_id']!r}")
        for deployment_id in review.get("deployment_ids") or []:
            if deployment_id not in deployment_ids:
                errors.append(f"{relative_path}: security review references unknown deployment {deployment_id!r}")
    for index, asset in enumerate(data.get("assets") or []):
        if asset.get("deployment_id") and asset["deployment_id"] not in deployment_ids:
            errors.append(f"{relative_path}: asset references unknown deployment {asset['deployment_id']!r}")
        if asset.get("evidence_url"):
            url_values.append((f"assets[{index}].evidence_url", asset["evidence_url"]))
    for label, value in url_values:
        if value and not https_url(value):
            errors.append(f"{relative_path}: {label} must be an HTTPS URL: {value}")

    seen_relationships: set[tuple[str, str]] = set()
    for relationship in data.get("relationships") or []:
        target = relationship.get("project_id")
        pair = (relationship.get("type"), target)
        if target == project_id:
            errors.append(f"{relative_path}: project cannot relate to itself")
        if target not in all_ids:
            errors.append(f"{relative_path}: relationship references unknown project {target!r}")
        if pair in seen_relationships:
            errors.append(f"{relative_path}: duplicate relationship {pair!r}")
        seen_relationships.add(pair)

    for logo in data.get("logos") or []:
        errors.extend(validate_logo(yaml_path, project_id, logo))
    errors.extend(validate_gallery(yaml_path, data, ROOT))
    return errors


def collect_errors() -> list[str]:
    classification, schema = load_contract()
    errors = validate_metadata(classification, schema)
    paths = project_yaml_files()
    records: list[tuple[Path, dict[str, Any]]] = []
    ids: list[str] = []
    for path in paths:
        data = yaml.safe_load(path.read_text()) or {}
        records.append((path, data))
        if data.get("id"):
            ids.append(data["id"])
    if len(ids) != len(set(ids)):
        errors.append("project ids must be unique")
    all_ids = set(ids)
    for path, data in records:
        errors.extend(validate_project(path, data, schema, classification, all_ids))
    used_capabilities = {
        capability
        for _, data in records
        for capability in (data.get("capabilities") or [])
    }
    unrepresented = [
        item["id"]
        for item in classification["capabilities"]
        if item["id"] not in used_capabilities
    ]
    if unrepresented:
        errors.append(
            "classification contains unrepresented capabilities: "
            + ", ".join(unrepresented)
        )
    return errors


def main() -> int:
    errors = collect_errors()
    if errors:
        print("PROJECT VALIDATION ERRORS:")
        print("\n".join(f"  - {error}" for error in errors))
        return 1
    print("Schema v6 metadata, project records, platforms, relationships, and media are valid.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
