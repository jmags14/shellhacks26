"""Taste evidence for Cook Together.

For one person and a list of candidate recipes, work out *why* a recipe might
suit them, from data we already have (no LLM, no pantry):

- how similar the recipe is to recipes they saved or cooked (embeddings)
- how many of those recipes share its cuisine
- how well it matches their overall taste
- whether they already saved/cooked it, and how they rated it

The same evidence is given to the Personal Agent and shown in the app's
"Why?" panel, so the explanation is grounded in real numbers.
"""

import json
import math
from collections import Counter
from uuid import UUID

from agents.cook_together.schemas import CandidateRecipe, UserContext
from database.db import get_db_connection
from services.recommendation_service import positive_weights

# Below this, "similar to X" would be a stretch, so we don't claim it.
SIMILAR_RECIPE_THRESHOLD = 0.80


def _cosine(a: list[float], b: list[float]) -> float | None:
    if len(a) != len(b) or not a:
        return None
    dot = sum(x * y for x, y in zip(a, b))
    norm = math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(y * y for y in b))
    return dot / norm if norm else None


def _weighted_average(vectors: list[tuple[list[float], float]]) -> list[float] | None:
    if not vectors:
        return None
    dimension = len(vectors[0][0])
    if any(len(v) != dimension for v, _ in vectors):
        return None
    total_weight = sum(w for _, w in vectors)
    if not total_weight:
        return None
    return [
        sum(v[i] * w for v, w in vectors) / total_weight
        for i in range(dimension)
    ]


def _load_recipe_data(recipe_ids: list[str]):
    """Returns ({id: embedding}, {id: (title, cuisine)}) for the given recipes."""

    ids = [UUID(r) for r in recipe_ids]
    embeddings: dict[str, list[float]] = {}
    info: dict[str, tuple[str, str | None]] = {}

    with get_db_connection() as conn, conn.cursor() as cursor:
        cursor.execute(
            "SELECT id, title, cuisine FROM recipes WHERE id = ANY(%s)",
            (ids,),
        )
        for recipe_id, title, cuisine in cursor.fetchall():
            info[str(recipe_id)] = (title, cuisine)

        cursor.execute(
            """SELECT recipe_id, embedding::text
               FROM recipe_embeddings
               WHERE recipe_id = ANY(%s) AND embedding IS NOT NULL""",
            (ids,),
        )
        for recipe_id, encoded in cursor.fetchall():
            embeddings[str(recipe_id)] = json.loads(encoded)

    return embeddings, info


def build_taste_evidence(
    context: UserContext,
    candidates: list[CandidateRecipe],
) -> dict[str, dict]:
    """recipe_id -> evidence for this person. Never raises for missing data."""

    if not candidates:
        return {}

    # Recipes that count as positive taste signals (saved / cooked, not disliked).
    weights = positive_weights(context)
    titles_from_context = {r.recipe_id: r.title for r in context.saved_recipes}
    titles_from_context.update({h.recipe_id: h.title for h in context.recipe_history})
    ratings = {}
    for item in context.recipe_history:  # newest first: keep the latest rating
        ratings.setdefault(item.recipe_id, item.rating)

    candidate_ids = [c.recipe_id for c in candidates]
    embeddings, info = _load_recipe_data(sorted(set(candidate_ids) | set(weights)))

    cuisine_counts = Counter(
        info[r][1] for r in weights if r in info and info[r][1]
    )

    taste_vector = _weighted_average(
        [(embeddings[r], w) for r, w in weights.items() if r in embeddings]
    )

    evidence: dict[str, dict] = {}

    for candidate in candidates:
        rid = candidate.recipe_id
        cuisine = info.get(rid, (None, None))[1]
        vector = embeddings.get(rid)

        taste_match = _cosine(vector, taste_vector) if vector and taste_vector else None

        most_similar = None
        if vector:
            best = None
            for ref_id in weights:
                if ref_id == rid or ref_id not in embeddings:
                    continue
                similarity = _cosine(vector, embeddings[ref_id])
                if similarity is not None and (best is None or similarity > best[1]):
                    best = (ref_id, similarity)
            if best and best[1] >= SIMILAR_RECIPE_THRESHOLD:
                most_similar = {
                    "title": titles_from_context.get(best[0]) or info.get(best[0], ("a saved recipe",))[0],
                    "similarity_pct": round(best[1] * 100),
                }

        evidence[rid] = {
            "cuisine": cuisine,
            # How many of their saved/cooked recipes share this cuisine.
            "cuisine_matches": cuisine_counts.get(cuisine, 0) if cuisine else 0,
            "saved_or_cooked_total": len(weights),
            "most_similar_recipe": most_similar,
            "taste_match_pct": round(max(0.0, min(1.0, taste_match)) * 100) if taste_match is not None else None,
            "already_saved_or_cooked": rid in weights,
            "your_rating": ratings.get(rid),
        }

    return evidence
