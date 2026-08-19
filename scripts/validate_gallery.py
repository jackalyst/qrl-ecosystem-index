#!/usr/bin/env python3
"""Validate project gallery metadata and local image assets."""

from __future__ import annotations

import re
import struct
import sys
from pathlib import Path, PurePosixPath
from typing import Any

import yaml


MAX_GALLERY_ITEMS = 10
MAX_SCREENSHOT_BYTES = 2 * 1024 * 1024
MAX_IMAGE_PIXELS = 10_000_000
MAX_CAPTION_LENGTH = 160
SUPPORTED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
YOUTUBE_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{11}$")


def image_dimensions(path: Path, data: bytes) -> tuple[int, int] | None:
    if path.suffix == ".png":
        if len(data) < 24 or data[:8] != b"\x89PNG\r\n\x1a\n":
            return None
        return struct.unpack(">II", data[16:24])
    if path.suffix == ".webp":
        if len(data) < 30 or data[:4] != b"RIFF" or data[8:12] != b"WEBP":
            return None
        chunk = data[12:16]
        if chunk == b"VP8X":
            return 1 + int.from_bytes(data[24:27], "little"), 1 + int.from_bytes(data[27:30], "little")
        if chunk == b"VP8L" and data[20] == 0x2F:
            bits = int.from_bytes(data[21:25], "little")
            return (bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1
        if chunk == b"VP8 " and data[23:26] == b"\x9d\x01\x2a":
            return int.from_bytes(data[26:28], "little") & 0x3FFF, int.from_bytes(data[28:30], "little") & 0x3FFF
        return None
    if path.suffix in {".jpg", ".jpeg"}:
        if len(data) < 4 or data[:2] != b"\xff\xd8":
            return None
        offset = 2
        while offset + 9 < len(data):
            if data[offset] != 0xFF:
                offset += 1
                continue
            marker = data[offset + 1]
            if marker in {0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF}:
                return int.from_bytes(data[offset + 5 : offset + 7], "big"), int.from_bytes(data[offset + 7 : offset + 9], "big")
            if marker in {0xD8, 0xD9}:
                offset += 2
                continue
            length = int.from_bytes(data[offset + 2 : offset + 4], "big")
            if length < 2:
                return None
            offset += 2 + length
        return None
    return None


def metadata_is_clean(path: Path, data: bytes) -> bool:
    if path.suffix == ".png":
        return not any(chunk in data for chunk in (b"eXIf", b"tEXt", b"zTXt", b"iTXt"))
    if path.suffix == ".webp":
        return b"EXIF" not in data and b"XMP " not in data
    return b"Exif\x00\x00" not in data and b"http://ns.adobe.com/xap/1.0/" not in data


def validate_gallery(
    yaml_path: Path, data: dict[str, Any], repository_root: Path
) -> list[str]:
    gallery = data.get("gallery")
    if gallery is None:
        return []

    errors: list[str] = []
    if not isinstance(gallery, list):
        return [f"{yaml_path}: gallery must be a list"]
    if not 1 <= len(gallery) <= MAX_GALLERY_ITEMS:
        errors.append(
            f"{yaml_path}: gallery must contain between 1 and {MAX_GALLERY_ITEMS} entries"
        )

    project_id = data.get("id")
    seen_paths: set[str] = set()
    seen_youtube_ids: set[str] = set()

    for index, item in enumerate(gallery):
        label = f"gallery[{index}]"
        if not isinstance(item, dict):
            errors.append(f"{yaml_path}: {label} must be an object")
            continue

        caption = item.get("caption")
        if not isinstance(caption, str) or not caption.strip():
            errors.append(f"{yaml_path}: {label}.caption is required")
        elif len(caption) > MAX_CAPTION_LENGTH:
            errors.append(
                f"{yaml_path}: {label}.caption exceeds {MAX_CAPTION_LENGTH} characters"
            )
        elif "\n" in caption or "\r" in caption:
            errors.append(f"{yaml_path}: {label}.caption must be a single line")

        item_type = item.get("type")
        if item_type == "youtube":
            unexpected = set(item) - {"type", "id", "caption"}
            if unexpected:
                errors.append(
                    f"{yaml_path}: {label} has unsupported field(s): {', '.join(sorted(unexpected))}"
                )

            video_id = item.get("id")
            if not isinstance(video_id, str) or not video_id:
                errors.append(f"{yaml_path}: {label}.id is required")
            elif not YOUTUBE_ID_PATTERN.fullmatch(video_id):
                errors.append(
                    f"{yaml_path}: {label}.id must be an 11-character YouTube video ID, not a URL: {video_id}"
                )
            elif video_id in seen_youtube_ids:
                errors.append(f"{yaml_path}: {label}.id is duplicated: {video_id}")
            else:
                seen_youtube_ids.add(video_id)
            continue

        if item_type != "image":
            errors.append(
                f"{yaml_path}: {label}.type must be either 'image' or 'youtube'"
            )
            continue

        unexpected = set(item) - {"type", "path", "caption"}
        if unexpected:
            errors.append(
                f"{yaml_path}: {label} has unsupported field(s): {', '.join(sorted(unexpected))}"
            )

        screenshot_path = item.get("path")
        if not isinstance(screenshot_path, str) or not screenshot_path:
            errors.append(f"{yaml_path}: {label}.path is required")
            continue
        if screenshot_path in seen_paths:
            errors.append(f"{yaml_path}: {label}.path is duplicated: {screenshot_path}")
            continue
        seen_paths.add(screenshot_path)

        if screenshot_path.startswith(("http://", "https://", "//")):
            errors.append(
                f"{yaml_path}: {label}.path must be local, not a URL: {screenshot_path}"
            )
            continue
        if "\\" in screenshot_path:
            errors.append(
                f"{yaml_path}: {label}.path must use forward slashes: {screenshot_path}"
            )
            continue

        relative_path = PurePosixPath(screenshot_path)
        if relative_path.is_absolute() or any(
            part in {"", ".", ".."} for part in relative_path.parts
        ):
            errors.append(
                f"{yaml_path}: {label}.path must not be absolute or traverse directories: {screenshot_path}"
            )
            continue
        if len(relative_path.parts) != 2 or relative_path.parts[0] != project_id:
            errors.append(
                f"{yaml_path}: {label}.path must be inside '{project_id}/': {screenshot_path}"
            )
            continue
        if relative_path.suffix not in SUPPORTED_EXTENSIONS:
            errors.append(
                f"{yaml_path}: {label}.path must use a lowercase PNG, JPEG, or WebP extension: {screenshot_path}"
            )
            continue

        full_path = repository_root / "images" / "screenshots" / Path(*relative_path.parts)
        if not full_path.is_file():
            errors.append(
                f"{yaml_path}: {label} file not found: {screenshot_path} (expected at {full_path})"
            )
            continue
        if full_path.stat().st_size > MAX_SCREENSHOT_BYTES:
            errors.append(
                f"{yaml_path}: {label} exceeds the 2 MB file-size limit: {screenshot_path}"
            )
            continue
        image_data = full_path.read_bytes()
        dimensions = image_dimensions(full_path, image_data)
        if not dimensions:
            errors.append(
                f"{yaml_path}: {label} contents do not match its extension: {screenshot_path}"
            )
        elif dimensions[0] * dimensions[1] > MAX_IMAGE_PIXELS:
            errors.append(
                f"{yaml_path}: {label} exceeds the 10 megapixel limit: {screenshot_path}"
            )
        if not metadata_is_clean(full_path, image_data):
            errors.append(
                f"{yaml_path}: {label} contains embedded EXIF, XMP, or text metadata: {screenshot_path}"
            )

    return errors


def project_yaml_files(repository_root: Path):
    return (
        yaml_file
        for yaml_file in (repository_root / "projects").rglob("*.yaml")
        if yaml_file.name != "template.yaml"
    )


def main() -> int:
    repository_root = Path(__file__).resolve().parent.parent
    errors: list[str] = []

    for yaml_file in project_yaml_files(repository_root):
        with yaml_file.open() as file:
            data = yaml.safe_load(file) or {}
        errors.extend(validate_gallery(yaml_file, data, repository_root))

    if errors:
        print("GALLERY VALIDATION ERRORS:")
        print("\n".join(f"  - {error}" for error in errors))
        return 1

    print("All project galleries are valid.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
