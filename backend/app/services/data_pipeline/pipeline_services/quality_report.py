from __future__ import annotations

import io
import json
from datetime import datetime, timezone
from typing import Any, Dict

from app.core.config import get_settings
from app.services.storage import StorageService

PipelineContext = Dict[str, Any]

# API Endpoint: @router.get("/datasets/{dataset_id}/quality-report"

def _build_report(context: PipelineContext) -> Dict[str, Any]:
    # Aggregate outputs from pipeline steps into a single report payload.
    return {
        "dataset_id": context.get("dataset_id"),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "ingestion": context.get("ingestion"),
        "header_detection": context.get("header_detection"),
        "schema_check": context.get("schema_check"),
        "missing_values": context.get("missing_values"),
        "type_inference": context.get("type_inference"),
        "inconsistencies": context.get("inconsistencies"),
        "outlier_analysis": context.get("outlier_analysis"),
    }


def _resolve_storage(context: PipelineContext) -> StorageService:
    storage = context.get("storage")
    if storage is None:
        storage_dir = context.get("storage_dir")
        if storage_dir is None:
            settings = get_settings()
            storage_dir = settings.storage_dir
        storage = StorageService(storage_dir)
    return storage


def run(context: PipelineContext) -> PipelineContext:
    # Write the aggregated quality report to storage and attach metadata.
    dataset_id = context.get("dataset_id")
    if not dataset_id:
        raise ValueError("Quality report requires 'dataset_id' in context.")

    report = _build_report(context)
    payload = json.dumps(report, ensure_ascii=True, indent=2).encode("utf-8")

    storage = _resolve_storage(context)
    report_key = f"datasets/{dataset_id}/quality_report.json"
    storage.save(report_key, io.BytesIO(payload))

    context = dict(context)
    context["quality_report"] = {
        "storage_key": report_key,
        "report": report,
    }
    return context
