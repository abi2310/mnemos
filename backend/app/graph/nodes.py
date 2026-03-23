from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import mimetypes
import re
import shutil
import subprocess
import sys
import tempfile

from langgraph.types import interrupt

from app.policies.agent_policies import AgentPolicyEngine
from app.renderers.chart_renderer import ChartRenderer
from app.schemas.agent import (
    ClarificationRequest,
    FinalResponse,
    InterruptKind,
    OutputMode,
    ArtifactRef,
    ArtifactType,
    SandboxResult,
)
from app.services.dataset_profiler import DatasetProfiler
from app.services.datasets import DatasetService
from app.services.llm_service import LLMService
from app.state.workflow import WorkflowState


@dataclass
class GraphDependencies:
    dataset_service: DatasetService
    profiler: DatasetProfiler
    llm_service: LLMService
    renderer: ChartRenderer
    policies: AgentPolicyEngine
    storage_dir: Path


class AnalysisNodes:
    def __init__(self, deps: GraphDependencies):
        self.deps = deps

    def _normalize_output_mode(self, mode: OutputMode | None) -> OutputMode | None:
        # Path B removed: every visual/chart request is handled via sandboxed free code.
        if mode == OutputMode.CHART:
            return OutputMode.FREE_CODE
        return mode

    def ingest_request(self, state: WorkflowState) -> dict:
        return {
            "error": None,
            "final_response": None,
            "clarification_needed": False,
            "clarification_question": None,
            "clarification_options": [],
            "analysis_plan": None,
            "chart_spec": None,
            "text_answer": None,
            "validation_issues": [],
            "review_issues": [],
            "artifacts": [],
            "interrupt_kind": None,
            "should_regenerate_spec": False,
            "should_request_clarification": False,
            "spec_revision_context": [],
            "free_code_spec": None,
            "sandbox_result": None,
            "code_review_result": None,
            "sandbox_attempts": 0,
        }

    def profile_dataset(self, state: WorkflowState) -> dict:
        dataset_meta = self.deps.dataset_service.get(state.dataset_id)
        df = self.deps.dataset_service._load_dataframe(dataset_meta, use_cleaned=True)
        profile, schema = self.deps.profiler.profile(state.dataset_id, df)
        return {
            "dataset_profile": profile,
            "dataset_schema": schema,
        }

    def interpret_request(self, state: WorkflowState) -> dict:
        if state.dataset_profile is None:
            raise ValueError("dataset_profile is required before interpret_request")
        history_text = "\n".join(f"{item.role}: {item.content}" for item in state.chat_history)
        intent = self.deps.llm_service.interpret_request(state.user_question, history_text, state.dataset_profile)
        clarification_needed = self.deps.policies.needs_clarification(intent)
        clarification_request: ClarificationRequest | None = None
        if clarification_needed:
            clarification_request = self.deps.llm_service.build_clarification_request(
                state.user_question,
                intent,
                state.dataset_profile,
            )
        normalized_mode = self._normalize_output_mode(intent.recommended_output_mode)
        return {
            "intent_result": intent,
            "output_mode": normalized_mode,
            "clarification_needed": clarification_needed,
            "clarification_question": clarification_request.question if clarification_request else None,
            "clarification_options": clarification_request.options if clarification_request else [],
        }

    def clarification_gate(self, state: WorkflowState) -> dict:
        if not state.clarification_needed:
            return {}

        if state.dataset_profile is not None and state.user_clarification_answer:
            clarified_columns = self._extract_clarified_columns(
                answer=state.user_clarification_answer,
                options=state.clarification_options,
                profile=state.dataset_profile,
            )
            if clarified_columns:
                return {
                    "clarification_needed": False,
                    "should_request_clarification": False,
                }

        answer = interrupt(
            {
                "kind": InterruptKind.CLARIFICATION.value,
                "question": state.clarification_question or "Kannst du deine Anfrage präzisieren?",
                "options": state.clarification_options,
                "reason": state.intent_result.ambiguity_reason if state.intent_result else None,
            }
        )
        return {
            "user_clarification_answer": str(answer),
            "clarification_needed": False,
            "interrupt_kind": InterruptKind.CLARIFICATION,
        }

    def build_analysis_plan(self, state: WorkflowState) -> dict:
        if state.dataset_profile is None or state.intent_result is None:
            raise ValueError("dataset_profile and intent_result are required before build_analysis_plan")
        plan = self.deps.llm_service.build_analysis_plan(
            state.user_question,
            state.user_clarification_answer,
            state.intent_result,
            state.dataset_profile,
        )
        clarified_columns = self._extract_clarified_columns(
            answer=state.user_clarification_answer,
            options=state.clarification_options,
            profile=state.dataset_profile,
        )
        if clarified_columns:
            selected_columns = clarified_columns + [
                column for column in plan.selected_columns if column not in clarified_columns
            ]
            if len(selected_columns) == 1:
                fallback_numeric = [
                    column for column in state.dataset_profile.numeric_columns if column != selected_columns[0]
                ]
                if fallback_numeric:
                    selected_columns.append(fallback_numeric[0])
            plan = plan.model_copy(update={"selected_columns": selected_columns})

        normalized_mode = self._normalize_output_mode(plan.output_mode)
        if normalized_mode != plan.output_mode:
            plan = plan.model_copy(update={"output_mode": normalized_mode})

        approval_required = self.deps.policies.needs_approval(plan, state.dataset_profile)
        return {
            "analysis_plan": plan,
            "approval_required": approval_required,
            "approval_reason": plan.approval_reason or ("Large chart request requires explicit approval." if approval_required else None),
            "output_mode": normalized_mode,
        }

    def approval_gate(self, state: WorkflowState) -> dict:
        if not state.approval_required:
            return {}
        decision = interrupt(
            {
                "kind": InterruptKind.APPROVAL.value,
                "question": "Möchtest du mit diesem Analyseschritt fortfahren?",
                "options": ["approve", "reject"],
                "reason": state.approval_reason,
            }
        )
        approved = self._normalize_approval(decision)
        return {
            "approved": approved,
            "interrupt_kind": InterruptKind.APPROVAL,
        }

    def generate_output_spec(self, state: WorkflowState) -> dict:
        if state.analysis_plan is None or state.dataset_profile is None:
            raise ValueError("analysis_plan and dataset_profile are required before generate_output_spec")
        if state.output_mode == OutputMode.TEXT:
            text_answer = self.deps.llm_service.generate_text_answer(
                state.user_question,
                state.analysis_plan,
                state.dataset_profile,
            )
            return {
                "text_answer": text_answer,
                "chart_spec": None,
            }

        chart_spec = self.deps.llm_service.generate_chart_spec(
            state.user_question,
            state.analysis_plan,
            state.dataset_profile,
            state.spec_revision_context,
        )
        clarified_columns = self._extract_clarified_columns(
            answer=state.user_clarification_answer,
            options=state.clarification_options,
            profile=state.dataset_profile,
        )
        available_columns = {column.name for column in state.dataset_profile.columns}
        if clarified_columns:
            preferred_x = clarified_columns[0]
            if chart_spec.x_column not in available_columns:
                chart_spec = chart_spec.model_copy(update={"x_column": preferred_x})
            if chart_spec.y_column and chart_spec.y_column not in available_columns:
                chart_spec = chart_spec.model_copy(update={"y_column": None})

        chart_spec = self.deps.policies.apply_chart_defaults(chart_spec, state.dataset_profile)
        return {
            "chart_spec": chart_spec,
            "text_answer": None,
        }

    def validate_output_spec(self, state: WorkflowState) -> dict:
        if state.dataset_profile is None or state.chart_spec is None:
            raise ValueError("dataset_profile and chart_spec are required before validate_output_spec")
        validation = self.deps.policies.validate_chart_spec(state.chart_spec, state.dataset_profile)
        issue_messages = [issue.message for issue in validation.issues]
        clarification_question = state.clarification_question
        clarification_options = state.clarification_options
        should_request_clarification = validation.should_reask
        clarification_needed = validation.should_reask
        should_regenerate_spec = validation.should_regenerate

        if validation.should_reask:
            clarification_question = "Ich benötige eine Klärung der Spalten, bevor ich das Diagramm rendern kann. Welche Felder soll ich verwenden?"
            clarification_options = state.intent_result.referenced_columns if state.intent_result else []
            if state.user_clarification_answer:
                # The user already clarified once: avoid repeating the same interrupt and regenerate from that answer.
                should_request_clarification = False
                clarification_needed = False
                should_regenerate_spec = True
                issue_messages.append("Use the user's clarification answer to pick valid dataset columns.")

        return {
            "validation_issues": validation.issues,
            "validation_attempts": state.validation_attempts + 1,
            "should_regenerate_spec": should_regenerate_spec,
            "should_request_clarification": should_request_clarification,
            "clarification_needed": clarification_needed,
            "clarification_question": clarification_question,
            "clarification_options": clarification_options,
            "spec_revision_context": issue_messages,
        }

    def render_artifact(self, state: WorkflowState) -> dict:
        if state.chart_spec is None:
            raise ValueError("chart_spec is required before render_artifact")
        dataset_meta = self.deps.dataset_service.get(state.dataset_id)
        df = self.deps.dataset_service._load_dataframe(dataset_meta, use_cleaned=True)
        output_path = self.deps.storage_dir / "images" / str(state.chat_id or "adhoc") / f"{state.request_id}.png"
        artifact = self.deps.renderer.render(state.chart_spec, df, str(output_path))
        relative_path = output_path.relative_to(self.deps.storage_dir)
        public_path = f"/storage/{relative_path.as_posix()}"
        return {
            "artifacts": [artifact.model_copy(update={"path": public_path})],
            "artifacts_metadata": {"artifact_path": str(output_path)},
        }

    def generate_free_code(self, state: WorkflowState) -> dict:
        if state.analysis_plan is None or state.dataset_profile is None:
            raise ValueError("analysis_plan and dataset_profile are required before generate_free_code")
        free_code_spec = self.deps.llm_service.generate_free_code(
            state.user_question,
            state.analysis_plan,
            state.dataset_profile,
            state.spec_revision_context,
        )
        return {
            "free_code_spec": free_code_spec,
            "sandbox_result": None,
            "code_review_result": None,
        }

    def execute_sandbox(self, state: WorkflowState) -> dict:
        if state.free_code_spec is None:
            raise ValueError("free_code_spec is required before execute_sandbox")
        dataset_meta = self.deps.dataset_service.get(state.dataset_id)
        df = self.deps.dataset_service._load_dataframe(dataset_meta, use_cleaned=True)

        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = Path(tmpdir)
            dataset_parquet = tmp_path / "dataset.parquet"
            df.to_parquet(str(dataset_parquet), index=False)

            artifact_filename = state.free_code_spec.artifact_filename or "artifact.png"
            sandbox_artifact_path = tmp_path / artifact_filename

            preamble = (
                "import pandas as pd\n"
                "import numpy as np\n"
                "import matplotlib\n"
                "matplotlib.use('Agg')\n"
                "import matplotlib.pyplot as plt\n"
                f"df = pd.read_parquet({str(dataset_parquet)!r})\n"
                f"OUTPUT_PATH = {str(sandbox_artifact_path)!r}\n"
            )
            full_code = preamble + "\n" + state.free_code_spec.code
            code_file = tmp_path / "sandbox_code.py"
            code_file.write_text(full_code, encoding="utf-8")

            try:
                proc = subprocess.run(
                    [sys.executable, str(code_file)],
                    capture_output=True,
                    text=True,
                    timeout=30,
                    cwd=str(tmp_path),
                )
                success = proc.returncode == 0
                stdout = proc.stdout[:4096]
                stderr = proc.stderr[:2048]
                exit_code = proc.returncode
            except subprocess.TimeoutExpired:
                return {
                    "sandbox_result": SandboxResult(
                        success=False,
                        stdout="",
                        stderr="Sandbox execution timed out after 30 seconds.",
                        exit_code=-1,
                    ),
                    "sandbox_attempts": state.sandbox_attempts + 1,
                    "artifacts": [],
                }

            public_path: str | None = None
            artifacts: list[ArtifactRef] = []
            if success and sandbox_artifact_path.exists():
                output_dir = self.deps.storage_dir / "images" / str(state.chat_id or "adhoc")
                output_dir.mkdir(parents=True, exist_ok=True)
                final_path = output_dir / f"{state.request_id or 'sandbox'}_{artifact_filename}"
                shutil.copy2(str(sandbox_artifact_path), str(final_path))
                relative = final_path.relative_to(self.deps.storage_dir)
                public_path = f"/storage/{relative.as_posix()}"
                mime_type, _ = mimetypes.guess_type(artifact_filename)
                mime_type = mime_type or "image/png"
                artifact_type = ArtifactType.IMAGE if mime_type.startswith("image/") else ArtifactType.TEXT
                artifacts = [
                    ArtifactRef(
                        artifact_type=artifact_type,
                        path=public_path,
                        mime_type=mime_type,
                        description=state.free_code_spec.code_goal,
                    )
                ]

        return {
            "sandbox_result": SandboxResult(
                success=success,
                stdout=stdout,
                stderr=stderr,
                artifact_path=public_path,
                exit_code=exit_code,
            ),
            "sandbox_attempts": state.sandbox_attempts + 1,
            "artifacts": artifacts,
        }

    def review_sandbox_output(self, state: WorkflowState) -> dict:
        if state.free_code_spec is None or state.sandbox_result is None:
            raise ValueError("free_code_spec and sandbox_result are required before review_sandbox_output")
        review = self.deps.llm_service.review_sandbox_output(
            state.user_question,
            state.dataset_profile,
            state.free_code_spec,
            state.sandbox_result,
        )
        revision_hints = [issue.message for issue in review.issues]
        if review.revision_hint:
            revision_hints.append(review.revision_hint)
        return {
            "code_review_result": review,
            "review_attempts": state.review_attempts + 1,
            "spec_revision_context": revision_hints,
        }

    def review_output(self, state: WorkflowState) -> dict:
        if state.dataset_profile is None or state.chart_spec is None:
            raise ValueError("dataset_profile and chart_spec are required before review_output")
        artifact_path = state.artifacts_metadata.get("artifact_path")
        if not artifact_path:
            raise ValueError("artifact_path is required before review_output")
        review = self.deps.llm_service.review_chart(
            state.user_question,
            state.dataset_profile,
            state.chart_spec,
            artifact_path,
        )
        return {
            "review_issues": review.issues,
            "review_attempts": state.review_attempts + 1,
            "should_regenerate_spec": not review.approved,
            "spec_revision_context": [issue.message for issue in review.issues],
        }

    def finalize_response(self, state: WorkflowState) -> dict:
        if state.approval_required and state.approved is False:
            final_response = FinalResponse(
                status="approval_required",
                message="Analysis execution was stopped because approval was not granted.",
                output_mode=state.output_mode,
                approval_reason=state.approval_reason,
            )
            return {"final_response": final_response}

        if state.output_mode == OutputMode.TEXT and state.text_answer is not None:
            final_response = FinalResponse(
                status="completed",
                message=state.text_answer.answer_markdown,
                output_mode=OutputMode.TEXT,
                text_answer=state.text_answer,
                artifacts=state.artifacts,
            )
            return {"final_response": final_response}

        if state.output_mode == OutputMode.CHART and state.chart_spec is not None:
            issues = ", ".join(issue.message for issue in state.review_issues)
            suffix = f" Review warnings: {issues}." if issues else ""
            final_response = FinalResponse(
                status="completed",
                message=f"Rendered chart '{state.chart_spec.title}'.{suffix}",
                output_mode=OutputMode.CHART,
                artifacts=state.artifacts,
            )
            return {"final_response": final_response}

        if state.output_mode == OutputMode.FREE_CODE:
            result = state.sandbox_result
            if result is None:
                raise ValueError("sandbox_result is required for FREE_CODE finalization")
            if result.success:
                message = result.stdout.strip() or state.free_code_spec.code_goal if state.free_code_spec else "Sandbox-Analyse abgeschlossen."
                final_response = FinalResponse(
                    status="completed",
                    message=message,
                    output_mode=OutputMode.FREE_CODE,
                    artifacts=state.artifacts,
                )
            else:
                final_response = FinalResponse(
                    status="error",
                    message="Sandbox-Ausführung fehlgeschlagen.",
                    output_mode=OutputMode.FREE_CODE,
                    artifacts=state.artifacts,
                    error=result.stderr[:300] or "unknown_sandbox_error",
                )
            return {"final_response": final_response}

        raise ValueError("Unable to finalize response without a text answer or chart artifact")

    def handle_error(self, state: WorkflowState) -> dict:
        return {
            "final_response": FinalResponse(
                status="error",
                message="The workflow failed before completion.",
                output_mode=state.output_mode,
                artifacts=state.artifacts,
                error=state.error or "unknown_error",
            )
        }

    def _normalize_approval(self, raw_decision: object) -> bool:
        if isinstance(raw_decision, bool):
            return raw_decision
        text = str(raw_decision).strip().lower()
        return text in {"approve", "approved", "yes", "y", "true", "continue"}

    def _extract_clarified_columns(
        self,
        answer: str | None,
        options: list[str],
        profile,
    ) -> list[str]:
        if not answer:
            return []

        answer_lower = answer.lower()
        available_columns = [column.name for column in profile.columns]
        normalized_answer_tokens = set(re.findall(r"[a-zA-Z0-9_]+", answer_lower))

        matched_from_options = [
            option for option in options if option.lower() in answer_lower and option in available_columns
        ]
        matched_from_columns = [
            column for column in available_columns if column.lower() in normalized_answer_tokens
        ]

        ordered: list[str] = []
        for column in matched_from_options + matched_from_columns:
            if column not in ordered:
                ordered.append(column)
        return ordered
