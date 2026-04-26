import json
import random
from pathlib import Path
from typing import Optional


class CaseSelector:
    def __init__(
        self,
        scenarios_path: str = "data/scenarios.json",
        mode: str = "random",
        difficulty: str = "all",
        category: str = "all",
        tags: Optional[list] = None,
        case_id: Optional[str] = None,
    ):
        self.mode = mode
        self.difficulty = difficulty
        self.category = category
        self.tags = tags or []
        self.case_id = case_id
        self._cursor = 0

        with open(scenarios_path, "r") as f:
            all_scenarios = json.load(f)

        self.pool = [s for s in all_scenarios if s.get("active", True)]

    def _apply_filters(self) -> list:
        filtered = self.pool

        if self.difficulty != "all":
            filtered = [s for s in filtered if s["difficulty"] == self.difficulty]

        if self.category != "all":
            filtered = [s for s in filtered if s["category"] == self.category]

        if self.tags:
            filtered = [
                s for s in filtered
                if any(tag in s.get("tags", []) for tag in self.tags)
            ]

        return filtered

    def pick(self) -> dict:
        if self.mode == "manual":
            if not self.case_id:
                raise ValueError("manual mode requires case_id to be set")
            match = [s for s in self.pool if s["case_id"] == self.case_id]
            if not match:
                raise ValueError(f"case_id {self.case_id} not found in pool")
            return match[0]

        filtered = self._apply_filters()

        if not filtered:
            raise ValueError(
                f"No cases match filters: difficulty={self.difficulty} "
                f"category={self.category} tags={self.tags}"
            )

        if self.mode == "random":
            return random.choice(filtered)

        if self.mode == "sequential":
            case = filtered[self._cursor % len(filtered)]
            self._cursor += 1
            return case

        raise ValueError(f"Unknown mode: {self.mode}")

    def pick_all(self) -> list:
        return self._apply_filters()

    def pool_summary(self) -> dict:
        filtered = self._apply_filters()
        return {
            "total_in_pool": len(self.pool),
            "matching_filters": len(filtered),
            "by_difficulty": {
                "easy":   len([s for s in filtered if s["difficulty"] == "easy"]),
                "medium": len([s for s in filtered if s["difficulty"] == "medium"]),
                "hard":   len([s for s in filtered if s["difficulty"] == "hard"]),
            },
            "by_category": {
                cat: len([s for s in filtered if s["category"] == cat])
                for cat in set(s["category"] for s in filtered)
            },
            "case_ids": [s["case_id"] for s in filtered],
        }
