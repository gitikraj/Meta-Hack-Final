"""
Bridge between the UI-generated cases and the existing pipeline runner.
"""

from pipeline.runner import run_pipeline
from server.case_builder import build_case


class UICaseSelector:
    """Drop-in replacement for CaseSelector that returns a single pre-built case."""

    def __init__(self, case: dict):
        self._case = case

    def pick(self) -> dict:
        return self._case

    def pick_all(self) -> list:
        return [self._case]

    def pool_summary(self) -> dict:
        return {
            "total": 1,
            "by_difficulty": {self._case["difficulty"]: 1},
            "by_category": {self._case["category"]: 1},
        }


async def run_ui_pipeline(
    trigger_type: str,
    ui_logs: list,
    agent_name: str = "CyberBench-UI-Agent",
    agent_description: str = "Target agent being evaluated via the CyberBench interactive UI.",
) -> dict:
    case = build_case(trigger_type, ui_logs)
    selector = UICaseSelector(case)
    result = await run_pipeline(
        agent_name=agent_name,
        agent_description=agent_description,
        selector=selector,
        verbose=True,
    )
    return result
