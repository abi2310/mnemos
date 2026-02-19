from __future__ import annotations

import re
from typing import Any, Dict, List, Tuple

import pandas as pd

PipelineContext = Dict[str, Any]

_NUMERIC_RE = re.compile(r"^\s*-?\d+(\.\d+)?\s*$")


def _looks_like_header(names: List[str]) -> bool:
    # If most names are non-numeric and not "unnamed", assume header
    if not names:
        return False

    non_header_like = 0
    for name in names:
        lowered = str(name).strip().lower()
        if lowered == "" or lowered.startswith("unnamed"):
            non_header_like += 1
            continue
        if _NUMERIC_RE.match(lowered):
            non_header_like += 1

    return non_header_like < max(1, int(len(names) * 0.6))


def _normalize_name(name: str) -> str:
    # Normalize column names to lowercase snake-like tokens
    lowered = str(name).strip().lower()
    lowered = re.sub(r"\s+", "_", lowered)
    lowered = re.sub(r"[^a-z0-9_]", "_", lowered)
    lowered = re.sub(r"_+", "_", lowered)
    return lowered.strip("_")


def _generate_default_names(count: int) -> List[str]:
    # Generate default column names like col1, col2, if there is no header
    return [f"col{i + 1}" for i in range(count)]


def _apply_no_header(df: pd.DataFrame) -> Tuple[pd.DataFrame, List[str]]:
    # Move the current column names into the first row and generate new headers
    new_columns = _generate_default_names(len(df.columns))
    first_row = pd.DataFrame([list(df.columns)], columns=new_columns)
    updated_df = pd.concat([first_row, df], ignore_index=True)
    updated_df.columns = new_columns
    return updated_df, new_columns


def run(context: PipelineContext) -> PipelineContext:
    # Decides which method to call
    df = context.get("dataframe")
    if df is None:
        raise ValueError("Header detection requires 'dataframe' in context.")

    original_names = [str(name) for name in df.columns]
    has_header = _looks_like_header(original_names)

    if not has_header:
        df, header_names = _apply_no_header(df)
        normalized_names = header_names
    else:
        normalized_names = [_normalize_name(name) for name in original_names]
        df = df.copy()
        df.columns = normalized_names

    context = dict(context)
    context["dataframe"] = df
    context["header_detection"] = {
        "used_first_row_as_header": bool(has_header),
        "original_column_names": original_names,
        "normalized_column_names": normalized_names,
    }
    return context
