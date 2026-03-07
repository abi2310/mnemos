import io

import pandas as pd

from app.core.config import Settings
from app.services.data_pipeline.pipeline_services import (
    header_detection,
    inconsistencies,
    ingest,
    missing_values,
    schema_check,
    type_inference,
)
from app.services.storage import StorageService


def test_ingest_sniffs_delimiter_and_bad_rows(tmp_path, monkeypatch):
    storage = StorageService(tmp_path)
    content = "a;b\n1;2\n3;4\n5;6;7\n"
    storage.save("datasets/test.csv", io.BytesIO(content.encode("utf-8")))

    monkeypatch.setattr(
        ingest,
        "get_settings",
        lambda: Settings(storage_dir=tmp_path),
    )

    result = ingest.run({"storage_key": "datasets/test.csv"})

    assert result["ingestion"]["delimiter"] == ";"
    assert result["ingestion"]["bad_row_count"] == 1
    assert result["ingestion"]["row_count"] == 2
    assert result["ingestion"]["column_count"] == 2
    assert result["ingestion"]["encoding"] in ingest._ENCODING_CANDIDATES
    assert len(result["ingestion"]["bad_row_samples"]) == 1


def test_header_detection_no_header_generates_names():
    df = pd.DataFrame([["a", "b"], ["c", "d"]], columns=["1", "2"])
    result = header_detection.run({"dataframe": df})
    updated = result["dataframe"]

    assert list(updated.columns) == ["col1", "col2"]
    assert updated.iloc[0].tolist() == ["1", "2"]
    assert result["header_detection"]["used_first_row_as_header"] is False


def test_header_detection_normalizes_names():
    df = pd.DataFrame([[1, 2]], columns=["Name", "Order ID"])
    result = header_detection.run({"dataframe": df})

    assert list(result["dataframe"].columns) == ["name", "order_id"]
    assert result["header_detection"]["used_first_row_as_header"] is True


def test_schema_check_flags_columns():
    df = pd.DataFrame(
        [[1, 1, "", 0, 5], [2, 1, "", 0, 5]],
        columns=["a", "a", "", "Unnamed: 0", "const"],
    )
    result = schema_check.run({"dataframe": df})
    schema = result["schema_check"]

    assert "a" in schema["duplicate_columns"]
    assert "" in schema["empty_column_names"]
    assert "Unnamed: 0" in schema["unnamed_columns"]
    assert "const" in schema["constant_columns"]


def test_missing_values_normalization_and_stats():
    df = pd.DataFrame({"a": ["", "n/a", "ok"], "b": ["null", "1", None]})
    result = missing_values.run({"dataframe": df})
    normalized = result["dataframe"]

    assert normalized.isna().sum()["a"] == 1
    assert normalized.isna().sum()["b"] == 1
    assert result["missing_values"]["rows_all_missing_removed"] == 1
    assert result["missing_values"]["stats"]["total_missing"] == 2


def test_missing_values_removes_all_missing_rows():
    df = pd.DataFrame({"a": ["", "ok"], "b": ["", "1"]})
    result = missing_values.run({"dataframe": df})
    normalized = result["dataframe"]

    assert len(normalized) == 1
    assert result["missing_values"]["rows_all_missing_removed"] == 1
    assert result["missing_values"]["row_count_before"] == 2
    assert result["missing_values"]["row_count_after"] == 1


def test_type_inference_detects_common_types():
    df = pd.DataFrame(
        {
            "num": ["1", "2", None],
            "flag": ["yes", "no", "yes"],
            "date": ["2020-01-01", "2020-02-02", None],
            "text": ["a", "b", "c"],
        }
    )
    result = type_inference.run({"dataframe": df})
    inferred = result["type_inference"]["columns"]

    assert inferred["num"]["inferred_type"] == "numeric"
    assert inferred["flag"]["inferred_type"] == "boolean"
    assert inferred["date"]["inferred_type"] == "datetime"
    assert inferred["text"]["inferred_type"] == "string"


def test_inconsistencies_detects_text_variants():
    df = pd.DataFrame({"city": ["Berlin", "Berlin ", "Berlin\t", "Munich"]})
    inferred = type_inference.run({"dataframe": df})["type_inference"]
    result = inconsistencies.run({"dataframe": df, "type_inference": inferred})
    inconsist = result["inconsistencies"]["text_inconsistencies"]["city"][
        "inconsistent_values"
    ]

    assert "berlin" in inconsist
    assert len(inconsist["berlin"]["variants"]) >= 2
