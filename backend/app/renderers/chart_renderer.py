from __future__ import annotations

from pathlib import Path

import matplotlib
import pandas as pd

from app.schemas.agent import ArtifactRef, ArtifactType, ChartSpec, ChartType, SortDirection


matplotlib.use("Agg")
import matplotlib.pyplot as plt


class ChartRenderer:
    def render(self, spec: ChartSpec, df: pd.DataFrame, output_path: str) -> ArtifactRef:
        output = Path(output_path)
        output.parent.mkdir(parents=True, exist_ok=True)

        if spec.chart_type == ChartType.BAR:
            self.render_bar_chart(spec, df, output_path)
        elif spec.chart_type == ChartType.LINE:
            self.render_line_chart(spec, df, output_path)
        elif spec.chart_type == ChartType.HISTOGRAM:
            self.render_histogram(spec, df, output_path)
        elif spec.chart_type == ChartType.SCATTER:
            self.render_scatter_plot(spec, df, output_path)
        else:
            raise ValueError(f"Unsupported chart type: {spec.chart_type}")

        return ArtifactRef(
            artifact_type=ArtifactType.IMAGE,
            path=str(output),
            mime_type="image/png",
            description=spec.title,
        )

    def render_bar_chart(self, spec: ChartSpec, df: pd.DataFrame, output_path: str) -> None:
        chart_df = self._prepare_categorical_frame(spec, df)
        fig, ax = plt.subplots(figsize=(11, 6))
        ax.bar(chart_df[spec.x_column].astype(str), chart_df["_value"])
        ax.set_title(spec.title)
        ax.set_xlabel(spec.x_column)
        ax.set_ylabel(spec.y_column or "count")
        plt.xticks(rotation=45, ha="right")
        fig.tight_layout()
        fig.savefig(output_path)
        plt.close(fig)

    def render_line_chart(self, spec: ChartSpec, df: pd.DataFrame, output_path: str) -> None:
        chart_df = self._prepare_categorical_frame(spec, df)
        fig, ax = plt.subplots(figsize=(11, 6))
        ax.plot(chart_df[spec.x_column], chart_df["_value"], marker="o")
        ax.set_title(spec.title)
        ax.set_xlabel(spec.x_column)
        ax.set_ylabel(spec.y_column or "value")
        plt.xticks(rotation=45, ha="right")
        fig.tight_layout()
        fig.savefig(output_path)
        plt.close(fig)

    def render_histogram(self, spec: ChartSpec, df: pd.DataFrame, output_path: str) -> None:
        series = df[spec.x_column].dropna()
        fig, ax = plt.subplots(figsize=(10, 6))
        ax.hist(series, bins=min(30, max(10, int(series.nunique()))))
        ax.set_title(spec.title)
        ax.set_xlabel(spec.x_column)
        ax.set_ylabel("count")
        fig.tight_layout()
        fig.savefig(output_path)
        plt.close(fig)

    def render_scatter_plot(self, spec: ChartSpec, df: pd.DataFrame, output_path: str) -> None:
        if spec.y_column is None:
            raise ValueError("Scatter plots require y_column")
        scatter_df = df[[spec.x_column, spec.y_column]].dropna()
        fig, ax = plt.subplots(figsize=(10, 6))
        ax.scatter(scatter_df[spec.x_column], scatter_df[spec.y_column], alpha=0.7)
        ax.set_title(spec.title)
        ax.set_xlabel(spec.x_column)
        ax.set_ylabel(spec.y_column)
        fig.tight_layout()
        fig.savefig(output_path)
        plt.close(fig)

    def _prepare_categorical_frame(self, spec: ChartSpec, df: pd.DataFrame) -> pd.DataFrame:
        if spec.y_column is None:
            grouped = df.groupby(spec.x_column, dropna=False).size().reset_index(name="_value")
        elif spec.aggregation is None:
            grouped = df[[spec.x_column, spec.y_column]].dropna().rename(columns={spec.y_column: "_value"})
        else:
            grouped = (
                df[[spec.x_column, spec.y_column]]
                .dropna()
                .groupby(spec.x_column, dropna=False)[spec.y_column]
                .agg(spec.aggregation.value)
                .reset_index(name="_value")
            )

        if spec.sort_direction == SortDirection.ASC:
            grouped = grouped.sort_values("_value", ascending=True)
        elif spec.sort_direction == SortDirection.DESC:
            grouped = grouped.sort_values("_value", ascending=False)

        if spec.top_n is not None:
            grouped = grouped.head(spec.top_n)

        return grouped
