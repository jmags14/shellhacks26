"""Offline tests for the Cook Together fallback chain: no database, no Gemini.

Run from the repo root:
    .\\venv\\Scripts\\python.exe -m unittest discover -s backend -p test_cook_together_fallback.py
"""

import asyncio
import unittest
from unittest.mock import patch
from uuid import uuid4

from agents.cook_together import workflow
from agents.cook_together.gemini_config import model_chain
from agents.cook_together.schemas import (
    CandidateRecipe,
    PersonalAgentOutput,
    PlannerOutput,
    RankedRecipe,
    RecipeEvaluation,
    UserContext,
)

PRIMARY, FALLBACK = model_chain()[0], model_chain()[1]

CANDIDATES = [
    CandidateRecipe(recipe_id="r1", title="Pasta", ingredients=[]),
    CandidateRecipe(recipe_id="r2", title="Peanut Noodles", ingredients=[]),
]
CONTEXTS = [
    UserContext(user_id=str(uuid4()), name="ann"),
    UserContext(user_id=str(uuid4()), name="bo"),
]


def personal_output(context, scores, dealbreakers=None, recipe_ids=("r1", "r2")):
    dealbreakers = dealbreakers or {}
    return PersonalAgentOutput(
        user_id="whatever-the-model-said",
        user_name="whoever",
        evaluations=[
            RecipeEvaluation(
                recipe_id=rid,
                fit_score=scores[rid],
                dealbreakers=dealbreakers.get(rid, []),
                reasons=["ok"],
            )
            for rid in recipe_ids
        ],
    )


def good_planner():
    return PlannerOutput(
        ranking=[
            RankedRecipe(recipe_id="r1", group_score=8, why=["best"]),
            RankedRecipe(recipe_id="r2", group_score=4, why=["worse"]),
        ],
        top_pick="r1",
    )


class FallbackTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        patches = [
            patch.object(workflow, "get_group_candidates", return_value=CANDIDATES),
            patch.object(workflow, "build_taste_evidence", return_value={}),
            patch.object(
                workflow, "get_user_context",
                side_effect=lambda uid: next(c for c in CONTEXTS if c.user_id == str(uid)),
            ),
        ]
        for p in patches:
            p.start()
            self.addCleanup(p.stop)
        self.user_ids = [c.user_id for c in CONTEXTS]
        self.calls = {"personal": [], "planner": []}

    def personal(self, behavior):
        async def fake(context, candidates, model=None, evidence=None):
            self.calls["personal"].append(model)
            return behavior(context, model)
        return patch("agents.cook_together.personal_agent.evaluate_for_user", fake)

    def planner(self, behavior):
        async def fake(outputs, candidates, model=None):
            self.calls["planner"].append(model)
            return behavior(model)
        return patch("agents.cook_together.planner_agent.plan_group_meal", fake)

    async def run_workflow(self):
        return await workflow.run_cook_together(self.user_ids, use_mock_agents=False)

    async def test_primary_503_falls_back_to_second_model(self):
        def personal(ctx, model):
            if model == PRIMARY:
                raise RuntimeError("503 UNAVAILABLE")
            return personal_output(ctx, {"r1": 8, "r2": 5})

        with self.personal(personal), self.planner(lambda m: good_planner()):
            planner, outputs, _, status, _ = await self.run_workflow()

        self.assertEqual(status, "ok")
        self.assertEqual(self.calls["personal"].count(PRIMARY), 2)
        self.assertEqual(self.calls["personal"].count(FALLBACK), 2)
        self.assertEqual(planner.top_pick, "r1")

    async def test_identity_comes_from_our_data_not_the_model(self):
        with self.personal(lambda c, m: personal_output(c, {"r1": 8, "r2": 5})), \
             self.planner(lambda m: good_planner()):
            _, outputs, _, _, _ = await self.run_workflow()

        self.assertEqual([o.user_name for o in outputs], ["ann", "bo"])
        self.assertEqual([o.user_id for o in outputs], [c.user_id for c in CONTEXTS])

    async def test_planner_down_ranks_by_personal_scores_and_demotes_dealbreakers(self):
        # r2 has the higher average but a dealbreaker for one person.
        def personal(ctx, model):
            db = {"r2": ["peanuts"]} if ctx.name == "bo" else {}
            return personal_output(ctx, {"r1": 5, "r2": 9}, db)

        def planner(model):
            raise RuntimeError("503 UNAVAILABLE")

        with self.personal(personal), self.planner(planner):
            result, _, _, status, _ = await self.run_workflow()

        self.assertEqual(status, "planner_fallback")
        self.assertEqual(result.top_pick, "r1")
        self.assertEqual([r.recipe_id for r in result.ranking], ["r1", "r2"])
        self.assertIn("peanuts", result.ranking[1].conflicts[0])
        self.assertEqual(self.calls["planner"], [PRIMARY, FALLBACK])

    async def test_gemini_fully_down_returns_labelled_placeholder(self):
        def personal(ctx, model):
            raise RuntimeError("503 UNAVAILABLE")

        with self.personal(personal), self.planner(lambda m: good_planner()):
            result, _, _, status, _ = await self.run_workflow()

        self.assertEqual(status, "unavailable")
        self.assertEqual(self.calls["planner"], [])  # nothing to plan from
        self.assertEqual(len(result.ranking), 2)
        self.assertEqual(result.ranking[0].why, [workflow.UNAVAILABLE_NOTE])

    async def test_planner_inventing_recipes_is_rejected(self):
        bad = PlannerOutput(
            ranking=[RankedRecipe(recipe_id="made-up", group_score=9)],
            top_pick="made-up",
        )
        with self.personal(lambda c, m: personal_output(c, {"r1": 8, "r2": 5})), \
             self.planner(lambda m: bad):
            result, _, _, status, _ = await self.run_workflow()

        self.assertEqual(status, "planner_fallback")
        self.assertEqual(result.top_pick, "r1")

    async def test_personal_agent_skipping_a_recipe_is_rejected(self):
        def personal(ctx, model):
            return personal_output(ctx, {"r1": 8, "r2": 5}, recipe_ids=("r1",))

        with self.personal(personal), self.planner(lambda m: good_planner()):
            _, _, _, status, _ = await self.run_workflow()

        self.assertEqual(status, "unavailable")

    async def test_timeout_moves_on_to_the_fallback_model(self):
        async def slow_then_fast(context, candidates, model=None, evidence=None):
            self.calls["personal"].append(model)
            if model == PRIMARY:
                await asyncio.sleep(5)
            return personal_output(context, {"r1": 8, "r2": 5})

        with patch("agents.cook_together.personal_agent.evaluate_for_user", slow_then_fast), \
             patch.object(workflow, "AGENT_TIMEOUT_SECONDS", 0.1), \
             self.planner(lambda m: good_planner()):
            _, _, _, status, _ = await self.run_workflow()

        self.assertEqual(status, "ok")
        self.assertIn(FALLBACK, self.calls["personal"])


if __name__ == "__main__":
    unittest.main()
