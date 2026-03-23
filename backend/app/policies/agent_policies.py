from __future__ import annotations

from pydantic import BaseModel

from app.schemas.agent import (
    AggregationOp,
    AnalysisPlan,
    ChartSpec,
    ChartType,
    DatasetProfile,
    IntentResult,
    ValidationIssue,
    ValidationResult,
)


class AgentPolicyEngine(BaseModel):
    clarification_confidence_threshold: float = 0.6
    crowded_category_threshold: int = 20
    default_top_n: int = 15

    def needs_clarification(self, intent: IntentResult) -> bool:
        return (
            intent.requires_clarification
            or intent.multiple_valid_solutions
            or intent.confidence < self.clarification_confidence_threshold
        )

    def needs_approval(self, plan: AnalysisPlan, profile: DatasetProfile) -> bool:
        if plan.approval_required:
            return True
        if plan.output_mode.value == "chart" and profile.row_count > 250_000:
            return True
        return False

    def apply_chart_defaults(self, spec: ChartSpec, profile: DatasetProfile) -> ChartSpec:
        column_map = {column.name: column for column in profile.columns}
        x_profile = column_map.get(spec.x_column)
        updated_spec = spec.model_copy(deep=True)
        if x_profile and x_profile.unique_count > self.crowded_category_threshold and updated_spec.top_n is None:
            updated_spec.top_n = self.default_top_n
        if updated_spec.chart_type == ChartType.BAR and updated_spec.aggregation is None and updated_spec.y_column:
            updated_spec.aggregation = AggregationOp.MEAN
        if updated_spec.chart_type == ChartType.BAR and updated_spec.y_column is None:
            updated_spec.aggregation = AggregationOp.COUNT
        return updated_spec

    def validate_chart_spec(self, spec: ChartSpec, profile: DatasetProfile) -> ValidationResult:
        issues: list[ValidationIssue] = []
        column_map = {column.name: column for column in profile.columns}
        x_profile = column_map.get(spec.x_column)
        y_profile = column_map.get(spec.y_column) if spec.y_column else None

        if x_profile is None:
            issues.append(
                ValidationIssue(
                    code="unknown_x_column",
                    message=f"Column '{spec.x_column}' does not exist in the dataset profile.",
                    field_name="x_column",
                )
            )

        if spec.y_column and y_profile is None:
            issues.append(
                ValidationIssue(
                    code="unknown_y_column",
                    message=f"Column '{spec.y_column}' does not exist in the dataset profile.",
                    field_name="y_column",
                )
            )

        if spec.chart_type in {ChartType.BAR, ChartType.LINE, ChartType.SCATTER} and spec.y_column is None:
            issues.append(
                ValidationIssue(
                    code="missing_y_column",
                    message="This chart type requires a y-axis column.",
                    field_name="y_column",
                )
            )

        if spec.chart_type == ChartType.HISTOGRAM and x_profile and x_profile.semantic_type != "numeric":
            issues.append(
                ValidationIssue(
                    code="histogram_requires_numeric_x",
                    message="Histogram charts require a numeric x column.",
                    field_name="x_column",
                )
            )

        if spec.chart_type == ChartType.SCATTER:
            if x_profile and x_profile.semantic_type != "numeric":
                issues.append(
                    ValidationIssue(
                        code="scatter_requires_numeric_x",
                        message="Scatter plots require a numeric x column.",
                        field_name="x_column",
                    )
                )
            if y_profile and y_profile.semantic_type != "numeric":
                issues.append(
                    ValidationIssue(
                        code="scatter_requires_numeric_y",
                        message="Scatter plots require a numeric y column.",
                        field_name="y_column",
                    )
                )

        if spec.chart_type == ChartType.LINE and x_profile and x_profile.semantic_type not in {"datetime", "numeric", "categorical"}:
            issues.append(
                ValidationIssue(
                    code="line_chart_bad_x",
                    message="Line charts require an ordered x column.",
                    field_name="x_column",
                )
            )

        if x_profile and x_profile.unique_count > self.crowded_category_threshold and spec.chart_type in {ChartType.BAR, ChartType.LINE} and spec.top_n is None:
            issues.append(
                ValidationIssue(
                    code="suggest_top_n",
                    message="This chart would be crowded. Add top_n or aggregate further.",
                    field_name="top_n",
                    severity="warning",
                )
            )

        is_valid = not any(issue.severity == "error" for issue in issues)
        should_reask = any(issue.code.startswith("unknown_") for issue in issues)
        should_regenerate = not is_valid or any(issue.code == "suggest_top_n" for issue in issues)
        return ValidationResult(
            is_valid=is_valid,
            issues=issues,
            should_reask=should_reask,
            should_regenerate=should_regenerate,
        )
