from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from uuid import uuid4

from langgraph.checkpoint.memory import MemorySaver
from langgraph.types import Command

from app.graph.builder import build_agent_graph
from app.graph.nodes import GraphDependencies
from app.policies.agent_policies import AgentPolicyEngine
from app.renderers.chart_renderer import ChartRenderer
from app.schemas.agent import ChatHistoryItem, FinalResponse, InterruptKind
from app.schemas.chat_api import InterruptPayload
from app.services.dataset_profiler import DatasetProfiler
from app.services.datasets import DatasetService
from app.services.llm_service import LLMService
from app.state.workflow import WorkflowState


@dataclass
class AgentExecutionResult:
    status: str
    final_response: FinalResponse | None
    interrupt: InterruptPayload | None
    workflow_state: WorkflowState


class AnalysisAgentService:
    def __init__(
        self,
        dataset_service: DatasetService,
        storage_dir: Path,
        llm_service: LLMService | None = None,
        profiler: DatasetProfiler | None = None,
        renderer: ChartRenderer | None = None,
        policies: AgentPolicyEngine | None = None,
    ):
        deps = GraphDependencies(
            dataset_service=dataset_service,
            profiler=profiler or DatasetProfiler(),
            llm_service=llm_service or LLMService(),
            renderer=renderer or ChartRenderer(),
            policies=policies or AgentPolicyEngine(),
            storage_dir=storage_dir,
        )
        self.checkpointer = MemorySaver()
        self.graph = build_agent_graph(deps).compile(checkpointer=self.checkpointer)

    def run(
        self,
        chat_id: int,
        dataset_id: str,
        user_question: str,
        chat_history: list[ChatHistoryItem],
    ) -> AgentExecutionResult:
        config = self._config(chat_id)
        state = WorkflowState(
            chat_id=chat_id,
            request_id=uuid4().hex,
            user_question=user_question,
            chat_history=chat_history,
            dataset_id=dataset_id,
        )
        self._invoke(state.model_dump(mode="python"), config)
        return self._read_result(config)

    def resume(self, chat_id: int, user_input: str) -> AgentExecutionResult:
        config = self._config(chat_id)
        self._invoke(Command(resume=user_input), config)
        return self._read_result(config)

    def has_pending_interrupt(self, chat_id: int) -> bool:
        snapshot = self.graph.get_state(self._config(chat_id))
        return bool(getattr(snapshot, "interrupts", ()))

    def _invoke(self, payload: dict | Command, config: dict) -> None:
        try:
            self.graph.invoke(payload, config=config)
        except Exception:
            snapshot = self.graph.get_state(config)
            if not getattr(snapshot, "interrupts", ()):
                raise

    def _read_result(self, config: dict) -> AgentExecutionResult:
        snapshot = self.graph.get_state(config)
        values = getattr(snapshot, "values", {}) or {}
        workflow_state = WorkflowState.model_validate(values)
        interrupts = getattr(snapshot, "interrupts", ()) or ()
        if interrupts:
            raw_payload = getattr(interrupts[0], "value", interrupts[0])
            payload = InterruptPayload(
                kind=InterruptKind(raw_payload["kind"]),
                question=raw_payload["question"],
                options=list(raw_payload.get("options", [])),
                reason=raw_payload.get("reason"),
            )
            return AgentExecutionResult(
                status="interrupted",
                final_response=workflow_state.final_response,
                interrupt=payload,
                workflow_state=workflow_state,
            )

        status = "completed"
        if workflow_state.final_response and workflow_state.final_response.status == "error":
            status = "error"
        return AgentExecutionResult(
            status=status,
            final_response=workflow_state.final_response,
            interrupt=None,
            workflow_state=workflow_state,
        )

    def _config(self, chat_id: int) -> dict:
        return {"configurable": {"thread_id": f"chat-{chat_id}"}}
