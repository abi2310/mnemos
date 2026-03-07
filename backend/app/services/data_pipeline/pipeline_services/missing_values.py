from __future__ import annotations

from typing import Any, Dict, List

import pandas as pd

PipelineContext = Dict[str, Any]

_MISSING_TOKENS = [
    "",
    "na",
    "n/a",
    "null",
    "none",
    "nan",
    "nil",
    "-",
]


def _normalize_missing_tokens(df: pd.DataFrame, tokens: List[str]) -> pd.DataFrame:
    # Replace common missing-value tokens with actual NaN values.
    lowered_tokens = {token.lower() for token in tokens}
    normalized = df.copy()

    def _to_missing(value: Any) -> Any:
        if value is None:
            return pd.NA
        text = str(value).strip().lower()
        if text in lowered_tokens:
            return pd.NA
        return value

    return normalized.map(_to_missing)


def _missing_stats(df: pd.DataFrame) -> Dict[str, Any]:
    # Calculate missing counts and rates per column and overall.
    missing_counts = df.isna().sum()
    total_cells = int(df.shape[0] * df.shape[1]) if df.shape[0] and df.shape[1] else 0
    total_missing = int(missing_counts.sum())

    per_column = {}
    for column, count in missing_counts.items():
        per_column[str(column)] = {
            "missing_count": int(count),
            "missing_rate": float(count / df.shape[0]) if df.shape[0] else 0.0,
        }

    overall_rate = float(total_missing / total_cells) if total_cells else 0.0

    return {
        "total_missing": total_missing,
        "total_cells": total_cells,
        "missing_rate": overall_rate,
        "per_column": per_column,
    }


def _drop_all_missing_rows(df: pd.DataFrame) -> tuple[pd.DataFrame, int, int, int]:
    # Remove rows where all columns are missing after token normalization.
    rows_before = int(df.shape[0])
    cleaned = df.dropna(axis=0, how="all")
    rows_after = int(cleaned.shape[0])
    removed = rows_before - rows_after
    return cleaned, removed, rows_before, rows_after


def run(context: PipelineContext) -> PipelineContext:
    # Standardize missing tokens to NaN and attach missing stats.
    df = context.get("dataframe")
    if df is None:
        raise ValueError("Missing values requires 'dataframe' in context.")

    normalized = _normalize_missing_tokens(df, _MISSING_TOKENS)
    cleaned_df, removed_rows, rows_before, rows_after = _drop_all_missing_rows(normalized)
    stats = _missing_stats(cleaned_df)

    context = dict(context)
    context["dataframe"] = cleaned_df
    context["missing_values"] = {
        "tokens": _MISSING_TOKENS,
        "rows_all_missing_removed": removed_rows,
        "row_count_before": rows_before,
        "row_count_after": rows_after,
        "stats": stats,
    }
    return context
