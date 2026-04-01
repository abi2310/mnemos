from __future__ import annotations

import os
import re
from typing import TypeVar

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, SecretStr

from app.schemas.agent import (
    AggregationOp,
    AnalysisPlan,
    ChartSpec,
    ChartType,
    ClarificationRequest,
    CodeReviewResult,
    DashboardSpec,
    DatasetProfile,
    FreeCodeSpec,
    IntentResult,
    OutputMode,
    ReviewIssue,
    ReviewResult,
    SandboxResult,
    SortDirection,
    TextAnswerSpec,
)


StructuredModel = TypeVar("StructuredModel", bound=BaseModel)


class LLMService:
    def __init__(self, model_name: str = "gpt-4o-mini", temperature: float = 0.1):
        self.model_name = model_name
        self.temperature = temperature

    def interpret_request(self, question: str, history_text: str, profile: DatasetProfile) -> IntentResult:
        fallback = self._heuristic_intent(question, profile)
        return self._invoke_structured(
            response_model=IntentResult,
            system_prompt=(
                "Du bist ein Analytics-Assistent. Antworte immer auf Deutsch. "
                "Entscheide, ob der Nutzer eine Textantwort, ein einzelnes Diagramm, ein Dashboard mit mehreren Diagrammen "
                "oder freien Code benötigt, "
                "erkenne Mehrdeutigkeiten und halte das Ergebnis präzise und strukturiert."
            ),
            user_prompt=(
                f"Question: {question}\n"
                f"History: {history_text}\n"
                f"Dataset profile: {self._profile_summary(profile)}\n"
            ),
            fallback=fallback,
        )

    def build_clarification_request(self, question: str, intent: IntentResult, profile: DatasetProfile) -> ClarificationRequest:
        options = intent.candidate_approaches[:3] or [
            "Wichtigste Kennzahl als Text zusammenfassen",
            "Gruppierten Vergleich als Diagramm erstellen",
            "Zeitlichen Verlauf anzeigen",
        ]
        fallback = ClarificationRequest(
            reason=intent.ambiguity_reason or "The request allows multiple valid analyses.",
            question=f"Was soll ich bei '{question}' optimieren?",
            options=options,
        )
        return self._invoke_structured(
            response_model=ClarificationRequest,
            system_prompt=(
                "Du bist ein Analytics-Assistent. Antworte immer auf Deutsch. "
                "Stelle eine einzige, präzise Rückfrage für einen Datenanalyse-Workflow."
            ),
            user_prompt=(
                f"Question: {question}\n"
                f"Intent: {intent.model_dump_json()}\n"
                f"Dataset profile: {self._profile_summary(profile)}\n"
            ),
            fallback=fallback,
        )

    def build_analysis_plan(
        self,
        question: str,
        clarification_answer: str | None,
        intent: IntentResult,
        profile: DatasetProfile,
    ) -> AnalysisPlan:
        fallback = self._heuristic_plan(question, clarification_answer, intent, profile)
        return self._invoke_structured(
            response_model=AnalysisPlan,
            system_prompt=(
                "Du bist ein Analytics-Assistent. Antworte immer auf Deutsch. "
                "Erstelle einen produktionsreifen Analyseplan. Bevorzuge deterministische Ausführung. "
                "Schlage keinen freien Python-Code vor."
            ),
            user_prompt=(
                f"Question: {question}\n"
                f"Clarification answer: {clarification_answer or 'none'}\n"
                f"Intent: {intent.model_dump_json()}\n"
                f"Dataset profile: {self._profile_summary(profile)}\n"
            ),
            fallback=fallback,
        )

    def generate_chart_spec(
        self,
        question: str,
        plan: AnalysisPlan,
        profile: DatasetProfile,
        revision_context: list[str] | None = None,
    ) -> ChartSpec:
        fallback = self._heuristic_chart_spec(question, plan, profile)
        return self._invoke_structured(
            response_model=ChartSpec,
            system_prompt=(
                "Du bist ein Analytics-Assistent. Antworte immer auf Deutsch. "
                "Erstelle eine Diagrammspezifikation für deterministische Darstellung. "
                "Wähle nur Felder, die ohne freien Code gerendert werden können."
            ),
            user_prompt=(
                f"Question: {question}\n"
                f"Plan: {plan.model_dump_json()}\n"
                f"Dataset profile: {self._profile_summary(profile)}\n"
                f"Revision context: {revision_context or []}\n"
            ),
            fallback=fallback,
        )

    def generate_dashboard_spec(
        self,
        question: str,
        plan: AnalysisPlan,
        profile: DatasetProfile,
        revision_context: list[str] | None = None,
    ) -> DashboardSpec:
        fallback = self._heuristic_dashboard_spec(question, plan, profile)
        return self._invoke_structured(
            response_model=DashboardSpec,
            system_prompt=(
                "Du bist ein Analytics-Assistent. Antworte immer auf Deutsch. "
                "Erstelle eine Dashboard-Spezifikation mit 2 bis 4 deterministisch renderbaren Diagrammen. "
                "Wähle nur Felder, die ohne freien Code gerendert werden können. "
                "Vermeide doppelte Diagramme mit identischer Aussage."
            ),
            user_prompt=(
                f"Question: {question}\n"
                f"Plan: {plan.model_dump_json()}\n"
                f"Dataset profile: {self._profile_summary(profile)}\n"
                f"Revision context: {revision_context or []}\n"
            ),
            fallback=fallback,
        )

    def generate_text_answer(
        self,
        question: str,
        plan: AnalysisPlan,
        profile: DatasetProfile,
    ) -> TextAnswerSpec:
        fallback = self._heuristic_text_answer(question, plan, profile)
        return self._invoke_structured(
            response_model=TextAnswerSpec,
            system_prompt=(
                "Du bist ein Analytics-Assistent. Antworte immer auf Deutsch. "
                "Gib eine präzise, strukturierte Analyse-Antwort. Nenne Annahmen und Einschränkungen, "
                "aber erfinde keine Zahlenwerte."
            ),
            user_prompt=(
                f"Question: {question}\n"
                f"Plan: {plan.model_dump_json()}\n"
                f"Dataset profile: {self._profile_summary(profile)}\n"
            ),
            fallback=fallback,
        )

    def review_chart(
        self,
        question: str,
        profile: DatasetProfile,
        chart_spec: ChartSpec,
        artifact_path: str,
    ) -> ReviewResult:
        fallback = ReviewResult(approved=True, issues=[])
        return self._invoke_structured(
            response_model=ReviewResult,
            system_prompt=(
                "Du bist ein Analytics-Assistent. Antworte immer auf Deutsch. "
                "Überprüfe das gerenderte Diagramm. Markiere Lesbarkeits- oder Analyseprobleme nur, wenn sie konkret sind."
            ),
            user_prompt=(
                f"Question: {question}\n"
                f"Chart spec: {chart_spec.model_dump_json()}\n"
                f"Artifact path: {artifact_path}\n"
                f"Dataset profile: {self._profile_summary(profile)}\n"
            ),
            fallback=fallback,
        )

    def generate_free_code(
        self,
        question: str,
        plan: AnalysisPlan,
        profile: DatasetProfile,
        revision_context: list[str] | None = None,
    ) -> FreeCodeSpec:
        fallback = self._heuristic_free_code(question, plan, profile)
        return self._invoke_structured(
            response_model=FreeCodeSpec,
            system_prompt=(
                "Du bist ein Analytics-Assistent. Generiere fokussierten, sicheren Python-Code "
                "für eine isolierte Sandbox-Ausführung. "
                "Der Code hat Zugriff auf: 'df' (pandas DataFrame) und 'OUTPUT_PATH' (str, Ausgabepfad). "
                "Erlaubte Imports: pandas, numpy, matplotlib, seaborn. "
                "Speichere Diagramme mit plt.savefig(OUTPUT_PATH, bbox_inches='tight') und plt.close(). "
                "Für reine Textausgaben nutze print(). "
                "Greife niemals auf das Netzwerk oder Dateisystempfade außerhalb von OUTPUT_PATH zu."
            ),
            user_prompt=(
                f"Frage: {question}\n"
                f"Analyseplan: {plan.model_dump_json()}\n"
                f"Dataset-Profil: {self._profile_summary(profile)}\n"
                f"Überarbeitungshinweise: {revision_context or []}\n"
            ),
            fallback=fallback,
        )

    def review_sandbox_output(
        self,
        question: str,
        profile: DatasetProfile | None,
        free_code_spec: FreeCodeSpec,
        sandbox_result: SandboxResult,
    ) -> CodeReviewResult:
        if not sandbox_result.success:
            return CodeReviewResult(
                approved=False,
                issues=[
                    ReviewIssue(
                        code="sandbox_error",
                        message=sandbox_result.stderr[:500] or "Sandbox execution failed.",
                    )
                ],
                revision_hint="Fix the execution error in the generated code.",
            )
        fallback = CodeReviewResult(approved=True, issues=[])
        return self._invoke_structured(
            response_model=CodeReviewResult,
            system_prompt=(
                "Du bist ein Analytics-Reviewer. Antworte immer auf Deutsch. "
                "Überprüfe den generierten Python-Code und das Sandbox-Ergebnis. "
                "Markiere Probleme nur, wenn sie die Qualität oder Korrektheit der Analyse beeinträchtigen."
            ),
            user_prompt=(
                f"Frage: {question}\n"
                f"Code-Ziel: {free_code_spec.code_goal}\n"
                f"Code:\n{free_code_spec.code}\n"
                f"Sandbox stdout:\n{sandbox_result.stdout[:1000]}\n"
                f"Sandbox stderr:\n{sandbox_result.stderr[:500]}\n"
                f"Artefakt erzeugt: {'ja' if sandbox_result.artifact_path else 'nein'}\n"
            ),
            fallback=fallback,
        )

    def _invoke_structured(
        self,
        response_model: type[StructuredModel],
        system_prompt: str,
        user_prompt: str,
        fallback: StructuredModel,
    ) -> StructuredModel:
        model = self._build_model()
        if model is None:
            return fallback
        try:
            structured_model = model.with_structured_output(response_model)
            result = structured_model.invoke(
                [
                    SystemMessage(content=system_prompt),
                    HumanMessage(content=user_prompt),
                ]
            )
            if isinstance(result, response_model):
                return result
            return response_model.model_validate(result)
        except Exception:
            return fallback

    def _build_model(self) -> ChatOpenAI | None:
        api_key = (os.getenv("OPENAI_API_KEY") or "").strip().strip('"').strip("'")
        if not api_key:
            return None
        return ChatOpenAI(
            model=self.model_name,
            temperature=self.temperature,
            api_key=SecretStr(api_key),
        )

    def _profile_summary(self, profile: DatasetProfile) -> str:
        columns = [
            {
                "name": column.name,
                "semantic_type": column.semantic_type,
                "unique_count": column.unique_count,
                "null_ratio": column.null_ratio,
            }
            for column in profile.columns[:20]
        ]
        return str(
            {
                "rows": profile.row_count,
                "column_count": profile.column_count,
                "numeric_columns": profile.numeric_columns,
                "categorical_columns": profile.categorical_columns,
                "time_columns": profile.time_columns,
                "potential_issues": profile.potential_issues,
                "columns": columns,
            }
        )

    def _normalize_phrase(self, text: str) -> str:
        normalized = text.lower().replace("_", " ")
        normalized = re.sub(r"[^a-z0-9\s]+", " ", normalized)
        normalized = re.sub(r"\s+", " ", normalized).strip()
        return normalized

    def _expand_query_terms(self, text: str) -> str:
        normalized = self._normalize_phrase(text)
        replacements = {
            "preise": "preise price prices",
            "preis": "preis price prices",
            "rabatt": "rabatt rabatt discount discounts",
            "rabatte": "rabatte discount discounts",
            "versandzeit": "versandzeit shipping delivery time",
            "versand": "versand shipping delivery",
            "stunden": "stunden hours",
            "social media": "social media social_media",
            "einkaufverhalten": "einkaufverhalten shopping purchase behavior",
            "zahlungsverhalten": "zahlungsverhalten payment payment behavior",
            "nutzungsverhalten": "nutzungsverhalten user behavior engagement",
            "retouren": "retouren returns return refunds",
            "retoure": "retoure returns return refunds",
            "kundenchurn": "kundenchurn churn retention",
            "groesse": "groesse size area",
            "größe": "groesse size area",
            "haeuser": "haeuser haus houses homes housing",
            "häuser": "haeuser haus houses homes housing",
        }
        for source, target in replacements.items():
            if source in normalized:
                normalized = normalized.replace(source, target)
        return normalized

    def _tokenize(self, text: str) -> list[str]:
        stopwords = {
            "und", "oder", "mit", "von", "der", "die", "das", "den", "dem", "des",
            "ein", "eine", "einer", "einem", "einen", "noch", "mehreren", "grafiken",
            "grafik", "diagramm", "diagramme", "dashboard", "erstelle", "zeige",
            "visualisiert", "visualisieren", "information", "informationen", "ueber",
            "über", "where", "whose", "their", "the", "for", "and", "mit", "wo",
        }
        return [
            token
            for token in self._expand_query_terms(text).split()
            if len(token) > 1 and token not in stopwords
        ]

    def _extract_referenced_columns(self, question: str, profile: DatasetProfile, limit: int = 6) -> list[str]:
        normalized_question = self._expand_query_terms(question)
        question_tokens = set(self._tokenize(question))
        scored_columns: list[tuple[float, str]] = []

        for column in profile.columns:
            normalized_column = self._normalize_phrase(column.name)
            column_tokens = set(self._tokenize(column.name))
            score = 0.0

            if normalized_column and normalized_column in normalized_question:
                score += 10.0

            overlap = question_tokens & column_tokens
            if overlap:
                score += float(len(overlap)) * 3.0
                score += float(len(overlap)) / float(max(len(column_tokens), 1))

            compact_column = normalized_column.replace(" ", "")
            compact_question = normalized_question.replace(" ", "")
            if compact_column and compact_column in compact_question:
                score += 4.0

            if score > 0:
                scored_columns.append((score, column.name))

        scored_columns.sort(key=lambda item: (-item[0], item[1]))
        ordered: list[str] = []
        for _, column_name in scored_columns:
            if column_name not in ordered:
                ordered.append(column_name)
            if len(ordered) >= limit:
                break
        return ordered

    def _column_map(self, profile: DatasetProfile) -> dict[str, str]:
        return {column.name: column.semantic_type for column in profile.columns}

    def _build_dashboard_candidates(self, selected_columns: list[str], profile: DatasetProfile) -> list[ChartSpec]:
        column_types = self._column_map(profile)
        selected_numeric = [column for column in selected_columns if column_types.get(column) == "numeric"]
        selected_categorical = [
            column
            for column in selected_columns
            if column_types.get(column) in {"categorical", "text", "boolean"}
        ]
        selected_time = [column for column in selected_columns if column_types.get(column) == "datetime"]

        fallback_numeric = [column for column in profile.numeric_columns if column not in selected_numeric]
        fallback_categorical = [column for column in profile.categorical_columns if column not in selected_categorical]
        fallback_time = [column for column in profile.time_columns if column not in selected_time]

        numeric_pool = selected_numeric + fallback_numeric
        categorical_pool = selected_categorical + fallback_categorical
        time_pool = selected_time + fallback_time

        charts: list[ChartSpec] = []

        if time_pool and numeric_pool:
            charts.append(
                ChartSpec(
                    chart_type=ChartType.LINE,
                    x_column=time_pool[0],
                    y_column=numeric_pool[0],
                    aggregation=AggregationOp.MEAN,
                    title=f"Trend von {numeric_pool[0]}",
                    rationale="Zeitlicher Verlauf einer im Prompt erwaehnten Kennzahl.",
                )
            )

        if categorical_pool and numeric_pool:
            charts.append(
                ChartSpec(
                    chart_type=ChartType.BAR,
                    x_column=categorical_pool[0],
                    y_column=numeric_pool[0],
                    aggregation=AggregationOp.MEAN,
                    sort_direction=SortDirection.DESC,
                    top_n=10,
                    title=f"{numeric_pool[0]} nach {categorical_pool[0]}",
                    rationale="Vergleich einer angefragten Kennzahl nach Kategorie.",
                )
            )
        elif categorical_pool:
            charts.append(
                ChartSpec(
                    chart_type=ChartType.BAR,
                    x_column=categorical_pool[0],
                    aggregation=AggregationOp.COUNT,
                    sort_direction=SortDirection.DESC,
                    top_n=10,
                    title=f"Verteilung von {categorical_pool[0]}",
                    rationale="Kategorienverteilung aus einer angefragten Spalte.",
                )
            )

        if len(numeric_pool) >= 2:
            charts.append(
                ChartSpec(
                    chart_type=ChartType.SCATTER,
                    x_column=numeric_pool[0],
                    y_column=numeric_pool[1],
                    title=f"{numeric_pool[0]} vs. {numeric_pool[1]}",
                    rationale="Zusammenhang zwischen zwei angefragten Kennzahlen.",
                )
            )

        used_histograms = {chart.y_column for chart in charts if chart.y_column}
        for numeric_column in numeric_pool:
            if len(charts) >= 4:
                break
            if numeric_column in used_histograms:
                continue
            charts.append(
                ChartSpec(
                    chart_type=ChartType.HISTOGRAM,
                    x_column=numeric_column,
                    title=f"Verteilung von {numeric_column}",
                    rationale="Verteilung einer im Prompt genannten Kennzahl.",
                )
            )

        unique_charts: list[ChartSpec] = []
        seen_signatures: set[tuple[str, str, str | None]] = set()
        for chart in charts:
            signature = (chart.chart_type.value, chart.x_column, chart.y_column)
            if signature not in seen_signatures:
                unique_charts.append(chart)
                seen_signatures.add(signature)
        return unique_charts[:4]

    def _heuristic_intent(self, question: str, profile: DatasetProfile) -> IntentResult:
        lowered = question.lower()
        _complex_keywords = (
            "heatmap", "korrelation", "korrelationsmatrix", "regression",
            "cluster", "pivot", "subplots", "mehrere diagramme",
        )
        _dashboard_keywords = ("dashboard", "mehrere grafiken", "mehrere diagramme", "mehrere charts", "cockpit")
        _chart_keywords = ("chart", "plot", "diagram", "visual", "zeige", "zeichne")
        requested_chart_count = max(
            [int(match) for match in re.findall(r"\b(\d+)\s+(?:grafiken|grafik|diagramme|diagramm|charts|chart)\b", lowered)]
            or [0]
        )
        is_dashboard = any(kw in lowered for kw in _dashboard_keywords)
        is_complex = any(kw in lowered for kw in _complex_keywords)
        is_chart = any(kw in lowered for kw in _chart_keywords)
        if is_dashboard or requested_chart_count > 1:
            output_mode = OutputMode.DASHBOARD
        elif is_complex or is_chart:
            output_mode = OutputMode.FREE_CODE
        else:
            output_mode = OutputMode.TEXT
        referenced_columns = self._extract_referenced_columns(question, profile)
        requires_clarification = (
            (output_mode in {OutputMode.FREE_CODE, OutputMode.DASHBOARD} and len(question.split()) < 4)
            or ("best" in lowered and not referenced_columns)
            or ("compare" in lowered and len(referenced_columns) < 2 and len(profile.numeric_columns) > 1)
        )
        multiple_valid_solutions = "trend" in lowered and bool(profile.time_columns) and len(profile.numeric_columns) > 1
        approaches = []
        if output_mode in {OutputMode.CHART, OutputMode.DASHBOARD, OutputMode.FREE_CODE}:
            approaches.append("grouped comparison chart")
            if profile.time_columns:
                approaches.append("time trend chart")
            if output_mode == OutputMode.DASHBOARD:
                approaches.append("multi-chart dashboard")
        else:
            approaches.append("high-level textual summary")
            approaches.append("focused metric explanation")
        return IntentResult(
            objective=question,
            recommended_output_mode=output_mode,
            requires_clarification=requires_clarification,
            multiple_valid_solutions=multiple_valid_solutions,
            ambiguity_reason=(
                "The request is underspecified or multiple chart strategies are plausible."
                if requires_clarification or multiple_valid_solutions
                else None
            ),
            candidate_approaches=approaches,
            referenced_columns=referenced_columns,
            confidence=0.45 if requires_clarification else 0.82,
        )

    def _heuristic_plan(
        self,
        question: str,
        clarification_answer: str | None,
        intent: IntentResult,
        profile: DatasetProfile,
    ) -> AnalysisPlan:
        selected_columns = intent.referenced_columns[:]
        if not selected_columns:
            selected_columns = self._extract_referenced_columns(question, profile)
        if not selected_columns:
            if profile.time_columns:
                selected_columns.append(profile.time_columns[0])
            if profile.categorical_columns:
                selected_columns.append(profile.categorical_columns[0])
            if profile.numeric_columns:
                selected_columns.extend(profile.numeric_columns[:2])
        approval_required = "sensitive" in (clarification_answer or "").lower()
        return AnalysisPlan(
            objective=question,
            strategy_summary=clarification_answer or "Answer using the profiled dataset context and deterministic rendering.",
            steps=[
                "Use the profiled schema to choose safe fields",
                "Build a deterministic output specification",
                "Render or finalize without executing arbitrary code",
            ],
            selected_columns=selected_columns,
            filters=[],
            aggregations=[AggregationOp.COUNT] if intent.recommended_output_mode == OutputMode.FREE_CODE else [],
            output_mode=intent.recommended_output_mode,
            approval_required=approval_required,
            approval_reason="The clarification answer marked this as sensitive." if approval_required else None,
            rationale="The plan keeps the workflow deterministic and avoids arbitrary code execution.",
        )

    def _heuristic_chart_spec(self, question: str, plan: AnalysisPlan, profile: DatasetProfile) -> ChartSpec:
        lowered = question.lower()
        column_types = self._column_map(profile)
        selected_numeric = [column for column in plan.selected_columns if column_types.get(column) == "numeric"]
        selected_categorical = [
            column for column in plan.selected_columns if column_types.get(column) in {"categorical", "text", "boolean"}
        ]
        selected_time = [column for column in plan.selected_columns if column_types.get(column) == "datetime"]

        x_column = next(
            iter(selected_categorical or selected_time or selected_numeric),
            None,
        ) or (profile.categorical_columns[0] if profile.categorical_columns else profile.columns[0].name)
        y_column = None
        chart_type = ChartType.BAR

        if "hist" in lowered or "distribution" in lowered:
            chart_type = ChartType.HISTOGRAM
            x_column = next(iter(selected_numeric), None) or (profile.numeric_columns[0] if profile.numeric_columns else x_column)
        elif "scatter" in lowered and len(selected_numeric or profile.numeric_columns) >= 2:
            chart_type = ChartType.SCATTER
            numeric_pool = selected_numeric or profile.numeric_columns
            x_column = numeric_pool[0]
            y_column = numeric_pool[1]
        elif ("line" in lowered or "trend" in lowered) and (selected_time or profile.time_columns) and (selected_numeric or profile.numeric_columns):
            chart_type = ChartType.LINE
            x_column = next(iter(selected_time), None) or profile.time_columns[0]
            y_column = next(iter(selected_numeric), None) or profile.numeric_columns[0]
        else:
            if selected_categorical and selected_numeric:
                x_column = selected_categorical[0]
                y_column = selected_numeric[0]
            elif len(selected_numeric) >= 2:
                chart_type = ChartType.SCATTER
                x_column = selected_numeric[0]
                y_column = selected_numeric[1]
            elif selected_numeric:
                chart_type = ChartType.HISTOGRAM
                x_column = selected_numeric[0]
            elif len(plan.selected_columns) > 1:
                y_column = plan.selected_columns[1]
            elif profile.numeric_columns:
                y_column = profile.numeric_columns[0]

        return ChartSpec(
            chart_type=chart_type,
            x_column=x_column,
            y_column=y_column,
            aggregation=AggregationOp.MEAN if y_column and chart_type in {ChartType.BAR, ChartType.LINE} else AggregationOp.COUNT if chart_type == ChartType.BAR else None,
            sort_direction=SortDirection.DESC if chart_type == ChartType.BAR else None,
            top_n=10 if chart_type == ChartType.BAR else None,
            title=f"{chart_type.value.title()} for {question}",
            rationale="The spec uses profiled dataset columns and a deterministic renderer path.",
        )

    def _heuristic_dashboard_spec(
        self,
        question: str,
        plan: AnalysisPlan,
        profile: DatasetProfile,
    ) -> DashboardSpec:
        selected_columns = plan.selected_columns or self._extract_referenced_columns(question, profile)
        charts = self._build_dashboard_candidates(selected_columns, profile)

        return DashboardSpec(
            title=f"Dashboard: {question[:80]}",
            rationale="Mehrere komplementaere Diagramme, priorisiert nach den im Prompt genannten Feldern.",
            charts=charts,
        )

    def _heuristic_text_answer(self, question: str, plan: AnalysisPlan, profile: DatasetProfile) -> TextAnswerSpec:
        cited_columns = plan.selected_columns or profile.numeric_columns[:1] or [profile.columns[0].name]
        return TextAnswerSpec(
            answer_markdown=(
                f"The request will be answered using a deterministic analysis plan over {profile.row_count} rows and "
                f"{profile.column_count} columns. Focus columns: {', '.join(cited_columns)}."
            ),
            rationale="The answer is structured from the dataset profile and selected plan, without generating executable code.",
            cited_columns=cited_columns,
            caveats=["This fallback answer does not compute live statistics without an execution node."],
        )

    def _heuristic_free_code(
        self, question: str, plan: AnalysisPlan, profile: DatasetProfile
    ) -> FreeCodeSpec:
        selected = plan.selected_columns[:2] if plan.selected_columns else profile.numeric_columns[:2]
        if len(selected) >= 2:
            code = (
                f"fig, ax = plt.subplots(figsize=(10, 6))\n"
                f"ax.scatter(df[{selected[0]!r}], df[{selected[1]!r}], alpha=0.7)\n"
                f"ax.set_xlabel({selected[0]!r})\n"
                f"ax.set_ylabel({selected[1]!r})\n"
                f"ax.set_title({question[:60]!r})\n"
                f"plt.tight_layout()\n"
                f"plt.savefig(OUTPUT_PATH, bbox_inches='tight')\n"
                f"plt.close()\n"
            )
            artifact_filename = "chart.png"
        elif selected:
            code = (
                f"fig, ax = plt.subplots(figsize=(10, 6))\n"
                f"df[{selected[0]!r}].hist(ax=ax, bins=20)\n"
                f"ax.set_title({question[:60]!r})\n"
                f"plt.tight_layout()\n"
                f"plt.savefig(OUTPUT_PATH, bbox_inches='tight')\n"
                f"plt.close()\n"
            )
            artifact_filename = "chart.png"
        else:
            code = "print(df.describe().to_string())\n"
            artifact_filename = ""
        return FreeCodeSpec(
            code=code,
            artifact_filename=artifact_filename,
            code_goal=f"Exploratory analysis: {question[:80]}",
            rationale="Heuristic fallback: LLM not available.",
        )
