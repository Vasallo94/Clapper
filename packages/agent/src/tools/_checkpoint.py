from langgraph.types import interrupt


def checkpoint_interrupt(data: dict, approved_msg: str, retry_msg: str) -> str:
    decision = interrupt(data)
    if isinstance(decision, dict) and decision.get("approved"):
        return f"APPROVED — {approved_msg}"
    feedback = decision.get("feedback", "") if isinstance(decision, dict) else str(decision)
    return f"CHANGES REQUESTED — {feedback}. {retry_msg}"
