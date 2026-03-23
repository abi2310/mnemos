from __future__ import annotations

import ast
import json
import re
from typing import Any

import pandas as pd


class LLMAgent:
    """Compatibility helper around legacy validation utilities.

    The production path now lives in the LangGraph-based analysis agent.
    """

    def _build_dataset_context(self, dataset_df: pd.DataFrame) -> str:
        row_count, col_count = dataset_df.shape
        columns = [str(col) for col in dataset_df.columns.tolist()]
        preview_rows = dataset_df.head(5).to_dict(orient="records")
        return (
            f"Rows: {row_count}\n"
            f"Columns: {col_count}\n"
            f"Column names: {columns}\n"
            f"Preview (first 5 rows): {preview_rows}"
        )

    def _dataset_metadata_rows(self, dataset_df: pd.DataFrame) -> list[dict[str, Any]]:
        return [
            {
                "name": str(column),
                "dtype": str(dataset_df[column].dtype),
                "null_count": int(dataset_df[column].isna().sum()),
                "unique_count": int(dataset_df[column].nunique(dropna=True)),
            }
            for column in dataset_df.columns
        ]

    def _build_dataset_metadata(self, dataset_df: pd.DataFrame) -> str:
        return json.dumps(self._dataset_metadata_rows(dataset_df), ensure_ascii=True)

    def _parse_json_payload(self, raw_text: str) -> dict[str, Any] | None:
        text = raw_text.strip()
        if text.startswith("```"):
            text = re.sub(r"^```(?:json)?\n", "", text)
            text = re.sub(r"\n```$", "", text)
        try:
            payload = json.loads(text)
        except json.JSONDecodeError:
            match = re.search(r"\{[\s\S]*\}", text)
            if not match:
                return None
            try:
                payload = json.loads(match.group(0))
            except json.JSONDecodeError:
                return None
        return payload if isinstance(payload, dict) else None

    def _extract_action_from_json(self, raw_text: str) -> dict[str, Any] | None:
        payload = self._parse_json_payload(raw_text)
        if payload is None:
            return None
        action_type = str(payload.get("type", "text")).strip().lower()
        assistant_text = str(payload.get("assistant_text", "")).strip() or "OpenAI hat keine Antwort geliefert."
        if action_type == "diagram":
            python_code = payload.get("python_code")
            if not isinstance(python_code, str) or not python_code.strip():
                return None
            return {
                "type": "diagram",
                "assistant_text": assistant_text,
                "python_code": python_code,
            }
        return {"type": "text", "assistant_text": assistant_text}

    def _validate_generated_python_code(self, code: str) -> tuple[bool, str | None]:
        if "df" not in code:
            return False, "missing_df_usage"
        if re.search(r"\bdf\s*=\s*pd\.DataFrame\s*\(", code):
            return False, "hardcoded_dataframe"
        if re.search(r"\bdata\s*=\s*\{", code) or re.search(r"\bdata\s*=\s*\[", code):
            return False, "hardcoded_data"
        if re.search(r"\boutput_path\s*=", code):
            return False, "overwrites_output_path"
        if "savefig(output_path)" not in code.replace(" ", ""):
            return False, "missing_output_path_save"
        return True, None

    def _extract_referenced_columns(self, code: str) -> set[str]:
        columns: set[str] = set()
        try:
            tree = ast.parse(code)
        except SyntaxError:
            return columns
        for node in ast.walk(tree):
            if isinstance(node, ast.Subscript) and isinstance(node.value, ast.Name) and node.value.id == "df":
                slice_node = node.slice
                if isinstance(slice_node, ast.Constant) and isinstance(slice_node.value, str):
                    columns.add(slice_node.value)
                elif isinstance(slice_node, ast.Tuple):
                    for element in slice_node.elts:
                        if isinstance(element, ast.Constant) and isinstance(element.value, str):
                            columns.add(element.value)
        return columns

    def _validate_code_against_metadata(self, code: str, dataset_df: pd.DataFrame) -> tuple[bool, list[str]]:
        issues: list[str] = []
        valid, reason = self._validate_generated_python_code(code)
        if not valid and reason is not None:
            issues.append(reason)
        available_columns = {str(column) for column in dataset_df.columns}
        unknown_columns = sorted(self._extract_referenced_columns(code) - available_columns)
        if unknown_columns:
            issues.append(f"unknown_columns:{','.join(unknown_columns)}")
        return len(issues) == 0, issues

    def _assess_pre_execution_visual_issues(self, code: str, dataset_df: pd.DataFrame) -> list[str]:
        issues: list[str] = []
        metadata_by_name = {str(row["name"]): row for row in self._dataset_metadata_rows(dataset_df)}
        referenced_columns = self._extract_referenced_columns(code)
        crowded_columns = [
            column for column in referenced_columns if int(metadata_by_name.get(column, {}).get("unique_count", 0)) > 20
        ]
        normalized_code = code.replace(" ", "")
        if crowded_columns and "head(" not in code and "nlargest(" not in code and "nsmallest(" not in code:
            issues.append(f"crowded_categories:{','.join(sorted(crowded_columns))}")
        if crowded_columns and "figsize=" not in normalized_code:
            issues.append("missing_figsize_for_crowded_chart")
        if crowded_columns and "rotation=" not in code and "xticks(" not in code:
            issues.append("missing_label_rotation")
        if crowded_columns and "tight_layout(" not in code:
            issues.append("missing_tight_layout")
        return issues

    def review_rendered_image(
        self,
        question: str,
        history_text: str,
        dataset_df: pd.DataFrame,
        image_path: str,
        current_code: str,
    ) -> dict[str, Any]:
        return {"approved": True, "issues": [], "python_code": None}

    def _review_and_regenerate_diagram_action(
        self,
        client: Any,
        question: str,
        history_text: str,
        dataset_df: pd.DataFrame,
        dataset_context: str,
        metadata_context: str,
        action: dict[str, Any],
    ) -> dict[str, Any]:
        code = action.get("python_code")
        if not isinstance(code, str):
            return action
        is_valid, issues = self._validate_code_against_metadata(code, dataset_df)
        visual_issues = self._assess_pre_execution_visual_issues(code, dataset_df)
        if is_valid and not visual_issues:
            return action
        return {
            "type": "diagram",
            "assistant_text": f"Diagram action kept in compatibility mode with issues: {issues + visual_issues}",
            "python_code": code,
        }