from __future__ import annotations

import csv
from typing import Any, Dict, List, Tuple

import pandas as pd

from ...core.config import get_settings
from ..storage import StorageService

PipelineContext = Dict[str, Any]

_DELIMITER_CANDIDATES = [",", ";", "\t", "|"]
_ENCODING_CANDIDATES = ["utf-8-sig", "utf-8", "cp1252", "latin-1"]
_BAD_ROW_SAMPLE_LIMIT = 100


def _sniff_encoding(sample: bytes) -> str:
    # Try common encodings on the sample and fall back to latin-1.
    for encoding in _ENCODING_CANDIDATES:
        try:
            sample.decode(encoding)
            return encoding
        except UnicodeDecodeError:
            continue
    return "latin-1"


def _sniff_delimiter(sample_text: str) -> str:
    # Use csv.Sniffer to detect a delimiter from the sample text.
    sniffer = csv.Sniffer()
    try:
        dialect = sniffer.sniff(sample_text, delimiters=_DELIMITER_CANDIDATES)
        return dialect.delimiter
    except Exception:
        return ","


def _read_sample(storage: StorageService, storage_key: str, size: int = 8192) -> bytes:
    # Read a small byte sample for encoding/delimiter detection.
    with storage.open(storage_key) as handle:
        return handle.read(size)


def _parse_csv(
    storage: StorageService, storage_key: str, encoding: str, delimiter: str
) -> Tuple[pd.DataFrame, List[List[str]], int]:
    # Parse CSV robustly, collecting counts and samples of bad rows.
    bad_rows: List[List[str]] = []
    bad_row_count = 0

    def _on_bad_line(row: List[str]) -> None:
        # Track malformed rows and keep a limited sample for reporting.
        nonlocal bad_row_count
        bad_row_count += 1
        if len(bad_rows) < _BAD_ROW_SAMPLE_LIMIT:
            bad_rows.append(row)
        return None

    with storage.open(storage_key) as handle:
        df = pd.read_csv(
            handle,
            encoding=encoding,
            sep=delimiter,
            engine="python",
            dtype=str,
            keep_default_na=False,
            na_filter=False,
            on_bad_lines=_on_bad_line,
        )

    return df, bad_rows, bad_row_count


def run(context: PipelineContext) -> PipelineContext:
    # Ingest the CSV from storage, sniff encoding/delimiter, and attach results.
    storage_key = context.get("storage_key")
    if not storage_key:
        raise ValueError("Ingestion requires 'storage_key' in context.")

    settings = get_settings()
    storage = StorageService(settings.storage_dir)

    sample_bytes = _read_sample(storage, storage_key)
    encoding = _sniff_encoding(sample_bytes)
    sample_text = sample_bytes.decode(encoding, errors="replace")
    delimiter = _sniff_delimiter(sample_text)

    df, bad_rows, bad_row_count = _parse_csv(storage, storage_key, encoding, delimiter)

    context = dict(context)
    context["dataframe"] = df
    context["ingestion"] = {
        "encoding": encoding,
        "delimiter": delimiter,
        "bad_row_count": bad_row_count,
        "bad_row_samples": bad_rows,
        "row_count": int(df.shape[0]),
        "column_count": int(df.shape[1]),
    }
    return context
