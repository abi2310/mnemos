from __future__ import annotations

from typing import Any, Dict, List
import re
import unicodedata

import pandas as pd

PipelineContext = Dict[str, Any]


def _normalize_text(value: Any) -> str:
    # Normalize string with safe, limited transformations (whitespace/control/NFKC).
    if value is None or pd.isna(value):
        return ""
    text = str(value)
    text = unicodedata.normalize("NFKC", text)
    text = re.sub(r"[\t\r\n]+", " ", text)
    text = text.strip()
    text = re.sub(r"\s{2,}", " ", text)
    return text


def _text_inconsistencies(series: pd.Series) -> Dict[str, Any]:
    # Detect case/whitespace inconsistencies in string-like columns.
    normalized = series.dropna().map(_normalize_text)
    if normalized.empty:
        return {"inconsistent_values": {}}

    counts = normalized.value_counts()
    inconsistencies = {}
    for norm_value, count in counts.items():
        originals = series[normalized == norm_value].dropna().astype(str).unique().tolist()
        if len(originals) > 1:
            inconsistencies[norm_value] = {"variants": originals, "count": int(count)}

    return {"inconsistent_values": inconsistencies}


def run(context: PipelineContext) -> PipelineContext:
    # Detect text inconsistencies, then attach results.
    df = context.get("dataframe")
    if df is None:
        raise ValueError("Inconsistencies requires 'dataframe' in context.")

    text_columns = [col for col in df.columns if df[col].dtype == object]

    column_inconsistencies = {}
    for column in text_columns:
        column_inconsistencies[str(column)] = _text_inconsistencies(df[column])

    context = dict(context)
    context["inconsistencies"] = {
        "text_inconsistencies": column_inconsistencies,
    }
    return context
