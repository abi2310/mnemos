from __future__ import annotations

from typing import Any, Dict, List

import pandas as pd

PipelineContext = Dict[str, Any]


def _find_duplicate_columns(columns: List[str]) -> List[str]:
    # Return column names that appear more than once.
    seen = set()
    duplicates = []
    for name in columns:
        if name in seen:
            duplicates.append(name)
        else:
            seen.add(name)
    return sorted(set(duplicates))


def _find_empty_columns(columns: List[str]) -> List[str]:
    # Detect empty or whitespace-only column names.
    return [name for name in columns if str(name).strip() == ""]


def _find_unnamed_columns(columns: List[str]) -> List[str]:
    # Detect common "unnamed" placeholder columns.
    return [name for name in columns if str(name).strip().lower().startswith("unnamed")]


def _find_constant_columns(df: pd.DataFrame) -> List[str]:
    # Detect columns with a single unique value (including NaN).
    constant_cols = []
    for col in df.columns:
        if df[col].nunique(dropna=False) <= 1:
            constant_cols.append(str(col))
    return constant_cols


def run(context: PipelineContext) -> PipelineContext:
    # Check structural issues like duplicate or empty columns and constant columns.
    df = context.get("dataframe")
    if df is None:
        raise ValueError("Schema check requires 'dataframe' in context.")

    columns = [str(name) for name in df.columns]
    duplicate_columns = _find_duplicate_columns(columns)
    empty_columns = _find_empty_columns(columns)
    unnamed_columns = _find_unnamed_columns(columns)
    constant_columns = _find_constant_columns(df)

    context = dict(context)
    context["schema_check"] = {
        "duplicate_columns": duplicate_columns,
        "empty_column_names": empty_columns,
        "unnamed_columns": unnamed_columns,
        "constant_columns": constant_columns,
    }
    return context
