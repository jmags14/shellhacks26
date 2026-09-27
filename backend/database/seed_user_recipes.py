"""Give specific users a couple of recipes of their own (owner_id = that user).

From the repository root:
    python backend/database/seed_user_recipes.py --preview
    python backend/database/seed_user_recipes.py

Users are looked up by username (case-insensitive); a missing user is skipped.
Reruns are safe: a recipe whose title already exists is left alone. Each new
recipe is embedded afterwards so it feeds that user's recommendations.
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

SOURCE = "seeded-user"


def recipe(title, description, cuisine, servings, prep, cook, ingredients, steps):
    return dict(title=title, description=description, cuisine=cuisine,
                servings=servings, prep=prep, cook=cook,
                ingredients=ingredients, steps=steps)


# Ingredients: (name, quantity, unit). Quantities cover the entire recipe.
# Clara is vegetarian with a severe dairy allergy, so hers are dairy-free.
USER_RECIPES = {
    "clara": [
        recipe("Dairy-Free Banana Bread", "Moist dairy-free banana loaf made with oil instead of butter.", "American", 8, 10, 55,
               [("banana", 3, "whole"), ("all-purpose flour", 250, "g"), ("sugar", 100, "g"), ("vegetable oil", 80, "ml"),
                ("egg", 1, "whole"), ("baking soda", 1, "tsp"), ("cinnamon", 1, "tsp"), ("salt", 0.25, "tsp")],
               ["Heat oven to 175 C / 350 F and line a loaf tin with parchment.", "Mash ripe bananas, then whisk in sugar, oil and egg.",
                "Fold in flour, baking soda, cinnamon and salt until just combined.", "Pour into the tin and bake for 50 to 55 minutes until a skewer comes out clean.",
                "Cool in the tin for 10 minutes before slicing."]),
        recipe("Dairy-Free Oatmeal Raisin Cookies", "Chewy oatmeal cookies with raisins and cinnamon, made with oil instead of butter.", "American", 12, 15, 12,
               [("rolled oats", 150, "g"), ("all-purpose flour", 120, "g"), ("brown sugar", 100, "g"), ("vegetable oil", 80, "ml"),
                ("egg", 1, "whole"), ("raisins", 80, "g"), ("cinnamon", 1, "tsp"), ("baking soda", 0.5, "tsp")],
               ["Heat oven to 175 C / 350 F and line two baking trays with parchment.", "Whisk sugar, oil and egg, then stir in oats, flour, cinnamon and baking soda.",
                "Fold in raisins and rest the dough for 5 minutes.", "Scoop 12 mounds onto the trays and flatten slightly.", "Bake for 10 to 12 minutes until golden at the edges; cool on the tray."]),
    ],
    "taylor": [
        recipe("Classic Chocolate Chip Cookies", "Buttery chocolate chip cookies with crisp edges and soft centers.", "American", 12, 15, 11,
               [("all-purpose flour", 250, "g"), ("butter", 115, "g"), ("brown sugar", 100, "g"), ("sugar", 50, "g"),
                ("egg", 1, "whole"), ("chocolate chips", 170, "g"), ("vanilla extract", 1, "tsp"), ("baking soda", 0.5, "tsp"), ("salt", 0.5, "tsp")],
               ["Heat oven to 180 C / 350 F and line two baking trays with parchment.", "Beat softened butter with both sugars until creamy, then beat in egg and vanilla.",
                "Stir in flour, baking soda and salt, then fold in chocolate chips.", "Scoop 12 mounds onto the trays, spaced apart.", "Bake for 10 to 11 minutes until the edges are golden; cool on the tray for 5 minutes."]),
        recipe("Blueberry Muffins", "Tender bakery-style muffins bursting with blueberries.", "American", 12, 15, 22,
               [("all-purpose flour", 300, "g"), ("sugar", 150, "g"), ("milk", 240, "ml"), ("butter", 80, "g"),
                ("egg", 1, "whole"), ("blueberries", 200, "g"), ("baking powder", 2, "tsp"), ("salt", 0.5, "tsp")],
               ["Heat oven to 190 C / 375 F and line a 12-cup muffin tin.", "Whisk flour, sugar, baking powder and salt in a large bowl.",
                "Mix melted butter, milk and egg, then pour into the dry ingredients and stir until just combined.", "Fold in blueberries and divide among the cups.",
                "Bake for 20 to 22 minutes until golden and a skewer comes out clean."]),
        recipe("Garlic Butter Shrimp Pasta", "Quick spaghetti tossed with garlic butter shrimp, lemon and parsley.", "Italian-inspired", 2, 10, 15,
               [("spaghetti", 200, "g"), ("shrimp", 250, "g"), ("butter", 40, "g"), ("garlic", 4, "cloves"),
                ("lemon", 1, "whole"), ("parsley", 15, "g"), ("salt", 0.5, "tsp"), ("black pepper", 0.25, "tsp")],
               ["Cook the spaghetti in salted water until al dente; reserve 100 ml of the cooking water and drain.", "Melt butter in a large skillet and cook minced garlic for 1 minute.",
                "Add shrimp, salt and pepper and cook 2 to 3 minutes per side until pink.", "Toss in the pasta, lemon juice and a splash of pasta water until glossy.", "Finish with chopped parsley and serve."]),
        recipe("Sheet Pan Chicken and Veggies", "Easy one-pan roasted chicken thighs with potatoes and broccoli.", "American", 4, 15, 35,
               [("chicken thigh", 600, "g"), ("potato", 500, "g"), ("broccoli", 300, "g"), ("olive oil", 3, "tbsp"),
                ("garlic powder", 1, "tsp"), ("paprika", 1, "tsp"), ("salt", 1, "tsp"), ("black pepper", 0.5, "tsp")],
               ["Heat oven to 220 C / 425 F. Cube potatoes and cut broccoli into florets.", "Toss potatoes with half the oil, salt and pepper on a sheet pan and roast 10 minutes.",
                "Rub chicken with the remaining oil, garlic powder and paprika; add to the pan with the broccoli.", "Roast 22 to 25 minutes until the chicken reaches 74 C / 165 F and the potatoes are golden."]),
    ],
    "harry": [
        recipe("Beef and Bean Chili", "Hearty one-pot chili with ground beef, beans and tomato.", "American", 6, 15, 45,
               [("ground beef", 500, "g"), ("kidney beans", 400, "g"), ("canned tomato", 800, "g"), ("onion", 1, "whole"),
                ("garlic", 3, "cloves"), ("chili powder", 2, "tbsp"), ("cumin", 1, "tsp"), ("salt", 1, "tsp")],
               ["Dice the onion and mince the garlic. Drain and rinse the beans.", "Brown the beef in a large pot for 6 minutes, then add onion and garlic and cook 4 minutes.",
                "Stir in chili powder, cumin and salt, then add tomatoes and beans.", "Simmer uncovered for 30 minutes, stirring occasionally, until thick."]),
        recipe("Veggie Fried Rice", "Fast egg fried rice with carrots, peas and soy sauce, best with day-old rice.", "Asian", 3, 10, 12,
               [("cooked rice", 450, "g"), ("egg", 2, "whole"), ("carrot", 1, "whole"), ("frozen peas", 100, "g"),
                ("green onion", 3, "whole"), ("soy sauce", 2, "tbsp"), ("sesame oil", 1, "tsp"), ("vegetable oil", 1, "tbsp")],
               ["Dice the carrot and slice the green onions.", "Heat oil in a wok, scramble the eggs, and set them aside.",
                "Stir-fry carrot and peas for 3 minutes, then add the rice and cook 4 minutes until hot.", "Return the eggs, add soy sauce, sesame oil and green onion, toss, and serve."]),
    ],
}


def seed_one(conn, owner_id, item):
    """Insert one recipe with its ingredients and steps. Returns the new id or None if it exists."""
    with conn.transaction(), conn.cursor() as cur:
        cur.execute("""
            INSERT INTO recipes (owner_id, title, description, source, cuisine,
                                 servings, prep_time_minutes, cook_time_minutes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (title) DO NOTHING RETURNING id
        """, (owner_id, item["title"], item["description"], SOURCE,
              item["cuisine"], item["servings"], item["prep"], item["cook"]))
        row = cur.fetchone()
        if row is None:
            return None
        recipe_id = row[0]
        for name, quantity, unit in item["ingredients"]:
            cur.execute("INSERT INTO ingredients (name) VALUES (%s) ON CONFLICT (name) DO NOTHING", (name,))
            cur.execute("""INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
                           SELECT %s, id, %s, %s FROM ingredients WHERE name = %s""",
                        (recipe_id, quantity, unit, name))
        for number, instruction in enumerate(item["steps"], 1):
            cur.execute("INSERT INTO recipe_instructions (recipe_id, step_number, instruction) VALUES (%s, %s, %s)",
                        (recipe_id, number, instruction))
        return recipe_id


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--preview", action="store_true", help="List recipes without database access or API requests.")
    args = parser.parse_args()
    if args.preview:
        for username, items in USER_RECIPES.items():
            for item in items:
                print(f"{username}: {item['title']} ({len(item['ingredients'])} ingredients)")
        return 0

    from database.db import get_db_connection
    from services.embedding_service import embed_recipe

    failures = 0
    with get_db_connection() as conn:
        for username, items in USER_RECIPES.items():
            with conn.cursor() as cur:
                cur.execute("SELECT id FROM users WHERE lower(username) = %s", (username,))
                user = cur.fetchone()
            conn.commit()
            if user is None:
                print(f"{username}: user not found, skipped")
                continue
            for item in items:
                try:
                    recipe_id = seed_one(conn, user[0], item)
                except Exception as error:
                    failures += 1
                    print(f"{username}/{item['title']}: FAILED ({type(error).__name__}: {error})", file=sys.stderr)
                    continue
                conn.commit()  # embed_recipe reads through its own connection
                if recipe_id is None:
                    print(f"{username}/{item['title']}: already exists, skipped")
                    continue
                try:
                    embed_recipe(str(recipe_id))
                    print(f"{username}/{item['title']}: added and embedded")
                except Exception as error:
                    print(f"{username}/{item['title']}: added, embedding failed ({error})")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
