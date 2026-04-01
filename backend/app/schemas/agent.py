from __future__ import annotations

from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field


class OutputMode(str, Enum):
    TEXT = "text"
    CHART = "chart"
    DASHBOARD = "dashboard"
    FREE_CODE = "free_code"


class InterruptKind(str, Enum):
    CLARIFICATION = "clarification"
    APPROVAL = "approval"


class ChartType(str, Enum):
    BAR = "bar"
    LINE = "line"
    HISTOGRAM = "histogram"
    SCATTER = "scatter"


class AggregationOp(str, Enum):
    COUNT = "count"
    SUM = "sum"
    MEAN = "mean"
    MEDIAN = "median"
    MIN = "min"
    MAX = "max"


class SortDirection(str, Enum):
    ASC = "asc"
    DESC = "desc"


class ComplexityLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class ArtifactType(str, Enum):
    IMAGE = "image"
    TABLE = "table"
    TEXT = "text"


class ChatHistoryItem(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str


class DatasetSchemaField(BaseModel):
    name: str
    dtype: str
    nullable: bool


class NumericSummary(BaseModel):
    min: float | None = None
    max: float | None = None
    mean: float | None = None
    median: float | None = None
    std: float | None = None


class CategoryValue(BaseModel):
    value: str
    count: int
    ratio: float


class ColumnProfile(BaseModel):
    name: str
    dtype: str
    semantic_type: Literal["numeric", "categorical", "datetime", "boolean", "text"]
    null_count: int
    null_ratio: float
    unique_count: int
    unique_ratio: float
    numeric_summary: NumericSummary | None = None
    top_categories: list[CategoryValue] = Field(default_factory=list)
    visualization_hints: list[str] = Field(default_factory=list)
    issues: list[str] = Field(default_factory=list)


class DatasetProfile(BaseModel):
    dataset_id: str
    row_count: int
    column_count: int
    columns: list[ColumnProfile]
    time_columns: list[str] = Field(default_factory=list)
    numeric_columns: list[str] = Field(default_factory=list)
    categorical_columns: list[str] = Field(default_factory=list)
    visualization_hints: list[str] = Field(default_factory=list)
    potential_issues: list[str] = Field(default_factory=list)


class IntentResult(BaseModel):
    objective: str
    recommended_output_mode: OutputMode
    requires_clarification: bool = False
    multiple_valid_solutions: bool = False
    ambiguity_reason: str | None = None
    candidate_approaches: list[str] = Field(default_factory=list)
    referenced_columns: list[str] = Field(default_factory=list)
    confidence: float = 0.0


class ClarificationRequest(BaseModel):
    reason: str
    question: str
    options: list[str] = Field(default_factory=list)


class AnalysisPlan(BaseModel):
    objective: str
    strategy_summary: str
    steps: list[str] = Field(default_factory=list)
    selected_columns: list[str] = Field(default_factory=list)
    filters: list[str] = Field(default_factory=list)
    aggregations: list[AggregationOp] = Field(default_factory=list)
    output_mode: OutputMode
    approval_required: bool = False
    approval_reason: str | None = None
    rationale: str


class ChartSpec(BaseModel):
    chart_type: ChartType
    x_column: str
    y_column: str | None = None
    aggregation: AggregationOp | None = None
    sort_direction: SortDirection | None = None
    top_n: int | None = None
    title: str
    rationale: str
    color_by: str | None = None
    time_grain: Literal["day", "week", "month", "quarter", "year"] | None = None


class DashboardSpec(BaseModel):
    title: str
    rationale: str
    charts: list[ChartSpec] = Field(default_factory=list)


class TextAnswerSpec(BaseModel):
    answer_markdown: str
    rationale: str
    cited_columns: list[str] = Field(default_factory=list)
    caveats: list[str] = Field(default_factory=list)


class FreeCodeSpec(BaseModel):
    code: str
    artifact_filename: str = ""
    code_goal: str
    rationale: str


class SandboxResult(BaseModel):
    success: bool
    stdout: str = ""
    stderr: str = ""
    artifact_path: str | None = None
    exit_code: int = 0


class CodeReviewResult(BaseModel):
    approved: bool
    issues: list["ReviewIssue"] = Field(default_factory=list)
    revision_hint: str | None = None


class ValidationIssue(BaseModel):
    code: str
    message: str
    field_name: str | None = None
    severity: Literal["info", "warning", "error"] = "error"


class ValidationResult(BaseModel):
    is_valid: bool
    issues: list[ValidationIssue] = Field(default_factory=list)
    should_reask: bool = False
    should_regenerate: bool = False


class ReviewIssue(BaseModel):
    code: str
    message: str
    severity: Literal["warning", "error"] = "warning"


class ReviewResult(BaseModel):
    approved: bool
    issues: list[ReviewIssue] = Field(default_factory=list)
    revision_hint: str | None = None


class ArtifactRef(BaseModel):
    artifact_type: ArtifactType
    path: str
    mime_type: str
    description: str


class FinalResponse(BaseModel):
    status: Literal["completed", "needs_clarification", "approval_required", "error"]
    message: str
    output_mode: OutputMode | None = None
    text_answer: TextAnswerSpec | None = None
    artifacts: list[ArtifactRef] = Field(default_factory=list)
    clarification_question: str | None = None
    clarification_options: list[str] = Field(default_factory=list)
    approval_reason: str | None = None
    error: str | None = None
