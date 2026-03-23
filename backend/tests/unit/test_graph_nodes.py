from pathlib import Path

from app.graph.nodes import AnalysisNodes, GraphDependencies
from app.policies.agent_policies import AgentPolicyEngine
from app.renderers.chart_renderer import ChartRenderer
from app.schemas.agent import (
    ChartSpec,
    ChartType,
    ColumnProfile,
    DatasetProfile,
    NumericSummary,
    OutputMode,
)
from app.services.dataset_profiler import DatasetProfiler
from app.state.workflow import WorkflowState


class _NoopDatasetService:
    pass


class _NoopLLMService:
    pass


def _build_profile() -> DatasetProfile:
    return DatasetProfile(
        dataset_id="dataset-test",
        row_count=10,
        column_count=2,
        columns=[
            ColumnProfile(
                name="preis",
                dtype="float64",
                semantic_type="numeric",
                null_count=0,
                null_ratio=0.0,
                unique_count=10,
                unique_ratio=1.0,
                numeric_summary=NumericSummary(min=1.0, max=10.0, mean=5.5, median=5.5, std=2.0),
                top_categories=[],
                visualization_hints=[],
                issues=[],
            ),
            ColumnProfile(
                name="menge",
                dtype="int64",
                semantic_type="numeric",
                null_count=0,
                null_ratio=0.0,
                unique_count=5,
                unique_ratio=0.5,
                numeric_summary=NumericSummary(min=1.0, max=5.0, mean=3.0, median=3.0, std=1.0),
                top_categories=[],
                visualization_hints=[],
                issues=[],
            ),
        ],
        time_columns=[],
        numeric_columns=["preis", "menge"],
        categorical_columns=[],
        visualization_hints=[],
        potential_issues=[],
    )


def test_validate_output_spec_uses_existing_clarification_instead_of_reasking() -> None:
    deps = GraphDependencies(
        dataset_service=_NoopDatasetService(),  # type: ignore[arg-type]
        profiler=DatasetProfiler(),
        llm_service=_NoopLLMService(),  # type: ignore[arg-type]
        renderer=ChartRenderer(),
        policies=AgentPolicyEngine(),
        storage_dir=Path("/tmp"),
    )
    nodes = AnalysisNodes(deps)

    state = WorkflowState(
        dataset_id="dataset-test",
        user_question="plotte preis",
        dataset_profile=_build_profile(),
        output_mode=OutputMode.CHART,
        chart_spec=ChartSpec(
            chart_type=ChartType.BAR,
            x_column="nicht_vorhanden",
            y_column="menge",
            aggregation=None,
            sort_direction=None,
            top_n=None,
            title="Test",
            rationale="Test rationale",
        ),
        clarification_question="Welche Spalte?",
        clarification_options=["preis"],
        user_clarification_answer="ja, preis ist korrekt",
    )

    update = nodes.validate_output_spec(state)

    assert update["should_request_clarification"] is False
    assert update["clarification_needed"] is False
    assert update["should_regenerate_spec"] is True
    assert any("Use the user's clarification answer" in message for message in update["spec_revision_context"])


def test_clarification_gate_skips_reinterrupt_when_answer_is_usable() -> None:
    deps = GraphDependencies(
        dataset_service=_NoopDatasetService(),  # type: ignore[arg-type]
        profiler=DatasetProfiler(),
        llm_service=_NoopLLMService(),  # type: ignore[arg-type]
        renderer=ChartRenderer(),
        policies=AgentPolicyEngine(),
        storage_dir=Path("/tmp"),
    )
    nodes = AnalysisNodes(deps)

    state = WorkflowState(
        dataset_id="dataset-test",
        dataset_profile=_build_profile(),
        clarification_needed=True,
        clarification_question="Welche Spalte?",
        clarification_options=["preis"],
        user_clarification_answer="ja preis ist korrekt",
    )

    update = nodes.clarification_gate(state)

    assert update["clarification_needed"] is False
    assert update["should_request_clarification"] is False
