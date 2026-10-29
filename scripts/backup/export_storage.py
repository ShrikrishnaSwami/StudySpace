#!/usr/bin/env python3
"""Export private Supabase Storage objects and non-secret Auth user metadata.

All downloaded content is intended to be encrypted immediately by the calling
workflow. Never upload this directory or its contents unencrypted.
"""
from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path, PurePosixPath

BASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
BUCKETS = [x.strip() for x in os.getenv(
    "STORAGE_BUCKETS", "assignment-files,assignment-submissions,homework"
).split(",") if x.strip()]
OUTPUT = Path(os.getenv("BACKUP_WORKDIR", "backup-work")).resolve()
STORAGE_DIR = OUTPUT / "storage"
PAGE_SIZE = 100


def request(url: str, *, method: str = "GET", payload: dict | None = None, retries: int = 4) -> bytes:
    body = json.dumps(payload).encode() if payload is not None else None
    headers = {
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Accept": "application/json" if payload is not None or "/admin/users" in url or "/object/list/" in url else "*/*",
        "User-Agent": "StudySpace-Offsite-Backup/1.0",
    }
    if body is not None:
        headers["Content-Type"] = "application/json"
    for attempt in range(retries):
        req = urllib.request.Request(url, data=body, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=120) as response:
                return response.read()
        except (urllib.error.URLError, TimeoutError) as exc:
            if attempt == retries - 1:
                raise RuntimeError(f"Supabase export request failed after {retries} attempts: {type(exc).__name__}") from exc
            time.sleep(2 ** attempt)
    raise RuntimeError("Unreachable request retry state")


def safe_relative_path(value: str) -> Path:
    path = PurePosixPath(value)
    if path.is_absolute() or not value or any(part in ("", ".", "..") for part in path.parts):
        raise RuntimeError("Storage API returned an unsafe object path; refusing to write outside backup directory")
    return Path(*path.parts)


def list_objects(bucket: str, prefix: str = "") -> list[dict]:
    found: list[dict] = []
    offset = 0
    while True:
        url = f"{BASE_URL}/storage/v1/object/list/{urllib.parse.quote(bucket, safe='')}"
        raw = request(url, method="POST", payload={
            "prefix": prefix,
            "limit": PAGE_SIZE,
            "offset": offset,
            "sortBy": {"column": "name", "order": "asc"},
        })
        try:
            batch = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise RuntimeError(f"Storage list response was not JSON for bucket {bucket}") from exc
        if not isinstance(batch, list):
            raise RuntimeError(f"Storage list response had an unexpected shape for bucket {bucket}")
        found.extend(batch)
        if len(batch) < PAGE_SIZE:
            break
        offset += len(batch)
    return found


def export_folder(bucket: str, prefix: str, bucket_root: Path, counts: dict[str, int]) -> None:
    for item in list_objects(bucket, prefix):
        name = item.get("name")
        if not isinstance(name, str) or not name or name in (".", "..") or "/" in name:
            raise RuntimeError(f"Storage list returned an unexpected entry in bucket {bucket}")
        object_path = f"{prefix}/{name}" if prefix else name
        metadata = item.get("metadata")
        is_file = item.get("id") is not None or isinstance(metadata, dict)
        if not is_file:
            export_folder(bucket, object_path, bucket_root, counts)
            continue
        relative = safe_relative_path(object_path)
        destination = bucket_root / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        encoded = urllib.parse.quote(object_path, safe="/")
        url = f"{BASE_URL}/storage/v1/object/{urllib.parse.quote(bucket, safe='')}/{encoded}"
        destination.write_bytes(request(url))
        counts["objects"] += 1
        counts["bytes"] += destination.stat().st_size


def export_auth_users(destination: Path) -> int:
    users: list[dict] = []
    page = 1
    while True:
        url = f"{BASE_URL}/auth/v1/admin/users?page={page}&per_page=100"
        raw = request(url)
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise RuntimeError("Auth admin users response was not JSON") from exc
        batch = payload.get("users") if isinstance(payload, dict) else None
        if not isinstance(batch, list):
            raise RuntimeError("Auth admin users response had an unexpected shape")
        for user in batch:
            # Do not export tokens, identities' access tokens, or session secrets.
            users.append({
                key: user.get(key)
                for key in (
                    "id", "aud", "role", "email", "phone", "created_at",
                    "updated_at", "email_confirmed_at", "phone_confirmed_at",
                    "last_sign_in_at", "app_metadata", "user_metadata",
                    "is_anonymous", "banned_until",
                )
                if key in user
            })
        if len(batch) < 100:
            break
        page += 1
    destination.write_text(json.dumps({"users": users}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return len(users)


def main() -> int:
    if not BASE_URL.startswith("https://"):
        raise RuntimeError("SUPABASE_URL must use HTTPS")
    OUTPUT.mkdir(parents=True, exist_ok=True)
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    summary = {"bucket_count": len(BUCKETS), "buckets": {}, "auth_users": 0}
    for bucket in BUCKETS:
        root = STORAGE_DIR / bucket
        root.mkdir(parents=True, exist_ok=True)
        counts = {"objects": 0, "bytes": 0}
        print(f"Exporting private bucket: {bucket}")
        export_folder(bucket, "", root, counts)
        summary["buckets"][bucket] = counts
        print(f"Exported {counts['objects']} objects ({counts['bytes']} bytes) from {bucket}")
    summary["auth_users"] = export_auth_users(OUTPUT / "auth-users.json")
    (OUTPUT / "export-summary.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    print(f"Exported metadata for {summary['auth_users']} Auth users (passwords and sessions are not exportable).")
    print("Export completed. The workflow must encrypt this directory before uploading it.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"BACKUP EXPORT FAILED: {exc}", file=sys.stderr)
        raise SystemExit(1)
