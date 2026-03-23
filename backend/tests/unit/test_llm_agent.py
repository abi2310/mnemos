import pandas as pd

from app.services.llm_agent import LLMAgent


def test_extract_action_from_json_parses_fenced_json() -> None:
    agent = LLMAgent()
    raw = (
        "```json\n"
        "{\"type\": \"diagram\", \"assistant_text\": \"ok\", \"python_code\": \"fig.savefig(output_path)\"}\n"
        "```"
    )

    action = agent._extract_action_from_json(raw)

    assert action is not None
    assert action["type"] == "diagram"
    assert action["assistant_text"] == "ok"
    assert "savefig(output_path)" in action["python_code"]


def test_extract_action_from_json_returns_none_for_invalid_payload() -> None:
    agent = LLMAgent()

    action = agent._extract_action_from_json("not a json payload")

    assert action is None


def test_validate_generated_python_code_rejects_output_path_override() -> None:
    agent = LLMAgent()
    code = (
        "fig, ax = plt.subplots()\n"
        "output_path = 'x.png'\n"
        "df.head(10).plot(ax=ax)\n"
        "fig.savefig(output_path)\n"
    )

    valid, reason = agent._validate_generated_python_code(code)

    assert not valid
    assert reason == "overwrites_output_path"


def test_validate_code_against_metadata_flags_unknown_columns() -> None:
    agent = LLMAgent()
    dataset_df = pd.DataFrame({"known": [1, 2, 3]})
    code = (
        "fig, ax = plt.subplots()\n"
        "df['unknown'].value_counts().plot(kind='bar', ax=ax)\n"
        "fig.savefig(output_path)\n"
    )

    valid, issues = agent._validate_code_against_metadata(code, dataset_df)

    assert not valid
    assert "unknown_columns:unknown" in issues


def test_assess_pre_execution_visual_issues_detects_crowded_labels() -> None:
    agent = LLMAgent()
    dataset_df = pd.DataFrame({"category": [f"item_{i}" for i in range(30)]})
    code = (
        "fig, ax = plt.subplots()\n"
        "df['category'].value_counts().plot(kind='bar', ax=ax)\n"
        "fig.savefig(output_path)\n"
    )

    issues = agent._assess_pre_execution_visual_issues(code, dataset_df)

    assert "crowded_categories:category" in issues
    assert "missing_label_rotation" in issues


def test_review_rendered_image_without_api_key_is_noop(monkeypatch) -> None:
    agent = LLMAgent()
    dataset_df = pd.DataFrame({"x": [1, 2, 3]})
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    result = agent.review_rendered_image(
        question="plot x",
        history_text="user: plot x",
        dataset_df=dataset_df,
        image_path="/tmp/nonexistent.png",
        current_code="fig.savefig(output_path)",
    )

    assert result["approved"] is True
    assert result["python_code"] is None


def test_review_and_regenerate_diagram_action_keeps_valid_action_without_regeneration() -> None:
    agent = LLMAgent()
    dataset_df = pd.DataFrame({"value": [1, 2, 3, 4]})
    action = {
        "type": "diagram",
        "assistant_text": "ok",
        "python_code": (
            "fig, ax = plt.subplots(figsize=(10, 6))\n"
            "df['value'].head(10).plot(kind='bar', ax=ax)\n"
            "plt.xticks(rotation=45)\n"
            "fig.tight_layout()\n"
            "fig.savefig(output_path)\n"
        ),
    }

    reviewed = agent._review_and_regenerate_diagram_action(
        client=None,  # type: ignore[arg-type]
        question="plot value",
        history_text="user: plot value",
        dataset_df=dataset_df,
        dataset_context=agent._build_dataset_context(dataset_df),
        metadata_context=agent._build_dataset_metadata(dataset_df),
        action=action,
    )

    assert reviewed == action
