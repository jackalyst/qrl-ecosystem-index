import copy
import struct
import tempfile
import unittest
import zlib
from pathlib import Path

import jsonschema
import yaml

import validate_projects


class ValidateProjectsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.classification, cls.schema = validate_projects.load_contract()

    def base_project(self):
        return {
            "id": "example-project",
            "name": "Example project",
            "project_type": "tooling",
            "primary_category": "developer-experience",
            "secondary_categories": [],
            "capabilities": ["sdk"],
            "platforms": [],
            "keywords": ["example"],
            "maturity": "beta",
            "availability": "live",
            "qrl_relationship": "native",
            "qrl_support": [{"generation": "2.0", "environments": []}],
            "description": "Example project used by the validator tests.",
            "publisher": {"name": "Example", "url": "https://example.com"},
            "maintainers": [{"name": "Example", "contact": "https://example.com/contact"}],
            "source_availability": "full",
            "repositories": [{"id": "main", "role": "sdk", "url": "https://example.com/source", "license": "MIT"}],
            "links": [{"type": "website", "url": "https://example.com", "primary": True}],
            "listed_at": "2026-01-01",
            "data_updated_at": "2026-01-02",
            "features": ["Example feature"],
        }

    def validate(self, project, files=None, directory="active"):
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            yaml_path = root / "projects" / directory / "example-project.yaml"
            yaml_path.parent.mkdir(parents=True)
            yaml_path.write_text(yaml.safe_dump(project))
            for relative_path, contents in (files or {}).items():
                output = root / relative_path
                output.parent.mkdir(parents=True, exist_ok=True)
                output.write_bytes(contents)
            original_root = validate_projects.ROOT
            validate_projects.ROOT = root
            try:
                return validate_projects.validate_project(
                    yaml_path,
                    project,
                    self.schema,
                    self.classification,
                    {"example-project"},
                )
            finally:
                validate_projects.ROOT = original_root

    def test_valid_project_is_accepted(self):
        self.assertEqual(self.validate(self.base_project()), [])

    def test_primary_category_cannot_be_secondary(self):
        project = self.base_project()
        project["secondary_categories"] = ["developer-experience"]
        self.assertTrue(any("cannot also be secondary" in error for error in self.validate(project)))

    def test_capabilities_are_limited_to_four_unique_values(self):
        project = self.base_project()
        project["capabilities"] = ["analytics", "cli", "library", "rpc", "sdk"]
        self.assertTrue(any("too long" in error for error in self.validate(project)))

        project["capabilities"] = ["sdk", "sdk"]
        self.assertTrue(any("non-unique" in error for error in self.validate(project)))

    def test_platforms_accept_only_unique_controlled_values(self):
        project = self.base_project()
        project["platforms"] = ["web", "desktop"]
        self.assertEqual(self.validate(project), [])

        project["platforms"] = ["web", "web"]
        self.assertTrue(any("non-unique" in error for error in self.validate(project)))

        project["platforms"] = ["terminal"]
        self.assertTrue(any("not one of" in error for error in self.validate(project)))

    def test_protocol_requires_deployment(self):
        project = self.base_project()
        project["project_type"] = "protocol"
        self.assertTrue(any("protocols require" in error for error in self.validate(project)))

    def test_contract_requires_qrl_2_network(self):
        project = self.base_project()
        project["project_type"] = "protocol"
        project["qrl_support"] = [{"generation": "1.x", "environments": ["mainnet"]}]
        project["deployments"] = [{
            "id": "mainnet",
            "network": "qrl-1-mainnet",
            "operational_state": "live",
            "identifiers": [{"type": "contract", "value": "Q123"}],
            "evidence": [],
            "source_verification": "unknown",
        }]
        self.assertTrue(any("contract identifiers require" in error for error in self.validate(project)))

    def test_capability_generation_rules(self):
        mining = self.base_project()
        mining["capabilities"] = ["mining-pool"]
        self.assertTrue(any("mining-pool" in error for error in self.validate(mining)))

        validator = self.base_project()
        validator["capabilities"] = ["validator"]
        validator["qrl_support"] = [{"generation": "1.x", "environments": []}]
        self.assertTrue(any("only QRL 2.0" in error for error in self.validate(validator)))

        mixed_validator = self.base_project()
        mixed_validator["capabilities"] = ["validator"]
        mixed_validator["qrl_support"] = [
            {"generation": "1.x", "environments": []},
            {"generation": "2.0", "environments": []},
        ]
        self.assertTrue(any("only QRL 2.0" in error for error in self.validate(mixed_validator)))

    def test_source_and_repository_rules(self):
        project = self.base_project()
        project["repositories"] = []
        self.assertTrue(any("requires a repository" in error for error in self.validate(project)))

        project = self.base_project()
        project["repositories"][0]["license"] = "not a valid SPDX expression"
        self.assertTrue(any("invalid SPDX" in error for error in self.validate(project)))

        project["repositories"][0]["license"] = "MIT OR Apache-2.0"
        self.assertFalse(any("invalid SPDX" in error for error in self.validate(project)))

        project["repositories"][0]["license"] = "NOASSERTION"
        self.assertFalse(any("invalid SPDX" in error for error in self.validate(project)))

    def test_network_support_and_identifier_rules(self):
        project = self.base_project()
        project["qrl_support"] = [{"generation": "2.0", "environments": ["mainnet"]}]
        self.assertTrue(any("does not support environments mainnet" in error for error in self.validate(project)))

        project = self.base_project()
        project["project_type"] = "protocol"
        project["qrl_support"] = [{"generation": "2.0", "environments": ["devnet"]}]
        project["deployments"] = [{
            "id": "testnet",
            "network": "qrl-2-testnet-v2",
            "operational_state": "live",
            "identifiers": [{"type": "contract", "value": "deployment-specific"}],
            "evidence": [],
            "source_verification": "unknown",
        }]
        errors = self.validate(project)
        self.assertTrue(any("not represented in qrl_support" in error for error in errors))
        self.assertTrue(any("placeholder" in error for error in errors))

    def test_relationship_deployment_and_primary_link_references(self):
        project = self.base_project()
        project["relationships"] = [{"type": "fork-of", "project_id": "missing-project"}]
        project["links"].append({"type": "documentation", "url": "https://example.com/docs", "primary": True})
        project["security_reviews"] = [{
            "auditor": "Example Security",
            "report_url": "https://example.com/report.pdf",
            "repository_id": "missing-repository",
            "scope": "Example scope",
            "deployment_ids": ["missing-deployment"],
            "remediation_status": "not-reported",
        }]
        project["assets"] = [{"type": "token", "name": "Example", "deployment_id": "missing-deployment"}]
        errors = self.validate(project)
        self.assertTrue(any("unknown project" in error for error in errors))
        self.assertTrue(any("at most one primary" in error for error in errors))
        self.assertTrue(any("unknown repository" in error for error in errors))
        self.assertTrue(any("unknown deployment" in error for error in errors))

    def test_availability_directory_alignment(self):
        project = self.base_project()
        project["availability"] = "archived"
        self.assertTrue(any("projects/archived" in error for error in self.validate(project)))
        self.assertFalse(any("availability requires" in error for error in self.validate(project, directory="archived")))

    def test_logo_signature_and_metadata_are_checked(self):
        project = self.base_project()
        project["logos"] = [{"path": "example-project/icon.png"}]
        disguised = self.validate(
            project,
            {"images/logos/example-project/icon.png": b"not a png"},
        )
        self.assertTrue(any("contents do not match" in error for error in disguised))

        def chunk(kind, payload):
            checksum = zlib.crc32(kind + payload) & 0xFFFFFFFF
            return struct.pack(">I", len(payload)) + kind + payload + struct.pack(">I", checksum)

        png = (
            b"\x89PNG\r\n\x1a\n"
            + chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 6, 0, 0, 0))
            + chunk(b"tEXt", b"Comment\x00unsafe metadata")
            + chunk(b"IDAT", zlib.compress(b"\x00\x00\x00\x00\x00"))
            + chunk(b"IEND", b"")
        )
        metadata = self.validate(
            project,
            {"images/logos/example-project/icon.png": png},
        )
        self.assertTrue(any("embedded metadata" in error for error in metadata))

    def test_svg_logo_is_accepted(self):
        project = self.base_project()
        project["logos"] = [{"path": "example-project/icon.svg"}]
        svg = b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>'
        self.assertEqual(
            self.validate(project, {"images/logos/example-project/icon.svg": svg}),
            [],
        )

    def test_every_controlled_enum_value_is_schema_valid(self):
        validator = jsonschema.Draft202012Validator(self.schema)

        def accepted(project):
            self.assertEqual(list(validator.iter_errors(project)), [])

        top_level_enums = {
            "project_type": self.schema["properties"]["project_type"]["enum"],
            "primary_category": self.schema["$defs"]["category"]["enum"],
            "maturity": self.schema["properties"]["maturity"]["enum"],
            "availability": self.schema["properties"]["availability"]["enum"],
            "qrl_relationship": self.schema["properties"]["qrl_relationship"]["enum"],
            "source_availability": self.schema["properties"]["source_availability"]["enum"],
        }
        for field, values in top_level_enums.items():
            for value in values:
                with self.subTest(field=field, value=value):
                    project = self.base_project()
                    project[field] = value
                    accepted(project)

        for capability in self.schema["$defs"]["capability"]["enum"]:
            with self.subTest(field="capability", value=capability):
                project = self.base_project()
                project["capabilities"] = [capability]
                accepted(project)

        for platform in self.schema["$defs"]["platform"]["enum"]:
            with self.subTest(field="platform", value=platform):
                project = self.base_project()
                project["platforms"] = [platform]
                accepted(project)

        for maintenance in self.schema["properties"]["maintenance"]["enum"]:
            project = self.base_project()
            project["maintenance"] = maintenance
            accepted(project)

        nested_enums = (
            ("repository", "role"),
            ("link", "type"),
            ("deployment", "network"),
            ("deployment", "operational_state"),
            ("deployment", "source_verification"),
            ("deployment_identifier", "type"),
            ("security_review", "remediation_status"),
            ("evidence", "type"),
            ("relationship", "type"),
            ("asset", "type"),
        )
        for definition, field in nested_enums:
            values = self.schema["$defs"][definition]["properties"][field]["enum"]
            self.assertEqual(len(values), len(set(values)), f"duplicate {definition}.{field} enum")

    def test_schema_and_classification_are_in_sync(self):
        self.assertEqual(validate_projects.validate_metadata(self.classification, self.schema), [])
        altered = copy.deepcopy(self.schema)
        altered["version"] = 5
        self.assertTrue(validate_projects.validate_metadata(self.classification, altered))


if __name__ == "__main__":
    unittest.main()
