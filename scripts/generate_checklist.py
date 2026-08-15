#!/usr/bin/env python3
"""Export Hisab Pune's checklist owner to the standard generated view."""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
from datetime import datetime, timezone
from pathlib import Path
from types import ModuleType


ROOT = Path(__file__).resolve().parents[1]
CONTROL_PATH = ROOT / ".session/checklist/checklist.json"
STATE_PATH = ROOT / ".session/checklist/state.json"
TESTING_PATH = ROOT / ".session/testing/testing-ledger.json"
RENDERER_PATH = Path.home() / ".agents/skills/checklist-framework/scripts/render_checklist.py"
STATUSES = (
    "pending", "in_progress", "testing", "partial", "blocked", "complete",
    "deferred", "not_required", "review",
)
OPEN_STATUSES = {"pending", "in_progress", "testing", "partial", "blocked", "review"}
REQUIRED_CONTROL = {
    "schema_version", "project", "title", "warning", "current_blocker",
    "next_action", "focus_items", "areas", "items",
}
REQUIRED_ITEM = {
    "id", "gate", "item", "status_code", "status", "responsible_owner",
    "priority", "evidence_scope",
}
GATES = {
    "G2": {
        "id": "G2-T1",
        "title": "Frozen-source release gate",
        "kind": "release",
        "status_code": "pending",
        "blocks_completion": True,
        "criteria": [
            "testing-framework release gate passes on the checklist source revision.",
        ],
        "procedure": [
            "Freeze the product source, run hisab-pune npm run ci, and retain the receipt.",
        ],
        "evidence_required": [
            "Current-source testing-framework receipt or .session/testing/testing-ledger.json pass.",
        ],
    }
}


def atomic_write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(f"{path.suffix}.tmp")
    temporary.write_text(content, encoding="utf-8")
    temporary.replace(path)


def load_control() -> dict[str, object]:
    control = json.loads(CONTROL_PATH.read_text(encoding="utf-8"))
    if not isinstance(control, dict):
        raise ValueError("checklist.json must contain an object")
    missing = REQUIRED_CONTROL - control.keys()
    if missing:
        raise ValueError(f"checklist.json missing: {sorted(missing)}")
    if control["schema_version"] != "checklist-control.v1":
        raise ValueError("checklist.json schema_version must be checklist-control.v1")
    items = control["items"]
    if not isinstance(items, list):
        raise ValueError("checklist.json items must be an array")
    ids: set[str] = set()
    for index, item in enumerate(items):
        if not isinstance(item, dict):
            raise ValueError(f"items[{index}] must be an object")
        missing = REQUIRED_ITEM - item.keys()
        if missing:
            raise ValueError(f"items[{index}] missing: {sorted(missing)}")
        item_id = item["id"]
        if not isinstance(item_id, str) or not item_id:
            raise ValueError(f"items[{index}] id must be a non-empty string")
        if item_id in ids:
            raise ValueError(f"duplicate checklist item id: {item_id}")
        ids.add(item_id)
        if item["status_code"] not in STATUSES:
            raise ValueError(f"items[{index}] has invalid status_code")
        if item["status_code"] in OPEN_STATUSES:
            for field in ("remaining_work", "completion_criteria"):
                value = item.get(field)
                if not isinstance(value, list) or not value or not all(isinstance(entry, str) and entry.strip() for entry in value):
                    raise ValueError(f"items[{index}] open item requires non-empty {field}")
    focus_items = control["focus_items"]
    if not isinstance(focus_items, list) or not focus_items or not all(item_id in ids for item_id in focus_items):
        raise ValueError("focus_items must name existing checklist items")
    areas = control["areas"]
    if not isinstance(areas, list) or not areas:
        raise ValueError("areas must be a non-empty array")
    area_item_ids = [item_id for area in areas for item_id in area.get("items", [])]
    if len(area_item_ids) != len(set(area_item_ids)) or set(area_item_ids) != ids:
        raise ValueError("areas must assign every checklist item exactly once")
    return control


def build_state() -> dict[str, object]:
    control = load_control()
    items = [dict(item) for item in control["items"]]
    active_open = sum(item["status_code"] in OPEN_STATUSES for item in items)
    items.append({
        "id": "G9",
        "gate": "9 · Frozen-source go/no-go decision",
        "item": "Product lead go/no-go decision",
        "status_code": "pending" if active_open else "complete",
        "status": "Not ready — required outcomes remain open." if active_open else "Ready — every required outcome is closed.",
        "priority": "critical",
        "responsible_owner": "Product lead",
        "evidence_scope": "operator",
        **({
            "remaining_work": ["Close every required open item, then record the decision against the frozen release source."],
            "completion_criteria": ["All required items are complete, the current-source testing gate passes, and the product lead records go or no-go."],
            "blocked_by": f"{active_open} required checklist outcomes remain open.",
        } if active_open else {
            "completed_evidence": ["All required checklist outcomes are closed."],
            "evidence_refs": [".session/checklist/checklist.json"],
        }),
    })
    areas = [dict(area) for area in control["areas"]]
    areas.append({"id": "decision", "label": "9 · Frozen-source go/no-go decision", "items": ["G9"]})
    counts = {status: sum(item["status_code"] == status for item in items) for status in STATUSES}
    return {
        "schema_version": "checklist.v1",
        "project": control["project"],
        "title": control["title"],
        "generated_at": datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds"),
        "source_fingerprint": hashlib.sha256(CONTROL_PATH.read_bytes()).hexdigest(),
        "control_owner": ".session/checklist/checklist.json",
        "posture": "not_ready" if active_open else "ready",
        "counts": counts,
        "items": items,
        "focus_items": control["focus_items"],
        "areas": areas,
        "current_blocker": control["current_blocker"],
        "next_action": control["next_action"],
        "warning": control["warning"],
    }


def build_testing(state: dict[str, object]) -> dict[str, object]:
    products = {item["id"]: item["status_code"] for item in state["items"]}
    links = []
    for checklist_id, gate in GATES.items():
        if checklist_id not in products:
            raise ValueError(f"testing gate names unknown checklist item: {checklist_id}")
        links.append({
            "checklist_id": checklist_id,
            "product_status": products[checklist_id],
            "gates": [dict(gate)],
        })
    return {
        "schema_version": "testing-ledger.v1",
        "generated_at": state["generated_at"],
        "source_fingerprint": state["source_fingerprint"],
        "checklist_links": links,
    }


def load_renderer() -> ModuleType:
    spec = importlib.util.spec_from_file_location("checklist_framework_renderer", RENDERER_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load global checklist renderer: {RENDERER_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def substantive(value: dict[str, object]) -> dict[str, object]:
    return {key: item for key, item in value.items() if key != "generated_at"}


def generate() -> None:
    renderer = load_renderer()
    state = build_state()
    testing = build_testing(state)
    renderer.validate(state)
    renderer.validate_testing(state, testing)
    atomic_write(STATE_PATH, json.dumps(state, ensure_ascii=False, indent=2) + "\n")
    atomic_write(TESTING_PATH, json.dumps(testing, ensure_ascii=False, indent=2) + "\n")
    renderer.write(ROOT)


def check_current() -> None:
    renderer = load_renderer()
    expected_state = build_state()
    expected_testing = build_testing(expected_state)
    actual_state = json.loads(STATE_PATH.read_text(encoding="utf-8"))
    actual_testing = json.loads(TESTING_PATH.read_text(encoding="utf-8"))
    if substantive(actual_state) != substantive(expected_state):
        raise ValueError("Checklist state is stale; run python3 scripts/generate_checklist.py")
    if substantive(actual_testing) != substantive(expected_testing):
        raise ValueError("Testing ledger is stale; run python3 scripts/generate_checklist.py")
    renderer.check_current(ROOT)


def self_check() -> None:
    state = build_state()
    testing = build_testing(state)
    renderer = load_renderer()
    renderer.validate(state)
    renderer.validate_testing(state, testing)
    assert state["control_owner"] == ".session/checklist/checklist.json"
    assert len({item["id"] for item in state["items"]}) == len(state["items"])


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check-current", action="store_true")
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    if args.check:
        self_check()
        print("checklist exporter self-check passed")
    elif args.check_current:
        check_current()
        print("checklist state and HTML match checklist.json")
    else:
        generate()
        print(STATE_PATH)
        print(TESTING_PATH)
        print(ROOT / ".session/html/checklist.html")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
