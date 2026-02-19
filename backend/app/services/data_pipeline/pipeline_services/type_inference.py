from __future__ import annotations

from typing import Any, Dict, List

import pandas as pd

PipelineContext = Dict[str, Any]

_DATE_CANDIDATES = [
    "%Y-%m-%d",
    "%Y/%m/%d",
    "%d.%m.%Y",
    "%m/%d/%Y",
    "%d/%m/%Y",
    "%Y-%m-%d %H:%M:%S",
    "%Y-%m-%dT%H:%M:%S",
]

_BOOL_TRUE = {"true", "t", "1", "yes", "y"}
_BOOL_FALSE = {"false", "f", "0", "no", "n"}


def _try_bool(series: pd.Series) -> float:
    # Checks if value can be changed to boolean
    values = series.dropna().astype(str).str.strip().str.lower()
    if values.empty:
        return 0.0
    matches = values.isin(_BOOL_TRUE | _BOOL_FALSE)
    return float(matches.mean())


def _try_numeric(series: pd.Series) -> float:
    # Checks if value can be changed to numeric
    values = series.dropna().astype(str).str.strip()
    if values.empty:
        return 0.0
    parsed = pd.to_numeric(values, errors="coerce")
    return float(parsed.notna().mean())


def _try_datetime(series: pd.Series) -> float:
    # Checks if value can be changed to datetime
    values = series.dropna().astype(str).str.strip()
    if values.empty:
        return 0.0
    parsed = pd.to_datetime(values, errors="coerce", infer_datetime_format=True)
    return float(parsed.notna().mean())


def _infer_type(series: pd.Series) -> Dict[str, Any]:
    # Checks which type fits best and returns confidence scores for each type (based on cosine similarity)
    rates = {
        "boolean": _try_bool(series),
        "numeric": _try_numeric(series),
        "datetime": _try_datetime(series),
    }

    inferred = max(rates.items(), key=lambda item: item[1])
    inferred_type, confidence = inferred

    if confidence == 0.0:
        inferred_type = "string"

    return {
        "inferred_type": inferred_type,
        "confidence": float(confidence),
        "rates": rates,
    }


def run(context: PipelineContext) -> PipelineContext:
    # Infer column types and attach per-column inference details.
    df = context.get("dataframe")
    if df is None:
        raise ValueError("Type inference requires 'dataframe' in context.")

    column_types = {}
    for column in df.columns:
        column_types[str(column)] = _infer_type(df[column])

    context = dict(context)
    context["type_inference"] = {"columns": column_types}
    return context
