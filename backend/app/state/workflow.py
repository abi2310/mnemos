from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field

from app.schemas.agent import (
    AnalysisPlan,
    ArtifactRef,
    ChartSpec,
    ChatHistoryItem,
    DatasetProfile,
    DatasetSchemaField,
    FinalResponse,
    IntentResult,
    InterruptKind,
    OutputMode,
    ReviewIssue,
    TextAnswerSpec,
    ValidationIssue,
)


class WorkflowState(BaseModel):
    chat_id: int | None = None
    request_id: str | None = None
    user_question: str = ""
    chat_history: list[ChatHistoryItem] = Field(default_factory=list)
    dataset_id: str = ""
    dataset_profile: DatasetProfile | None = None
    dataset_schema: list[DatasetSchemaField] = Field(default_factory=list)
    intent_result: IntentResult | None = None
    clarification_needed: bool = False
    clarification_question: str | None = None
    clarification_options: list[str] = Field(default_factory=list)
    user_clarification_answer: str | None = None
    analysis_plan: AnalysisPlan | None = None
    approval_required: bool = False
    approval_reason: str | None = None
    approved: bool | None = None
    output_mode: OutputMode | None = None
    chart_spec: ChartSpec | None = None
    text_answer: TextAnswerSpec | None = None
    validation_issues: list[ValidationIssue] = Field(default_factory=list)
    review_issues: list[ReviewIssue] = Field(default_factory=list)
    final_response: FinalResponse | None = None
    artifacts: list[ArtifactRef] = Field(default_factory=list)
    error: str | None = None
    interrupt_kind: InterruptKind | None = None
    review_attempts: int = 0
    validation_attempts: int = 0
    should_regenerate_spec: bool = False
    should_request_clarification: bool = False
    spec_revision_context: list[str] = Field(default_factory=list)
    artifacts_metadata: dict[str, Any] = Field(default_factory=dict)
