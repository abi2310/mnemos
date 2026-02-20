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
    text = text.lower()
    text = re.sub(r"[\t\r\n]+", " ", text)
    text = text.strip()
    text = re.sub(r"\s{2,}", " ", text)
    return text


def _text_inconsistencies(series: pd.Series) -> Dict[str, Any]:
    # Detect case/whitespace inconsistencies in string-like columns.
    normalized = series.map(_normalize_text)
    if normalized.dropna().empty:
        return {"inconsistent_values": {}}

    inconsistencies = {}
    data = pd.DataFrame({"normalized": normalized, "original": series})
    data = data[data["normalized"] != ""].dropna(subset=["original"])
    for norm_value, group in data.groupby("normalized")["original"]:
        variants = group.astype(str).unique().tolist()
        if len(variants) > 1:
            inconsistencies[norm_value] = {
                "variants": variants,
                "count": int(len(group)),
            }

    return {"inconsistent_values": inconsistencies}


def run(context: PipelineContext) -> PipelineContext:
    # Detect text inconsistencies, then attach results.
    df = context.get("dataframe")
    if df is None:
        raise ValueError("Inconsistencies requires 'dataframe' in context.")

    inferred = context.get("type_inference", {}).get("columns", {})
    text_columns = [
        col
        for col in df.columns
        if inferred.get(str(col), {}).get("inferred_type") == "string"
    ]

    column_inconsistencies = {}
    for column in text_columns:
        column_inconsistencies[str(column)] = _text_inconsistencies(df[column])

    context = dict(context)
    context["inconsistencies"] = {
        "text_inconsistencies": column_inconsistencies,
    }
    return context
