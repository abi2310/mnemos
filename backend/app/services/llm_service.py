from __future__ import annotations

import os
from typing import TypeVar

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from pydantic import BaseModel

from app.schemas.agent import (
    AggregationOp,
    AnalysisPlan,
    ChartSpec,
    ChartType,
    ClarificationRequest,
    DatasetProfile,
    IntentResult,
    OutputMode,
    ReviewResult,
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
                "Entscheide, ob der Nutzer eine Textantwort oder ein Diagramm benötigt, "
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
        return ChatOpenAI(model=self.model_name, temperature=self.temperature, api_key=api_key)

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
                "columns": profile.column_count,
                "numeric_columns": profile.numeric_columns,
                "categorical_columns": profile.categorical_columns,
                "time_columns": profile.time_columns,
                "potential_issues": profile.potential_issues,
                "columns": columns,
            }
        )

    def _heuristic_intent(self, question: str, profile: DatasetProfile) -> IntentResult:
        lowered = question.lower()
        output_mode = OutputMode.CHART if any(token in lowered for token in ("chart", "plot", "diagram", "visual")) else OutputMode.TEXT
        referenced_columns = [column.name for column in profile.columns if column.name.lower() in lowered]
        requires_clarification = (
            (output_mode == OutputMode.CHART and len(question.split()) < 4)
            or ("best" in lowered and not referenced_columns)
            or ("compare" in lowered and len(referenced_columns) < 2 and len(profile.numeric_columns) > 1)
        )
        multiple_valid_solutions = "trend" in lowered and bool(profile.time_columns) and len(profile.numeric_columns) > 1
        approaches = []
        if output_mode == OutputMode.CHART:
            approaches.append("grouped comparison chart")
            if profile.time_columns:
                approaches.append("time trend chart")
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
            if intent.recommended_output_mode == OutputMode.CHART and profile.categorical_columns:
                selected_columns.append(profile.categorical_columns[0])
            if profile.numeric_columns:
                selected_columns.append(profile.numeric_columns[0])
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
            aggregations=[AggregationOp.COUNT] if intent.recommended_output_mode == OutputMode.CHART else [],
            output_mode=intent.recommended_output_mode,
            approval_required=approval_required,
            approval_reason="The clarification answer marked this as sensitive." if approval_required else None,
            rationale="The plan keeps the workflow deterministic and avoids arbitrary code execution.",
        )

    def _heuristic_chart_spec(self, question: str, plan: AnalysisPlan, profile: DatasetProfile) -> ChartSpec:
        lowered = question.lower()
        x_column = next(iter(plan.selected_columns), None) or (profile.categorical_columns[0] if profile.categorical_columns else profile.columns[0].name)
        y_column = None
        chart_type = ChartType.BAR

        if "hist" in lowered or "distribution" in lowered:
            chart_type = ChartType.HISTOGRAM
            x_column = profile.numeric_columns[0] if profile.numeric_columns else x_column
        elif "scatter" in lowered and len(profile.numeric_columns) >= 2:
            chart_type = ChartType.SCATTER
            x_column = profile.numeric_columns[0]
            y_column = profile.numeric_columns[1]
        elif ("line" in lowered or "trend" in lowered) and profile.time_columns and profile.numeric_columns:
            chart_type = ChartType.LINE
            x_column = profile.time_columns[0]
            y_column = profile.numeric_columns[0]
        else:
            if len(plan.selected_columns) > 1:
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
