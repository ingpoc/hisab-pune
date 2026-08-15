#!/usr/bin/env python3
"""Freeze HEAD and run the Hisab Pune deterministic testing slice."""

from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "hisab-pune"
GATES_PATH = ROOT / ".agents/skills/hisab-pune-testing/gates.json"
RECEIPT_DIR = ROOT / ".session/testing/receipts"
COMMANDS = (
    ("lint", ["npm", "run", "lint"]),
    ("grade", ["npm", "run", "grade"]),
    ("seed", ["npm", "run", "seed"]),
    ("api", ["npm", "run", "test:api"]),
    ("e2e", ["npm", "run", "test:e2e"]),
)
NOT_PROVEN = (
    "visual vs DESIGN.md",
    "blind UX",
    "accessibility runtime",
    "iOS XCUITest",
    "empty frozen re-review",
)


def run(argv: list[str], cwd: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(argv, cwd=cwd, text=True, capture_output=True)


def git_head() -> str:
    dirty = run(["git", "status", "--porcelain"], ROOT)
    if dirty.returncode != 0:
        raise SystemExit(dirty.stderr)
    if dirty.stdout.strip():
        raise SystemExit("Refuse dirty tree; commit first, then rerun.")
    head = run(["git", "rev-parse", "HEAD"], ROOT)
    if head.returncode != 0:
        raise SystemExit(head.stderr)
    return head.stdout.strip()


def set_gate(owner: dict[str, object], gate_id: str, status: str, evidence: str) -> None:
    for item in owner["items"]:
        for gate in item["gates"]:
            if gate["id"] == gate_id:
                gate["status_code"] = status
                gate["evidence_refs"] = [evidence]
                return
    raise SystemExit(f"unknown gate {gate_id}")


def main() -> int:
    head = git_head()
    fingerprint = hashlib.sha256(head.encode()).hexdigest()
    results = []
    failed = False
    for name, argv in COMMANDS:
        proc = run(argv, APP)
        results.append({
            "name": name,
            "command": argv,
            "exit_code": proc.returncode,
        })
        if proc.returncode != 0:
            failed = True
            sys.stderr.write(proc.stdout)
            sys.stderr.write(proc.stderr)
            break
    receipt = {
        "schema_version": "testing-receipt.v1",
        "kind": "frozen-source-deterministic",
        "git_head": head,
        "source_fingerprint": fingerprint,
        "created_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "passed": [row["name"] for row in results if row["exit_code"] == 0],
        "failed": [row["name"] for row in results if row["exit_code"] != 0],
        "not_proven": list(NOT_PROVEN),
        "empty_iteration": False,
        "commands": results,
    }
    RECEIPT_DIR.mkdir(parents=True, exist_ok=True)
    receipt_path = RECEIPT_DIR / f"{head[:12]}.json"
    receipt_path.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    rel = str(receipt_path.relative_to(ROOT))
    owner = json.loads(GATES_PATH.read_text(encoding="utf-8"))
    set_gate(owner, "G1-T1", "failed" if failed else "passed", rel)
    set_gate(owner, "G2-T1", "failed" if failed else "passed", rel)
    GATES_PATH.write_text(json.dumps(owner, indent=2) + "\n", encoding="utf-8")
    print(rel)
    print(f"git_head={head} failed={failed}")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
