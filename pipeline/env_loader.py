class CaseEnvironmentLoader:
    def __init__(self, case: dict):
        self.case = case

    def for_log_analyst(self) -> dict:
        return {
            "case_id": self.case["case_id"],
            "goal": self.case["goal"],
            "logs": self.case["logs"],
        }

    def for_vuln_scanner(self) -> dict:
        return {
            "case_id": self.case["case_id"],
            "goal": self.case["goal"],
            "assets": self.case["environment"]["assets"],
            "requirements_file": self.case["requirements_file"],
        }

    def for_threat_intel(self, log_analyst_output: dict) -> dict:
        return {
            "case_id": self.case["case_id"],
            "goal": self.case["goal"],
            "extracted_iocs": log_analyst_output.get("extracted_iocs", {}),
            "attack_stages": log_analyst_output.get("attack_stages_observed", []),
            "requirements_file": self.case["requirements_file"],
        }

    def for_target_agent(self, orchestrator_output: dict) -> dict:
        return {
            "case_id": self.case["case_id"],
            "goal": self.case["goal"],
            "briefing": orchestrator_output.get("briefing_for_target_agent", ""),
        }

    def ground_truth(self) -> dict:
        return {
            "case_id": self.case["case_id"],
            "goal": self.case["goal"],
            "known_truth": self.case["known_truth"],
        }
