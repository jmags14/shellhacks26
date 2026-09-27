"""Explicit development checks; never discovered as a live test automatically."""
import argparse
import json
from uuid import UUID

from services.recommendation_service import build_taste_profile, retrieve_candidates, build_shortlist


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--user-id", type=UUID, default=UUID("65bb98b1-4cfd-4bba-a73c-19b1634b7f86"))
    parser.add_argument("--stage", choices=["taste", "retrieval", "shortlist", "api", "final"], default="taste")
    parser.add_argument("--live-agent", action="store_true", help="Explicitly spend one Gemini request (final stage only).")
    args = parser.parse_args()
    if args.live_agent and args.stage != "final":
        parser.error("--live-agent requires --stage final")
    if args.stage in {"api", "final"}:
        from fastapi.testclient import TestClient
        from main import app
        with TestClient(app) as client:
            path = f"/recommendations/{args.user_id}"
            if args.stage == "api":
                path += "/shortlist"
            response = client.get(path, params={"use_agent": str(args.live_agent).lower()})
        response.raise_for_status()
        result = response.json()
        if not args.live_agent:
            assert result["agent_used"] is False
        assert len(result["recommendations"]) <= (5 if args.stage == "api" else 3)
        print(json.dumps({k: v for k, v in result.items() if k != "diagnostics"}, indent=2))
        return
    if args.stage == "shortlist":
        result, _, _ = build_shortlist(args.user_id)
        print(json.dumps(result, indent=2))
        return
    profile = build_taste_profile(args.user_id)
    print(json.dumps(profile.diagnostics(), indent=2))
    if args.stage == "retrieval":
        print(json.dumps(retrieve_candidates(profile), indent=2))


if __name__ == "__main__":
    main()
