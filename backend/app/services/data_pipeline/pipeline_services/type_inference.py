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
_YEAR_MIN = 1800
_YEAR_MAX = 2200
_MIN_CONFIDENCE = 0.8
_BOOL_THRESHOLD = 0.95
_DATETIME_THRESHOLD = 0.8


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
    best_rate = 0.0
    for fmt in _DATE_CANDIDATES:
        parsed = pd.to_datetime(values, errors="coerce", format=fmt)
        rate = float(parsed.notna().mean())
        if rate > best_rate:
            best_rate = rate
    return best_rate


def _is_year_like(series: pd.Series) -> bool:
    # Detect year-like numeric columns (integer-ish values in a year range).
    values = series.dropna().astype(str).str.strip()
    if values.empty:
        return False
    numeric = pd.to_numeric(values, errors="coerce").dropna()
    if numeric.empty:
        return False
    integer_like = (numeric.round(0) - numeric).abs() <= 1e-9
    integer_rate = float(integer_like.mean())
    in_range = numeric.between(_YEAR_MIN, _YEAR_MAX)
    range_rate = float(in_range.mean())
    return integer_rate >= 0.95 and range_rate >= 0.95


def _infer_type(series: pd.Series) -> Dict[str, Any]:
    # Checks which type fits best and returns confidence scores for each type (based on cosine similarity)
    numeric_rate = _try_numeric(series)
    datetime_rate = 0.0
    if numeric_rate < 0.95:
        datetime_rate = _try_datetime(series)
    elif not _is_year_like(series):
        datetime_rate = 0.0

    bool_rate = _try_bool(series)
    if bool_rate < _BOOL_THRESHOLD:
        bool_rate = 0.0
    if datetime_rate < _DATETIME_THRESHOLD:
        datetime_rate = 0.0

    rates = {
        "boolean": bool_rate,
        "numeric": numeric_rate,
        "datetime": datetime_rate,
    }

    inferred = max(rates.items(), key=lambda item: item[1])
    inferred_type, confidence = inferred

    if confidence < _MIN_CONFIDENCE:
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
