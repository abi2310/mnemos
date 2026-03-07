from __future__ import annotations

import re
from typing import Any, Dict, List, Tuple

import pandas as pd

PipelineContext = Dict[str, Any]

_NUMERIC_RE = re.compile(r"^\s*-?\d+(\.\d+)?\s*$")


def _token_profile(tokens: List[str]) -> Dict[str, float]:
    # Build a simple profile to compare header-like tokens vs data-like tokens.
    if not tokens:
        return {
            "empty_ratio": 1.0,
            "unnamed_ratio": 0.0,
            "numeric_ratio": 0.0,
            "text_ratio": 0.0,
            "unique_ratio": 0.0,
            "avg_len": 0.0,
        }

    lowered = [str(token).strip().lower() for token in tokens]
    non_empty = [token for token in lowered if token != ""]
    empty_ratio = 1.0 - (len(non_empty) / len(lowered))
    unnamed_ratio = (
        sum(1 for token in non_empty if token.startswith("unnamed")) / len(non_empty)
        if non_empty
        else 0.0
    )
    numeric_ratio = (
        sum(1 for token in non_empty if _NUMERIC_RE.match(token)) / len(non_empty)
        if non_empty
        else 0.0
    )
    text_ratio = (
        sum(1 for token in non_empty if re.search(r"[a-zA-Z]", token) is not None) / len(non_empty)
        if non_empty
        else 0.0
    )
    unique_ratio = (len(set(non_empty)) / len(non_empty)) if non_empty else 0.0
    avg_len = (sum(len(token) for token in non_empty) / len(non_empty)) if non_empty else 0.0
    return {
        "empty_ratio": float(empty_ratio),
        "unnamed_ratio": float(unnamed_ratio),
        "numeric_ratio": float(numeric_ratio),
        "text_ratio": float(text_ratio),
        "unique_ratio": float(unique_ratio),
        "avg_len": float(avg_len),
    }


def _looks_like_header(names: List[str], df: pd.DataFrame) -> bool:
    # Decide header presence by comparing current column tokens with early data rows.
    if not names:
        return False

    name_profile = _token_profile(names)
    if name_profile["empty_ratio"] > 0.4 or name_profile["unnamed_ratio"] > 0.4:
        return False
    if name_profile["numeric_ratio"] > 0.7:
        return False

    sample_df = df.head(5)
    sample_tokens: List[str] = []
    for _, row in sample_df.iterrows():
        sample_tokens.extend([str(value) for value in row.tolist()])
    sample_profile = _token_profile(sample_tokens)

    distribution_gap = (
        abs(name_profile["text_ratio"] - sample_profile["text_ratio"])
        + abs(name_profile["numeric_ratio"] - sample_profile["numeric_ratio"])
        + abs(name_profile["empty_ratio"] - sample_profile["empty_ratio"])
    )
    avg_len_den = max(name_profile["avg_len"], sample_profile["avg_len"], 1.0)
    avg_len_gap = abs(name_profile["avg_len"] - sample_profile["avg_len"]) / avg_len_den

    # If names look statistically too similar to row values, likely no real header exists.
    if distribution_gap < 0.35 and avg_len_gap < 0.35:
        return False

    return name_profile["unique_ratio"] >= 0.7 and name_profile["text_ratio"] >= 0.3


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
    original_names = [str(name) for name in df.columns]
    new_columns = _generate_default_names(len(original_names))
    updated_df = df.copy()
    updated_df.columns = new_columns
    first_row = pd.DataFrame([original_names], columns=new_columns)
    updated_df = pd.concat([first_row, updated_df], ignore_index=True)
    return updated_df, new_columns


def run(context: PipelineContext) -> PipelineContext:
    # Decides which method to call
    df = context.get("dataframe")
    if df is None:
        raise ValueError("Header detection requires 'dataframe' in context.")

    original_names = [str(name) for name in df.columns]
    has_header = _looks_like_header(original_names, df)

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
