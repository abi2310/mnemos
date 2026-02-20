from __future__ import annotations

from dataclasses import dataclass
import importlib
import logging
from typing import Any, Callable, Dict, List, Optional

PipelineContext = Dict[str, Any]
PipelineHandler = Callable[[PipelineContext], Optional[PipelineContext]]

BASE_SERVICE_PATH = "app.services.data_pipeline.pipeline_services"
logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class PipelineStep:
    name: str
    handler: PipelineHandler


class DataQualityPipeline:
    def __init__(self, steps: List[PipelineStep]):
        # Store the ordered pipeline steps
        self._steps = steps

    def run(self, context: PipelineContext) -> PipelineContext:
        # Run each step sequentially, allowing handlers to replace the context
        current = context
        for step in self._steps:
            logger.info("data_pipeline.start_step %s", step.name)
            result = step.handler(current)
            if result is not None:
                current = result
            logger.info("data_pipeline.end_step %s", step.name)
        return current


def _missing_handler(step_name: str, module_path: str, func_name: str) -> PipelineHandler:
    # Catches Pipeline errors
    def _handler(_: PipelineContext) -> PipelineContext:
        raise NotImplementedError(
            f"Pipeline step '{step_name}' not implemented. "
            f"Expected handler '{module_path}.{func_name}'."
        )

    return _handler


def _load_handler(step_name: str, module_path: str, func_name: str = "run") -> PipelineHandler:
    # Load the step handler from its module, or return a missing handler
    try:
        module = importlib.import_module(module_path)
    except Exception:
        return _missing_handler(step_name, module_path, func_name)

    handler = getattr(module, func_name, None)
    if handler is None:
        return _missing_handler(step_name, module_path, func_name)

    return handler


def build_default_pipeline() -> DataQualityPipeline:
    # Build the default pipeline steps in order
    steps = [
        PipelineStep("ingestion", _load_handler("ingestion", f"{BASE_SERVICE_PATH}.ingest")),
        PipelineStep("header_detection", _load_handler("header_detection", f"{BASE_SERVICE_PATH}.header_detection"),),
        PipelineStep("schema_check", _load_handler("schema_check", f"{BASE_SERVICE_PATH}.schema_check")),
        PipelineStep("missing_values", _load_handler("missing_values", f"{BASE_SERVICE_PATH}.missing_values")),
        PipelineStep("type_inference", _load_handler("type_inference", f"{BASE_SERVICE_PATH}.type_inference")),
        PipelineStep("inconsistencies", _load_handler("inconsistencies", f"{BASE_SERVICE_PATH}.inconsistencies")),
        # Not Implemented yet: PipelineStep("outlier_analysis", _load_handler("outlier_analysis", f"{BASE_SERVICE_PATH}.outlier_analysis"),),
        PipelineStep("quality_report", _load_handler("quality_report", f"{BASE_SERVICE_PATH}.quality_report"),)
    ]
    return DataQualityPipeline(steps)
