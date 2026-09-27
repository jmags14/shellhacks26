"""Offline tests only. Run: python -m unittest discover -s backend -p test_recommendations.py"""
import unittest
from unittest.mock import patch, AsyncMock
from uuid import UUID

from agents.cook_together.schemas import UserContext, SavedRecipe, RecipeHistoryItem, CandidateRecipe, Ingredient, PantryItem, PersonalAgentOutput, RecipeEvaluation
from services.recommendation_service import positive_weights, weighted_vector, RecommendationDataError, score_candidate, build_shortlist, TasteProfile, finalize_recommendations, get_recommendations
from services.recommendation_filters import restriction_reasons


def recipe(*names, recipe_id="r"):
    return CandidateRecipe(recipe_id=recipe_id, title="Recipe", ingredients=[Ingredient(name=n) for n in names])


class TasteTests(unittest.TestCase):
    def test_latest_low_rating_overrides_save_and_older_positive_rating(self):
        context = UserContext(user_id="u", name="User", saved_recipes=[
            SavedRecipe(recipe_id="a", title="A"), SavedRecipe(recipe_id="b", title="B")
        ], recipe_history=[
            RecipeHistoryItem(recipe_id="a", title="A", rating=1),
            RecipeHistoryItem(recipe_id="a", title="A", rating=5),
            RecipeHistoryItem(recipe_id="b", title="B", rating=5),
        ])
        self.assertEqual(positive_weights(context), {"b": 4})

    def test_weighted_average(self):
        self.assertEqual(weighted_vector([([1, 0], 1), ([0, 1], 3)]), [0.25, 0.75])

    def test_invalid_vectors(self):
        for vectors in ([], [([0, 0], 1)], [([1], 1), ([1, 2], 1)], [([float('nan')], 1)]):
            with self.subTest(vectors=vectors), self.assertRaises(RecommendationDataError):
                weighted_vector(vectors)


class FilterScoreTests(unittest.TestCase):
    def test_dairy_alias_and_case(self):
        self.assertTrue(restriction_reasons(recipe(" HEAVY Cream "), ["Dairy"], None))

    def test_diets_and_unknowns_fail_closed(self):
        for names, allergies, diet in [
            (["chicken breast"], [], "vegetarian"), (["salmon"], [], "vegetarian"),
            (["egg"], [], "vegan"), (["soy sauce"], [], "gluten-free"),
            (["mystery sauce"], ["dairy"], None), (["rice"], ["unknown allergy"], None),
            (["rice"], [], "halal"), ([], [], None),
        ]:
            with self.subTest(names=names, diet=diet):
                self.assertTrue(restriction_reasons(recipe(*names), allergies, diet))

    def test_compatible_ingredients(self):
        self.assertEqual(restriction_reasons(recipe("rice", "tofu"), ["dairy"], "vegetarian"), [])
        self.assertEqual(restriction_reasons(recipe("salmon"), [], "pescatarian"), [])

    def test_score_components_and_recency(self):
        context = UserContext(user_id="u", name="U", pantry=[PantryItem(name="Rice", quantity=1),
            PantryItem(name="tofu", quantity=0)], recipe_history=[RecipeHistoryItem(recipe_id="r", title="R", rating=5)])
        scored = score_candidate(recipe("rice", "tofu"), .9, context, set())
        self.assertEqual(scored["pantry_coverage"], .5)
        self.assertEqual(scored["match_score"], 83)
        self.assertEqual(score_candidate(recipe("rice", "tofu"), .9, context, {"r"})["match_score"], 78)

    def test_shortlist_filters_recent_and_unsafe_before_scoring(self):
        user_id = UUID(int=1)
        safe_id, unsafe_id, recent_id = [str(UUID(int=i)) for i in (2, 3, 4)]
        context = UserContext(user_id=str(user_id), name="U", allergies=["dairy"])
        profile = TasteProfile(context, [1.0], "model", [], [])
        candidates = [recipe("rice", recipe_id=safe_id), recipe("butter", recipe_id=unsafe_id),
                      recipe("rice", recipe_id=recent_id)]
        with patch("services.recommendation_service.build_taste_profile", return_value=profile), \
             patch("services.recommendation_service.retrieve_candidates", return_value=[
                 {"recipe_id": c.recipe_id, "title": c.title, "similarity": .9} for c in candidates]), \
             patch("services.recommendation_service.get_recipes_by_ids", return_value=candidates), \
             patch("services.recommendation_service.load_restrictions", return_value=(None, {recent_id}, set())):
            result, _, shortlisted = build_shortlist(user_id)
        self.assertEqual([r.recipe_id for r in shortlisted], [safe_id])
        self.assertEqual(len(result["diagnostics"]["filtered"]), 2)


class AgentTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.user_id = UUID(int=1)
        self.context = UserContext(user_id=str(self.user_id), name="U")
        self.candidates = [recipe("rice", recipe_id=str(UUID(int=i))) for i in range(2, 7)]
        self.shortlist = {"user_id": str(self.user_id), "status": "ok", "agent_used": False,
            "recommendations": [score_candidate(c, .9 - i*.1, self.context, set()) for i,c in enumerate(self.candidates)],
            "diagnostics": {}}
        self.output = PersonalAgentOutput(user_id=str(self.user_id), user_name="U", evaluations=[
            RecipeEvaluation(recipe_id=c.recipe_id, fit_score=i+1, reasons=["A contextual reason"])
            for i,c in enumerate(self.candidates)])
        self.profile = TasteProfile(self.context, [1], "model", [], [])

    def test_reranking_preserves_match_scores_and_returns_three(self):
        result = finalize_recommendations(self.shortlist, self.context, self.output)
        self.assertEqual(len(result["recommendations"]), 3)
        self.assertEqual(result["recommendations"][0]["recipe_id"], self.candidates[-1].recipe_id)
        expected = {r["recipe_id"]: r["match_score"] for r in self.shortlist["recommendations"]}
        for row in result["recommendations"]:
            self.assertEqual(row["match_score"], expected[row["recipe_id"]])

    def test_hallucinated_duplicate_missing_and_wrong_user_rejected(self):
        for change in ("unknown", "duplicate", "missing", "user", "reasons"):
            output = self.output.model_copy(deep=True)
            if change == "unknown": output.evaluations[0].recipe_id = "unknown"
            if change == "duplicate": output.evaluations[0].recipe_id = output.evaluations[1].recipe_id
            if change == "missing": output.evaluations.pop()
            if change == "user": output.user_id = "another-user"
            if change == "reasons": output.evaluations[0].reasons = []
            with self.subTest(change=change), self.assertRaises(RecommendationDataError):
                finalize_recommendations(self.shortlist, self.context, output)

    async def test_agent_receives_only_shortlist_once(self):
        with patch("services.recommendation_service.build_shortlist", return_value=(self.shortlist, self.profile, self.candidates)), \
             patch("agents.cook_together.personal_agent.evaluate_for_user", new_callable=AsyncMock, return_value=self.output) as agent:
            result = await get_recommendations(self.user_id, use_agent=True)
        agent.assert_awaited_once_with(self.context, self.candidates)
        self.assertTrue(result["agent_used"])

    async def test_503_returns_deterministic_results_without_retry(self):
        from google.genai.errors import ServerError
        with patch("services.recommendation_service.build_shortlist", return_value=(self.shortlist, self.profile, self.candidates)), \
             patch("agents.cook_together.personal_agent.evaluate_for_user", new_callable=AsyncMock,
                   side_effect=ServerError(503, {"error": {"message": "Unavailable"}})) as agent:
            result = await get_recommendations(self.user_id, use_agent=True)
        agent.assert_awaited_once()
        self.assertFalse(result["agent_used"])
        self.assertEqual(result["agent_status"], "unavailable")
        self.assertEqual(len(result["recommendations"]), 3)

    async def test_preview_and_cold_start_never_call_agent(self):
        for use_agent, candidates in [(False, self.candidates), (True, [])]:
            shortlist = self.shortlist if candidates else {**self.shortlist, "status": "cold_start", "recommendations": []}
            with patch("services.recommendation_service.build_shortlist", return_value=(shortlist, self.profile, candidates)), \
                 patch("agents.cook_together.personal_agent.evaluate_for_user", new_callable=AsyncMock) as agent:
                result = await get_recommendations(self.user_id, use_agent=use_agent)
            agent.assert_not_awaited()
            self.assertFalse(result["agent_used"])


class RouteTests(unittest.TestCase):
    def test_routes_validation_and_missing_user(self):
        from fastapi import FastAPI
        from fastapi.testclient import TestClient
        from api.recommendations import router
        app = FastAPI()
        app.include_router(router)
        with TestClient(app) as client:
            self.assertEqual(client.get("/recommendations/not-a-uuid").status_code, 422)
            with patch("api.recommendations.get_recommendations", new_callable=AsyncMock, side_effect=ValueError("User not found")):
                self.assertEqual(client.get(f"/recommendations/{UUID(int=1)}").status_code, 404)
            with patch("api.recommendations.get_recommendations", new_callable=AsyncMock, side_effect=RecommendationDataError("Mixed embeddings")):
                self.assertEqual(client.get(f"/recommendations/{UUID(int=1)}").status_code, 409)


if __name__ == "__main__":
    unittest.main()
