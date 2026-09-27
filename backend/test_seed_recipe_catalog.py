"""Offline catalog and restriction checks; no database or Gemini requests."""
import unittest

from database.seed_recipe_catalog import RECIPES
from agents.cook_together.schemas import CandidateRecipe, Ingredient
from services.recommendation_filters import INGREDIENTS, restriction_reasons


class CatalogTests(unittest.TestCase):
    def test_catalog_is_complete_and_classified(self):
        self.assertEqual(len({r["title"] for r in RECIPES}), len(RECIPES))
        for item in RECIPES:
            with self.subTest(title=item["title"]):
                names = [name for name, _, _ in item["ingredients"]]
                self.assertEqual(len(names), len(set(names)))
                self.assertTrue(item["steps"])
                self.assertGreater(item["servings"], 0)
                for name, quantity, unit in item["ingredients"]:
                    self.assertIn(name, INGREDIENTS)
                    self.assertGreater(quantity, 0)
                    self.assertTrue(unit)

    def test_desserts_respect_restrictions(self):
        for item in RECIPES:
            candidate = CandidateRecipe(recipe_id="test", title=item["title"], ingredients=[
                Ingredient(name=name) for name, _, _ in item["ingredients"]
            ])
            if "vegan" in item["description"]:
                self.assertEqual(restriction_reasons(candidate, ["dairy", "peanuts"], "vegan"), [])
            if item["title"] == "Vanilla Strawberry Yogurt Cups":
                self.assertTrue(restriction_reasons(candidate, ["dairy"], None))
            if item["title"] == "Banana Oat Cookies":
                self.assertTrue(restriction_reasons(candidate, [], "gluten free"))


if __name__ == "__main__":
    unittest.main()
