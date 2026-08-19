#!/usr/bin/env python3
"""Render hostile Markdown and confirm Hugo/Goldmark does not emit executable HTML."""

from __future__ import annotations

import subprocess
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FIXTURE_CONTENT = ROOT / "tests" / "fixtures" / "hugo-content"
SAFE_MARKER = "Safe fixture marker: ordinary Markdown must remain visible."
FORBIDDEN = (
    "<iframe",
    "fixturescriptexecuted",
    "fixtureimageexecuted",
    "fixturesvgexecuted",
    "onerror=",
    "onload=",
    "javascript:",
    "data:text/html",
    "attacker.invalid",
)


def main() -> int:
    with tempfile.TemporaryDirectory(prefix="qrl-markdown-safety-") as directory:
        destination = Path(directory)
        result = subprocess.run(
            [
                "hugo",
                "--source",
                str(ROOT / "website"),
                "--contentDir",
                str(FIXTURE_CONTENT),
                "--destination",
                str(destination),
                "--cleanDestinationDir",
            ],
            check=False,
            capture_output=True,
            text=True,
        )
        if result.returncode:
            print(result.stdout, end="")
            print(result.stderr, end="", file=sys.stderr)
            return result.returncode

        output = destination / "malicious-markdown-fixture" / "index.html"
        if not output.is_file():
            print(f"Markdown safety fixture did not render: {output}", file=sys.stderr)
            return 1
        html = output.read_text(encoding="utf-8")
        lowered = html.lower()
        errors = [value for value in FORBIDDEN if value in lowered]
        if SAFE_MARKER not in html:
            errors.append("safe Markdown marker is missing")
        if errors:
            print("MARKDOWN SAFETY VALIDATION ERRORS:", file=sys.stderr)
            for error in errors:
                print(f"  - rendered output contains {error}", file=sys.stderr)
            return 1

    print("Unsafe raw HTML and executable Markdown links are suppressed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
