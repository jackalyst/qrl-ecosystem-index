import copy
import json
import unittest
from pathlib import Path

import jsonschema


ROOT = Path(__file__).resolve().parents[1]
SCHEMA = json.loads((ROOT / "schema" / "project.schema.json").read_text())


def project(project_type, category):
    return {
        "id": "example-project",
        "name": "Example project",
        "project_type": project_type,
        "qrl_versions": ["2.0"],
        "status": "development",
        "description": "An example project used to test classification.",
        "category": category,
        "tags": [],
        "author": "Community",
        "license": "MIT",
        "created": "2026-08-17",
        "updated": "2026-08-17",
    }


class ClassificationSchemaTests(unittest.TestCase):
    def test_each_parent_accepts_all_declared_children(self):
        branches = SCHEMA["allOf"][0]["oneOf"]
        for branch in branches:
            project_type = branch["properties"]["project_type"]["const"]
            for category in branch["properties"]["category"]["enum"]:
                with self.subTest(project_type=project_type, category=category):
                    jsonschema.validate(project(project_type, category), SCHEMA)

    def test_category_under_wrong_parent_is_rejected(self):
        with self.assertRaises(jsonschema.ValidationError):
            jsonschema.validate(project("tooling", "wallet"), SCHEMA)

    def test_unknown_values_are_rejected(self):
        for field, value in (("project_type", "service"), ("category", "tooling")):
            candidate = project("tooling", "sdk")
            candidate[field] = value
            with self.subTest(field=field):
                with self.assertRaises(jsonschema.ValidationError):
                    jsonschema.validate(candidate, SCHEMA)

    def test_parent_name_cannot_be_used_as_category(self):
        candidate = copy.deepcopy(project("infrastructure", "node"))
        candidate["category"] = "infrastructure"
        with self.assertRaises(jsonschema.ValidationError):
            jsonschema.validate(candidate, SCHEMA)


if __name__ == "__main__":
    unittest.main()
