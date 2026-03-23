from __future__ import annotations

from typing import Any

import pandas as pd

from app.schemas.agent import CategoryValue, ColumnProfile, DatasetProfile, DatasetSchemaField, NumericSummary


class DatasetProfiler:
    def profile(self, dataset_id: str, df: pd.DataFrame) -> tuple[DatasetProfile, list[DatasetSchemaField]]:
        row_count = int(len(df))
        columns: list[ColumnProfile] = []
        schema: list[DatasetSchemaField] = []
        time_columns: list[str] = []
        numeric_columns: list[str] = []
        categorical_columns: list[str] = []
        visualization_hints: list[str] = []
        potential_issues: list[str] = []

        for column_name in df.columns:
            series = df[column_name]
            semantic_type = self._semantic_type(series)
            if semantic_type == "datetime":
                time_columns.append(str(column_name))
            elif semantic_type == "numeric":
                numeric_columns.append(str(column_name))
            elif semantic_type in {"categorical", "text", "boolean"}:
                categorical_columns.append(str(column_name))

            column_profile = self._profile_column(str(column_name), series, row_count, semantic_type)
            columns.append(column_profile)
            schema.append(
                DatasetSchemaField(
                    name=str(column_name),
                    dtype=str(series.dtype),
                    nullable=bool(series.isna().any()),
                )
            )
            potential_issues.extend(column_profile.issues)

        if len(numeric_columns) >= 2:
            visualization_hints.append("scatter plots are possible between numeric columns")
        if time_columns and numeric_columns:
            visualization_hints.append("time series line charts are possible")
        if categorical_columns:
            visualization_hints.append("bar charts are suitable for grouped category comparisons")

        profile = DatasetProfile(
            dataset_id=dataset_id,
            row_count=row_count,
            column_count=int(len(df.columns)),
            columns=columns,
            time_columns=time_columns,
            numeric_columns=numeric_columns,
            categorical_columns=categorical_columns,
            visualization_hints=sorted(set(visualization_hints)),
            potential_issues=sorted(set(potential_issues)),
        )
        return profile, schema

    def _profile_column(
        self,
        column_name: str,
        series: pd.Series[Any],
        row_count: int,
        semantic_type: str,
    ) -> ColumnProfile:
        null_count = int(series.isna().sum())
        unique_count = int(series.nunique(dropna=True))
        issues: list[str] = []
        hints: list[str] = []
        numeric_summary: NumericSummary | None = None
        top_categories: list[CategoryValue] = []

        if row_count and unique_count > 50 and unique_count / max(row_count, 1) > 0.5:
            issues.append(f"high_cardinality:{column_name}")
        if row_count and null_count / row_count > 0.4:
            issues.append(f"many_nulls:{column_name}")

        if semantic_type == "numeric":
            numeric_values = pd.to_numeric(series, errors="coerce").dropna()
            if not numeric_values.empty:
                numeric_summary = NumericSummary(
                    min=float(numeric_values.min()),
                    max=float(numeric_values.max()),
                    mean=float(numeric_values.mean()),
                    median=float(numeric_values.median()),
                    std=float(numeric_values.std()) if len(numeric_values) > 1 else 0.0,
                )
            hints.append("use for aggregation, distribution, or correlation analysis")
        elif semantic_type in {"categorical", "text", "boolean"}:
            value_counts = series.astype(str).fillna("<NA>").value_counts(dropna=False).head(5)
            top_categories = [
                CategoryValue(value=str(index), count=int(count), ratio=float(count / max(row_count, 1)))
                for index, count in value_counts.items()
            ]
            hints.append("use for grouped comparisons or counts")
        elif semantic_type == "datetime":
            hints.append("use for trend and time series analysis")

        return ColumnProfile(
            name=column_name,
            dtype=str(series.dtype),
            semantic_type=semantic_type,  # type: ignore[arg-type]
            null_count=null_count,
            null_ratio=float(null_count / max(row_count, 1)),
            unique_count=unique_count,
            unique_ratio=float(unique_count / max(row_count, 1)),
            numeric_summary=numeric_summary,
            top_categories=top_categories,
            visualization_hints=hints,
            issues=issues,
        )

    def _semantic_type(self, series: pd.Series[Any]) -> str:
        if pd.api.types.is_bool_dtype(series):
            return "boolean"
        if pd.api.types.is_numeric_dtype(series):
            return "numeric"
        if pd.api.types.is_datetime64_any_dtype(series):
            return "datetime"

        sample = series.dropna().head(50)
        if sample.empty:
            return "categorical"

        parsed = pd.to_datetime(sample, errors="coerce")
        if parsed.notna().mean() >= 0.8:
            return "datetime"
        if sample.nunique(dropna=True) <= min(20, max(5, int(len(sample) * 0.5))):
            return "categorical"
        return "text"
