"""Conservative screening of the current catalog's declared ingredients.

This small vocabulary is deliberately closed: unknown ingredients are excluded
for restricted users, not assumed safe. It is not a product-label or cross-contact
assessment. Extend with reviewed ingredient metadata as the catalog grows.
"""
import re

from agents.cook_together.schemas import CandidateRecipe


def normalize(value: str) -> str:
    return " ".join(re.sub(r"[^a-z0-9 ]", " ", value.lower()).split())


# Possible allergens, including common variants of ambiguous generic products.
# Diet classes: plant, egg, dairy, meat, fish.
INGREDIENTS = {
    name: ("plant", set()) for name in (
        "rice", "black beans", "tomato", "onion", "garlic", "bell pepper",
        "broccoli", "spinach", "avocado", "lime", "olive oil", "salt",
        "black pepper", "garam masala", "curry powder", "taco seasoning",
        "chickpeas", "apple", "banana", "strawberry", "cinnamon", "sugar",
        "chia seeds", "unsweetened cocoa powder", "vanilla extract",
    )
}
INGREDIENTS.update({
    "chicken breast": ("meat", set()), "ground beef": ("meat", set()),
    "salmon": ("fish", {"fish"}), "tofu": ("plant", {"soy"}),
    "egg": ("egg", {"egg"}),
    "plain yogurt": ("dairy", {"milk"}),
    # Generic oats are not certified gluten-free. Conservatively screen coconut
    # for tree-nut restrictions until more specific allergy metadata is available.
    "rolled oats": ("plant", {"gluten"}),
    "plain coconut milk": ("plant", {"tree nuts"}),
    "heavy cream": ("dairy", {"milk"}), "parmesan cheese": ("dairy", {"milk"}),
    "cheddar cheese": ("dairy", {"milk"}), "butter": ("dairy", {"milk"}),
    "soy sauce": ("plant", {"soy", "wheat", "gluten"}),
    "sriracha": ("plant", {"soy", "wheat", "gluten"}),
    "pasta": ("egg", {"wheat", "gluten", "egg"}),
    "bread": ("egg", {"wheat", "gluten", "egg", "milk", "soy", "sesame"}),
    # Generic tortillas can contain lard and dairy; do not assume vegetarian.
    "tortilla": ("meat", {"wheat", "gluten", "milk", "soy"}),
})
ALLERGY_ALIASES = {
    "dairy": "milk", "milk": "milk", "eggs": "egg", "egg": "egg",
    "soy": "soy", "soya": "soy", "wheat": "wheat", "gluten": "gluten",
    "fish": "fish", "shellfish": "shellfish", "peanut": "peanut",
    "peanuts": "peanut", "tree nuts": "tree nuts", "sesame": "sesame",
}
DIETS = {
    "vegetarian": {"meat", "fish"},
    "vegan": {"meat", "fish", "dairy", "egg"},
    "pescatarian": {"meat"},
    "pescetarian": {"meat"},
    "dairy free": {"dairy"},
    "gluten free": set(),
}


def restriction_reasons(recipe: CandidateRecipe, allergies: list[str], diet: str | None) -> list[str]:
    diet = normalize(diet or "")
    if diet in {"none", "omnivore", "no restrictions"}:
        diet = ""
    if not recipe.ingredients:
        return ["Missing ingredient data"]
    if diet and diet not in DIETS:
        return [f"Unsupported dietary restriction: {diet}"]
    blocked_allergens = set()
    for allergy in allergies:
        normalized = normalize(allergy)
        if normalized not in ALLERGY_ALIASES:
            return [f"Unsupported allergy: {allergy}"]
        blocked_allergens.add(ALLERGY_ALIASES[normalized])
    if diet == "gluten free":
        blocked_allergens.add("gluten")
    if diet == "dairy free":
        blocked_allergens.add("milk")
    if not blocked_allergens and not diet:
        return []
    reasons = []
    for ingredient in recipe.ingredients:
        name = normalize(ingredient.name)
        metadata = INGREDIENTS.get(name)
        if metadata is None:
            reasons.append(f"Unclassified ingredient: {ingredient.name}")
            continue
        category, allergens = metadata
        for allergen in sorted(blocked_allergens & allergens):
            reasons.append(f"Possible {allergen}: {ingredient.name}")
        if category in DIETS.get(diet, set()):
            reasons.append(f"Incompatible with {diet}: {ingredient.name}")
    return reasons
