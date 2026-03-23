import os
import tempfile
import json
import re
import ast
import base64
from typing import Any

from openai import OpenAI, AuthenticationError, APIConnectionError, RateLimitError, OpenAIError
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd
from fastapi import HTTPException


class LLMAgent:
    """Einfache Agentenlogik für datengetriebene Chat-Antworten."""

    def __init__(self, model_name: str = "gpt-4o-mini"):
        self.model_name = model_name

    def validate_api_key(self, api_key: str) -> tuple[bool, str | None]:
        """Validiert den OpenAI API Key und klassifiziert den Fehlergrund."""
        try:
            client = OpenAI(api_key=api_key)
            client.models.list()
            return True, None
        except AuthenticationError:
            return False, "auth"
        except APIConnectionError:
            return False, "connection"
        except RateLimitError:
            return False, "rate_limit"
        except OpenAIError:
            return False, "openai_error"
        except Exception:
            return False, "unknown"

    def _build_dataset_context(self, dataset_df: pd.DataFrame) -> str:
        """Build a compact dataset summary for the LLM prompt."""
        row_count, col_count = dataset_df.shape
        columns = [str(col) for col in dataset_df.columns.tolist()]
        preview_rows = dataset_df.head(5).to_dict(orient="records")

        return (
            f"Rows: {row_count}\n"
            f"Columns: {col_count}\n"
            f"Column names: {columns}\n"
            f"Preview (first 5 rows): {preview_rows}"
        )

    def _build_dataset_metadata(self, dataset_df: pd.DataFrame) -> str:
        """Build dataset metadata for validation and regeneration prompts."""
        metadata_rows = []
        for column in dataset_df.columns:
            series = dataset_df[column]
            metadata_rows.append(
                {
                    "name": str(column),
                    "dtype": str(series.dtype),
                    "null_count": int(series.isna().sum()),
                    "unique_count": int(series.nunique(dropna=True)),
                }
            )
        return json.dumps(metadata_rows, ensure_ascii=True)

    def _dataset_metadata_rows(self, dataset_df: pd.DataFrame) -> list[dict[str, Any]]:
        metadata_rows: list[dict[str, Any]] = []
        for column in dataset_df.columns:
            series = dataset_df[column]
            metadata_rows.append(
                {
                    "name": str(column),
                    "dtype": str(series.dtype),
                    "null_count": int(series.isna().sum()),
                    "unique_count": int(series.nunique(dropna=True)),
                }
            )
        return metadata_rows

    def _default_diagram_action(self) -> dict:
        python_code = (
            "import matplotlib.pyplot as plt\n"
            "fig, ax = plt.subplots()\n"
            "df_plot = df.head(20)\n"
            "if df_plot.shape[1] > 1:\n"
            "    df_plot.plot(ax=ax)\n"
            "else:\n"
            "    df_plot.plot(kind='line', ax=ax)\n"
            "ax.set_title('Automatisch erzeugtes Diagramm')\n"
            "fig.savefig(output_path)\n"
        )
        return {
            "type": "diagram",
            "assistant_text": "Ich habe ein Diagramm erstellt. Der Python-Code wurde generiert und ausgeführt.",
            "python_code": python_code,
        }

    def _extract_action_from_json(self, raw_text: str) -> dict | None:
        """Extract action payload from model output JSON."""
        text = raw_text.strip()

        # Remove optional markdown code fences.
        if text.startswith("```"):
            text = re.sub(r"^```(?:json)?\\n", "", text)
            text = re.sub(r"\\n```$", "", text)

        try:
            payload = json.loads(text)
        except json.JSONDecodeError:
            # Try best-effort extraction of first JSON object in text.
            match = re.search(r"\{[\s\S]*\}", text)
            if not match:
                return None
            try:
                payload = json.loads(match.group(0))
            except json.JSONDecodeError:
                return None

        if not isinstance(payload, dict):
            return None

        action_type = str(payload.get("type", "text")).strip().lower()
        assistant_text = str(payload.get("assistant_text", "")).strip()
        python_code = payload.get("python_code")

        if not assistant_text:
            assistant_text = "OpenAI hat keine Antwort geliefert."

        if action_type == "diagram":
            if not isinstance(python_code, str) or not python_code.strip():
                return None
            return {
                "type": "diagram",
                "assistant_text": assistant_text,
                "python_code": python_code,
            }

        return {
            "type": "text",
            "assistant_text": assistant_text,
        }

    def _validate_generated_python_code(self, code: str) -> tuple[bool, str | None]:
        """Validate that generated code uses the provided dataframe instead of hardcoded sample data."""
        # Must use the provided dataframe variable.
        if "df" not in code:
            return False, "missing_df_usage"

        # Do not allow redefining df with handcrafted examples.
        if re.search(r"\bdf\s*=\s*pd\.DataFrame\s*\(", code):
            return False, "hardcoded_dataframe"

        # Do not allow hardcoded sample dict/list payloads as source data.
        if re.search(r"\bdata\s*=\s*\{", code) or re.search(r"\bdata\s*=\s*\[", code):
            return False, "hardcoded_data"

        # output_path is injected by runtime and must not be overwritten.
        if re.search(r"\boutput_path\s*=", code):
            return False, "overwrites_output_path"

        # Must save figure using provided output_path.
        if "savefig(output_path)" not in code.replace(" ", ""):
            return False, "missing_output_path_save"

        return True, None

    def _extract_referenced_columns(self, code: str) -> set[str]:
        """Extract literal dataframe column names referenced in generated code."""
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
        """Validate generated code against dataset metadata."""
        issues: list[str] = []

        is_valid_code, reason = self._validate_generated_python_code(code)
        if not is_valid_code and reason is not None:
            issues.append(reason)

        available_columns = {str(column) for column in dataset_df.columns}
        referenced_columns = self._extract_referenced_columns(code)
        unknown_columns = sorted(referenced_columns - available_columns)
        if unknown_columns:
            issues.append(f"unknown_columns:{','.join(unknown_columns)}")

        return len(issues) == 0, issues

    def _assess_pre_execution_visual_issues(self, code: str, dataset_df: pd.DataFrame) -> list[str]:
        """Check likely readability issues before rendering a chart."""
        issues: list[str] = []
        metadata_by_name = {str(row["name"]): row for row in self._dataset_metadata_rows(dataset_df)}
        referenced_columns = self._extract_referenced_columns(code)
        crowded_columns = [
            column for column in referenced_columns
            if int(metadata_by_name.get(column, {}).get("unique_count", 0)) > 20
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

        if len(referenced_columns) > 10 and ".plot(" in code and "figsize=" not in normalized_code:
            issues.append("many_series_without_figsize")

        return issues

    def _extract_review_result_from_json(self, raw_text: str) -> dict | None:
        text = raw_text.strip()
        if text.startswith("```"):
            text = re.sub(r"^```(?:json)?\\n", "", text)
            text = re.sub(r"\\n```$", "", text)

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

        if not isinstance(payload, dict):
            return None

        issues = payload.get("issues", [])
        return {
            "approved": bool(payload.get("approved", False)),
            "issues": [str(issue) for issue in issues] if isinstance(issues, list) else [],
            "python_code": payload.get("python_code") if isinstance(payload.get("python_code"), str) else None,
        }

    def _encode_image_as_data_url(self, image_path: str) -> str:
        with open(image_path, "rb") as handle:
            encoded = base64.b64encode(handle.read()).decode("ascii")
        return f"data:image/png;base64,{encoded}"

    def _request_action_from_model(
        self,
        client: OpenAI,
        system_prompt: str,
        user_prompt: str,
    ) -> dict | None:
        response = client.chat.completions.create(  # type: ignore[arg-type]
            model=self.model_name,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],  # type: ignore[arg-type]
            temperature=0.2,
        )
        assistant_text_raw = getattr(response.choices[0].message, "content", None)
        if assistant_text_raw is None:
            return None
        return self._extract_action_from_json(str(assistant_text_raw).strip())

    def _review_and_regenerate_diagram_action(
        self,
        client: OpenAI,
        question: str,
        history_text: str,
        dataset_df: pd.DataFrame,
        dataset_context: str,
        metadata_context: str,
        action: dict,
    ) -> dict:
        """Validate diagram action and ask the model to regenerate once if needed."""
        code = action.get("python_code")
        if not isinstance(code, str):
            return self._default_diagram_action()

        is_valid, issues = self._validate_code_against_metadata(code, dataset_df)
        visual_issues = self._assess_pre_execution_visual_issues(code, dataset_df)
        issues.extend([issue for issue in visual_issues if issue not in issues])
        if is_valid and not visual_issues:
            return action

        review_system_prompt = (
            "Du bist ein Review-Agent fuer Diagramm-Code. "
            "Pruefe, ob der Code ausschliesslich das vorhandene DataFrame df nutzt, fachlich zu den Datensatz-Metadaten passt "
            "und voraussichtlich visuell lesbar ist. "
            "Wenn nicht, generiere KORRIGIERTEN Code. Antworte nur als JSON mit type, assistant_text, python_code."
        )
        review_user_prompt = (
            "Datensatz-Kontext:\n"
            + dataset_context
            + "\n\nDatensatz-Metadaten:\n"
            + metadata_context
            + "\n\nChat-Verlauf:\n"
            + history_text
            + "\n\nFrage: "
            + question
            + "\n\nAktueller Diagramm-Code:\n"
            + code
            + "\n\nValidierungsprobleme:\n"
            + json.dumps(issues, ensure_ascii=True)
            + "\n\nAnforderungen: Nutze nur df; keine Beispiel-Daten; keine neue pd.DataFrame-Erzeugung; output_path nicht ueberschreiben; fig.savefig(output_path) verwenden; bei vielen Kategorien Top-N/Begrenzung, Rotation, figsize und tight_layout beruecksichtigen."
        )

        regenerated_action = self._request_action_from_model(client, review_system_prompt, review_user_prompt)
        if regenerated_action is not None and regenerated_action.get("type") == "diagram":
            regenerated_code = regenerated_action.get("python_code")
            if isinstance(regenerated_code, str):
                regenerated_valid, regenerated_issues = self._validate_code_against_metadata(regenerated_code, dataset_df)
                regenerated_visual_issues = self._assess_pre_execution_visual_issues(regenerated_code, dataset_df)
                if regenerated_valid and not regenerated_visual_issues:
                    return regenerated_action
                issues = regenerated_issues + regenerated_visual_issues

        fallback = self._default_diagram_action()
        fallback["assistant_text"] = (
            "Ich habe ein Diagramm erstellt. Der Modell-Code passte nicht zu den Datensatz-Metadaten "
            f"({', '.join(issues)}) und wurde durch sicheren df-basierten Fallback-Code ersetzt."
        )
        return fallback

    def review_rendered_image(
        self,
        question: str,
        history_text: str,
        dataset_df: pd.DataFrame,
        image_path: str,
        current_code: str,
    ) -> dict:
        """Review the rendered image and optionally provide improved code."""
        api_key = (os.getenv("OPENAI_API_KEY") or "").strip().strip('"').strip("'")
        if not api_key:
            return {"approved": True, "issues": [], "python_code": None}

        is_valid, _ = self.validate_api_key(api_key)
        if not is_valid:
            return {"approved": True, "issues": [], "python_code": None}

        client = OpenAI(api_key=api_key)
        dataset_context = self._build_dataset_context(dataset_df)
        metadata_context = self._build_dataset_metadata(dataset_df)
        image_data_url = self._encode_image_as_data_url(image_path)
        system_prompt = (
            "Du bist ein Visual-Review-Agent fuer Diagramme. "
            "Bewerte, ob das Diagramm visuell lesbar und fachlich sinnvoll ist. "
            "Achte auf ueberlappende Labels, abgeschnittene Achsentexte, zu viele Kategorien und unlesbare Darstellung. "
            "Antworte nur als JSON mit approved, issues, python_code."
        )

        user_content = [
            {
                "type": "text",
                "text": (
                    "Datensatz-Kontext:\n"
                    + dataset_context
                    + "\n\nDatensatz-Metadaten:\n"
                    + metadata_context
                    + "\n\nChat-Verlauf:\n"
                    + history_text
                    + "\n\nFrage: "
                    + question
                    + "\n\nAktueller Code:\n"
                    + current_code
                    + "\n\nWenn das Diagramm nicht gut ist, liefere verbesserten python_code."
                    + " Nutze nur df, keine Beispiel-Daten, output_path nicht ueberschreiben, fig.savefig(output_path) verwenden."
                ),
            },
            {"type": "image_url", "image_url": {"url": image_data_url}},
        ]
        review_messages: Any = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ]

        try:
            response = client.chat.completions.create(
                model=self.model_name,
                messages=review_messages,
                temperature=0.1,
            )
            assistant_text_raw = getattr(response.choices[0].message, "content", None)
            if assistant_text_raw is None:
                return {"approved": True, "issues": [], "python_code": None}

            review_result = self._extract_review_result_from_json(str(assistant_text_raw).strip())
            if review_result is None:
                return {"approved": True, "issues": [], "python_code": None}

            review_code = review_result.get("python_code")
            if review_result.get("approved") is False and isinstance(review_code, str) and review_code.strip():
                valid, issues = self._validate_code_against_metadata(review_code, dataset_df)
                visual_issues = self._assess_pre_execution_visual_issues(review_code, dataset_df)
                if valid and not visual_issues:
                    return review_result
                return {
                    "approved": False,
                    "issues": list(review_result.get("issues", [])) + issues + visual_issues,
                    "python_code": None,
                }

            return review_result
        except Exception:
            return {"approved": True, "issues": [], "python_code": None}

    def choose_action(self, question: str, history_text: str, dataset_df: pd.DataFrame) -> dict:
        q = question.lower()

        api_key = (os.getenv("OPENAI_API_KEY") or "").strip().strip('"').strip("'")
        if not api_key:
            assistant_text = (
                "Kein OPENAI_API_KEY gesetzt. Antwort wird lokal simuliert. "
                "Verwende OPENAI_API_KEY für GPT-4o-mini-Ausgabe."
            )
            return {"type": "text", "assistant_text": assistant_text}

        # API Key validieren
        is_valid, reason = self.validate_api_key(api_key)
        if not is_valid:
            if reason == "auth":
                assistant_text = (
                    "OPENAI_API_KEY ist ungültig oder widerrufen. Antwort wird lokal simuliert. "
                    "Bitte generiere einen neuen API-Key im OpenAI Dashboard."
                )
            elif reason == "connection":
                assistant_text = (
                    "OpenAI ist aktuell nicht erreichbar (Netzwerk/Firewall). Antwort wird lokal simuliert. "
                    "Prüfe Internetzugang und Proxy-Einstellungen."
                )
            elif reason == "rate_limit":
                assistant_text = (
                    "OpenAI Rate Limit/Quota erreicht. Antwort wird lokal simuliert. "
                    "Prüfe Billing und Usage Limits."
                )
            else:
                assistant_text = (
                    "OpenAI-Validierung fehlgeschlagen. Antwort wird lokal simuliert. "
                    "Prüfe API-Key und OpenAI-Konfiguration."
                )
            return {"type": "text", "assistant_text": assistant_text}

        client = OpenAI(api_key=api_key)

        dataset_context = self._build_dataset_context(dataset_df)
        metadata_context = self._build_dataset_metadata(dataset_df)
        system_prompt = (
            "Du bist ein Datenanalyse-Assistent. "
            "Arbeite immer auf dem gesamten geladenen DataFrame df, nicht auf Beispiel- oder Teil-Daten. "
            "Nutze den bereitgestellten Datensatz-Kontext direkt und frage NICHT erneut nach dem DataFrame. "
            "Wenn der Nutzer nach Visualisierung fragt, liefere eine präzise, kurze fachliche Antwort."
        )
        user_prompt = (
            "Datensatz-Kontext:\n"
            + dataset_context
            + "\n\nDatensatz-Metadaten:\n"
            + metadata_context
            + "\n\nChat-Verlauf:\n"
            + history_text
            + "\n\nFrage: "
            + question
            + "\n\nWICHTIGES AUSGABEFORMAT: Antworte NUR als JSON-Objekt ohne Markdown."
            + " Erlaubte Felder: type, assistant_text, python_code."
            + " type muss 'text' oder 'diagram' sein."
            + " Wenn type='diagram', liefere python_code mit ausführbarem matplotlib-Code."
            + " Nutze ausschließlich das bereits vorhandene DataFrame 'df' als Datenquelle."
            + " Beziehe dich fachlich auf den gesamten geladenen Datensatz, nicht nur auf die Vorschau."
            + " Erstelle KEINE Beispiel-Daten (kein data={...}, keine neue pd.DataFrame(...)-Erzeugung)."
            + " Der Code MUSS output_path verwenden: fig.savefig(output_path)."
            + " Setze output_path NICHT neu."
        )

        try:
            parsed_action = self._request_action_from_model(client, system_prompt, user_prompt)
            if parsed_action is not None:
                if parsed_action.get("type") == "diagram":
                    return self._review_and_regenerate_diagram_action(
                        client,
                        question,
                        history_text,
                        dataset_df,
                        dataset_context,
                        metadata_context,
                        parsed_action,
                    )
                return parsed_action

            if any(k in q for k in ["diagram", "chart", "plot", "visual"]):
                return self._default_diagram_action()

            return {"type": "text", "assistant_text": "OpenAI hat keine Antwort geliefert."}
        except Exception:
            if any(k in q for k in ["diagram", "chart", "plot", "visual"]):
                return self._default_diagram_action()
            assistant_text = (
                "OpenAI-Aufruf fehlgeschlagen (FALLBACK). "
                "Stelle sicher, dass der OPENAI_API_KEY korrekt ist."
            )
            return {"type": "text", "assistant_text": assistant_text}

    def execute_code(self, code: str, dataset_df: pd.DataFrame, output_path: str) -> str:

        safe_builtins: dict[str, Any] = {
            "__import__": __import__,
            "len": len,
            "min": min,
            "max": max,
            "sum": sum,
            "abs": abs,
            "round": round,
            "range": range,
            "enumerate": enumerate,
            "zip": zip,
            "str": str,
            "int": int,
            "float": float,
            "bool": bool,
            "list": list,
            "dict": dict,
            "set": set,
            "tuple": tuple,
        }
        local_vars: dict[str, Any] = {
            "df": dataset_df,
            "plt": plt,
            "pd": pd,
            "output_path": output_path,
        }

        try:
            exec(code, {"__builtins__": safe_builtins}, local_vars)
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Codeausfuehrung fehlgeschlagen: {exc}") from exc

        if not os.path.exists(output_path):
            raise HTTPException(status_code=500, detail="Diagramm konnte nicht erzeugt werden")
        return output_path