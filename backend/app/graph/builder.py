from __future__ import annotations

from collections.abc import Callable

from langgraph.errors import GraphInterrupt
from langgraph.graph import END, START, StateGraph

from app.graph.nodes import AnalysisNodes, GraphDependencies
from app.state.workflow import WorkflowState
from app.schemas.agent import OutputMode


NodeCallable = Callable[[WorkflowState], dict]


def build_agent_graph(deps: GraphDependencies):
    nodes = AnalysisNodes(deps)
    graph = StateGraph(WorkflowState)

    graph.add_node("ingest_request", _safe(nodes.ingest_request))
    graph.add_node("profile_dataset", _safe(nodes.profile_dataset))
    graph.add_node("interpret_request", _safe(nodes.interpret_request))
    graph.add_node("clarification_gate", _safe(nodes.clarification_gate))
    graph.add_node("build_analysis_plan", _safe(nodes.build_analysis_plan))
    graph.add_node("approval_gate", _safe(nodes.approval_gate))
    graph.add_node("generate_output_spec", _safe(nodes.generate_output_spec))
    graph.add_node("validate_output_spec", _safe(nodes.validate_output_spec))
    graph.add_node("render_artifact", _safe(nodes.render_artifact))
    graph.add_node("review_output", _safe(nodes.review_output))
    graph.add_node("finalize_response", _safe(nodes.finalize_response))
    graph.add_node("handle_error", _safe(nodes.handle_error))

    graph.add_node("generate_free_code", _safe(nodes.generate_free_code))
    graph.add_node("execute_sandbox", _safe(nodes.execute_sandbox))
    graph.add_node("review_sandbox_output", _safe(nodes.review_sandbox_output))

    graph.add_edge(START, "ingest_request")
    graph.add_edge("ingest_request", "profile_dataset")
    graph.add_conditional_edges("profile_dataset", _route_after_profile_dataset)
    graph.add_conditional_edges("interpret_request", _route_after_interpretation)
    graph.add_edge("clarification_gate", "build_analysis_plan")
    graph.add_conditional_edges("build_analysis_plan", _route_after_plan)
    graph.add_conditional_edges("approval_gate", _route_after_approval)
    graph.add_conditional_edges("generate_output_spec", _route_after_output_spec)
    graph.add_conditional_edges("validate_output_spec", _route_after_validation)
    graph.add_conditional_edges("render_artifact", _route_after_render)
    graph.add_conditional_edges("review_output", _route_after_review)
    graph.add_edge("finalize_response", END)
    graph.add_edge("handle_error", END)
    graph.add_conditional_edges("generate_free_code", _route_after_free_code)
    graph.add_conditional_edges("execute_sandbox", _route_after_sandbox_execution)
    graph.add_conditional_edges("review_sandbox_output", _route_after_code_review)
    return graph


def _safe(node: NodeCallable) -> NodeCallable:
    def wrapped(state: WorkflowState) -> dict:
        try:
            return node(state)
        except GraphInterrupt:
            raise
        except Exception as exc:
            return {"error": f"{type(exc).__name__}: {exc}"}

    return wrapped


def _route_after_profile_dataset(state: WorkflowState) -> str:
    return "handle_error" if state.error else "interpret_request"


def _route_after_interpretation(state: WorkflowState) -> str:
    if state.error:
        return "handle_error"
    if state.clarification_needed:
        return "clarification_gate"
    return "build_analysis_plan"


def _route_after_plan(state: WorkflowState) -> str:
    if state.error:
        return "handle_error"
    if state.approval_required and state.approved is not True:
        return "approval_gate"
    if state.output_mode == OutputMode.FREE_CODE:
        return "generate_free_code"
    return "generate_output_spec"


def _route_after_approval(state: WorkflowState) -> str:
    if state.error:
        return "handle_error"
    if state.approved is False:
        return "finalize_response"
    if state.output_mode == OutputMode.FREE_CODE:
        return "generate_free_code"
    return "generate_output_spec"


def _route_after_output_spec(state: WorkflowState) -> str:
    if state.error:
        return "handle_error"
    if state.output_mode and state.output_mode.value == "text":
        return "finalize_response"
    return "validate_output_spec"


def _route_after_validation(state: WorkflowState) -> str:
    if state.error:
        return "handle_error"
    if state.should_request_clarification:
        return "clarification_gate"
    if state.should_regenerate_spec and state.validation_attempts < 3:
        return "generate_output_spec"
    if state.validation_issues:
        return "handle_error"
    return "render_artifact"


def _route_after_render(state: WorkflowState) -> str:
    return "handle_error" if state.error else "review_output"


def _route_after_review(state: WorkflowState) -> str:
    if state.error:
        return "handle_error"
    if state.review_issues and state.review_attempts < 2:
        return "generate_output_spec"
    return "finalize_response"


def _route_after_free_code(state: WorkflowState) -> str:
    return "handle_error" if state.error else "execute_sandbox"


def _route_after_sandbox_execution(state: WorkflowState) -> str:
    return "handle_error" if state.error else "review_sandbox_output"


def _route_after_code_review(state: WorkflowState) -> str:
    if state.error:
        return "handle_error"
    review = state.code_review_result
    if review and not review.approved and state.sandbox_attempts < 2:
        return "generate_free_code"
    return "finalize_response"
