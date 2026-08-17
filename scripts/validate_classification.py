#!/usr/bin/env python3
"""Validate classification metadata, schema parity, and project pairs."""

import json
import sys
from datetime import date, datetime
from pathlib import Path

import jsonschema
import yaml


ROOT = Path(__file__).resolve().parents[1]
CLASSIFICATION_PATH = ROOT / "website" / "data" / "classification.yaml"
SCHEMA_PATH = ROOT / "schema" / "project.schema.json"


def normalize_for_schema(value):
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    if isinstance(value, list):
        return [normalize_for_schema(item) for item in value]
    if isinstance(value, dict):
        return {key: normalize_for_schema(item) for key, item in value.items()}
    return value


def load_contract():
    classification = yaml.safe_load(CLASSIFICATION_PATH.read_text())
    schema = json.loads(SCHEMA_PATH.read_text())
    return classification, schema


def validate_metadata(classification):
    errors = []
    project_types = classification.get("project_types") or []
    type_ids = [item.get("id") for item in project_types]
    taxonomy_slugs = [item.get("taxonomy_slug") for item in project_types]
    if len(type_ids) != len(set(type_ids)):
        errors.append("classification contains duplicate project type ids")
    if len(taxonomy_slugs) != len(set(taxonomy_slugs)):
        errors.append("classification contains duplicate project type taxonomy slugs")

    category_parents = {}
    for project_type in project_types:
        for field in ("id", "taxonomy_slug", "label", "description"):
            if not project_type.get(field):
                errors.append(f"project type is missing {field}: {project_type!r}")
        categories = project_type.get("categories") or []
        if not categories:
            errors.append(f"project type {project_type.get('id')!r} has no child categories")
        for category in categories:
            for field in ("id", "label", "description"):
                if not category.get(field):
                    errors.append(f"category under {project_type.get('id')!r} is missing {field}: {category!r}")
            category_id = category.get("id")
            if category_id in type_ids:
                errors.append(f"category {category_id!r} duplicates a project type id")
            if category_id in category_parents:
                errors.append(
                    f"category {category_id!r} belongs to both {category_parents[category_id]!r} and {project_type.get('id')!r}"
                )
            category_parents[category_id] = project_type.get("id")
    return errors


def validate_schema_parity(classification, schema):
    errors = []
    project_types = classification["project_types"]
    expected_types = [item["id"] for item in project_types]
    expected_categories = [category["id"] for item in project_types for category in item["categories"]]
    if schema.get("version") != 5:
        errors.append(f"schema version is {schema.get('version')!r}, expected 5")
    if schema["properties"]["project_type"].get("enum") != expected_types:
        errors.append("schema project_type enum is out of sync with classification metadata")
    if schema["properties"]["category"].get("enum") != expected_categories:
        errors.append("schema category enum is out of sync with classification metadata")

    branches = schema.get("allOf", [{}])[0].get("oneOf", [])
    actual_pairs = {
        branch["properties"]["project_type"].get("const"): branch["properties"]["category"].get("enum")
        for branch in branches
    }
    expected_pairs = {item["id"]: [category["id"] for category in item["categories"]] for item in project_types}
    if actual_pairs != expected_pairs:
        errors.append("schema parent/child branches are out of sync with classification metadata")
    return errors


def validate_projects(schema):
    errors = []
    validator = jsonschema.Draft202012Validator(schema)
    for yaml_path in sorted((ROOT / "projects").glob("*/*.yaml")):
        project = normalize_for_schema(yaml.safe_load(yaml_path.read_text()))
        for error in validator.iter_errors(project):
            errors.append(f"{yaml_path.relative_to(ROOT)}: {error.message}")
    return errors


def main():
    classification, schema = load_contract()
    errors = []
    errors.extend(validate_metadata(classification))
    errors.extend(validate_schema_parity(classification, schema))
    errors.extend(validate_projects(schema))
    if errors:
        print("CLASSIFICATION ERRORS:")
        print("\n".join(f"  - {error}" for error in errors))
        return 1
    print("Project classification metadata, schema, and listings are valid.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
