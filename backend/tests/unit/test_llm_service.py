from app.schemas.agent import (
    ColumnProfile,
    DashboardSpec,
    DatasetProfile,
    NumericSummary,
    OutputMode,
)
from app.services.llm_service import LLMService


def _profile() -> DatasetProfile:
    return DatasetProfile(
        dataset_id="dataset-test",
        row_count=100,
        column_count=7,
        columns=[
            ColumnProfile(
                name="social_media_hours",
                dtype="float64",
                semantic_type="numeric",
                null_count=0,
                null_ratio=0.0,
                unique_count=90,
                unique_ratio=0.9,
                numeric_summary=NumericSummary(min=0.0, max=12.0, mean=4.5, median=4.0, std=2.0),
            ),
            ColumnProfile(
                name="online_shopping_count",
                dtype="int64",
                semantic_type="numeric",
                null_count=0,
                null_ratio=0.0,
                unique_count=30,
                unique_ratio=0.3,
                numeric_summary=NumericSummary(min=0.0, max=40.0, mean=8.0, median=6.0, std=5.0),
            ),
            ColumnProfile(
                name="discount_rate",
                dtype="float64",
                semantic_type="numeric",
                null_count=0,
                null_ratio=0.0,
                unique_count=50,
                unique_ratio=0.5,
                numeric_summary=NumericSummary(min=0.0, max=0.7, mean=0.2, median=0.18, std=0.1),
            ),
            ColumnProfile(
                name="shipping_time",
                dtype="float64",
                semantic_type="numeric",
                null_count=0,
                null_ratio=0.0,
                unique_count=40,
                unique_ratio=0.4,
                numeric_summary=NumericSummary(min=1.0, max=14.0, mean=4.0, median=3.0, std=2.0),
            ),
            ColumnProfile(
                name="return_status",
                dtype="object",
                semantic_type="categorical",
                null_count=0,
                null_ratio=0.0,
                unique_count=2,
                unique_ratio=0.02,
            ),
            ColumnProfile(
                name="payment_method",
                dtype="object",
                semantic_type="categorical",
                null_count=0,
                null_ratio=0.0,
                unique_count=4,
                unique_ratio=0.04,
            ),
            ColumnProfile(
                name="age",
                dtype="int64",
                semantic_type="numeric",
                null_count=0,
                null_ratio=0.0,
                unique_count=40,
                unique_ratio=0.4,
                numeric_summary=NumericSummary(min=18.0, max=75.0, mean=39.0, median=38.0, std=12.0),
            ),
        ],
        numeric_columns=[
            "social_media_hours",
            "online_shopping_count",
            "discount_rate",
            "shipping_time",
            "age",
        ],
        categorical_columns=["return_status", "payment_method"],
        time_columns=[],
    )


def test_heuristic_intent_routes_multi_chart_request_to_dashboard() -> None:
    service = LLMService()

    result = service._heuristic_intent(
        "Erstelle mir noch 3 Grafiken, wo die Social Media Stunden und Online Shopping Anzahl gezeigt werden.",
        _profile(),
    )

    assert result.recommended_output_mode == OutputMode.DASHBOARD
    assert "social_media_hours" in result.referenced_columns
    assert "online_shopping_count" in result.referenced_columns


def test_heuristic_dashboard_spec_prioritizes_prompt_columns() -> None:
    service = LLMService()
    profile = _profile()
    intent = service._heuristic_intent(
        "Erstelle mir ein Dashboard mit Social Media Stunden, Rabatten, Versandzeit und Return Status.",
        profile,
    )
    plan = service._heuristic_plan(
        "Erstelle mir ein Dashboard mit Social Media Stunden, Rabatten, Versandzeit und Return Status.",
        None,
        intent,
        profile,
    )

    spec: DashboardSpec = service._heuristic_dashboard_spec(
        "Erstelle mir ein Dashboard mit Social Media Stunden, Rabatten, Versandzeit und Return Status.",
        plan,
        profile,
    )

    chart_columns = {
        chart.x_column
        for chart in spec.charts
    } | {
        chart.y_column
        for chart in spec.charts
        if chart.y_column is not None
    }

    assert len(spec.charts) >= 3
    assert "social_media_hours" in chart_columns
    assert "discount_rate" in chart_columns or "shipping_time" in chart_columns
    assert "age" not in chart_columns
