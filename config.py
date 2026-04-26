import os
from dotenv import load_dotenv

load_dotenv()


def get_config() -> dict:
    return {
        "groq_api_key": os.environ.get("GROQ_API_KEY", ""),
        "model": os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile"),
        "scenarios_path": os.environ.get("SCENARIOS_PATH", "data/scenarios.json"),
        "leaderboard_path": os.environ.get("LEADERBOARD_PATH", "data/leaderboard.json"),
    }
