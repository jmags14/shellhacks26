"""Solo recommendations. Retrieval and percentages never require an LLM."""

import json
import math
import asyncio
from dataclasses import dataclass
from uuid import UUID

from agents.cook_together.schemas import UserContext
from database.db import get_db_connection
from services.user_context_service import get_user_context
from services.recipe_service import get_recipes_by_ids
from services.recommendation_filters import restriction_reasons


class RecommendationDataError(Exception):
    """Stored data cannot support a reliable recommendation."""


@dataclass
class TasteProfile:
    context: UserContext
    vector: list[float] | None
    model_name: str | None
    sources: list[dict]
    missing_embedding_ids: list[str]

    def diagnostics(self):
        return {
            "user_id": self.context.user_id,
            "user_name": self.context.name,
            "saved_count": len(self.context.saved_recipes),
            "history_count": len(self.context.recipe_history),
            "dimension": len(self.vector) if self.vector else 0,
            "model_name": self.model_name,
            "sources": self.sources,
            "missing_embedding_ids": self.missing_embedding_ids,
        }


def positive_weights(context: UserContext) -> dict[str, float]:
    """Saved=1; latest cook: unrated=1, 3 stars=1, 4=2, 5=3.

    A latest rating of 1 or 2 overrides a save and contributes nothing.
    History from get_user_context is ordered newest first. Repeated cooking
    does not multiply a recipe's influence indefinitely.
    """
    weights = {r.recipe_id: 1.0 for r in context.saved_recipes}
    seen = set()
    for item in context.recipe_history:
        if item.recipe_id in seen:
            continue
        seen.add(item.recipe_id)
        if item.rating is not None and item.rating <= 2:
            weights.pop(item.recipe_id, None)
        else:
            weights[item.recipe_id] = weights.get(item.recipe_id, 0) + (
                max(1, item.rating - 2) if item.rating is not None else 1
            )
    return weights


def weighted_vector(vectors: list[tuple[list[float], float]]) -> list[float]:
    if not vectors:
        raise RecommendationDataError("No usable recipe embeddings.")
    dimension = len(vectors[0][0])
    if not dimension:
        raise RecommendationDataError("Empty recipe embedding.")
    total = [0.0] * dimension
    weight_sum = 0.0
    for vector, weight in vectors:
        if len(vector) != dimension:
            raise RecommendationDataError("Recipe embedding dimensions differ.")
        if not math.isfinite(weight) or weight <= 0:
            raise RecommendationDataError("Invalid taste weight.")
        if not all(math.isfinite(x) for x in vector) or not any(vector):
            raise RecommendationDataError("Invalid or zero recipe embedding.")
        for i, value in enumerate(vector):
            total[i] += value * weight
        weight_sum += weight
    result = [x / weight_sum for x in total]
    if not any(result):
        raise RecommendationDataError("Taste vector has zero magnitude.")
    return result


def build_taste_profile(user_id: UUID) -> TasteProfile:
    context = get_user_context(user_id)
    weights = positive_weights(context)
    profile = TasteProfile(context, None, None, [], [])
    if not weights:
        return profile
    with get_db_connection() as conn, conn.cursor() as cursor:
        cursor.execute(
            """SELECT re.recipe_id, r.title, re.embedding::text, re.model_name
               FROM recipe_embeddings re JOIN recipes r ON r.id = re.recipe_id
               WHERE re.recipe_id = ANY(%s) AND re.embedding IS NOT NULL
               ORDER BY re.recipe_id""",
            ([UUID(recipe_id) for recipe_id in weights],),
        )
        rows = cursor.fetchall()
    profile.missing_embedding_ids = sorted(set(weights) - {str(r[0]) for r in rows})
    if not rows:
        return profile
    models = {row[3] for row in rows}
    if len(models) != 1 or None in models or "" in models:
        raise RecommendationDataError("Taste embeddings must use one known model.")
    profile.model_name = rows[0][3]
    vectors = []
    for recipe_id, title, encoded, _ in rows:
        weight = weights[str(recipe_id)]
        vector = json.loads(encoded)
        vectors.append((vector, weight))
        profile.sources.append({"recipe_id": str(recipe_id), "title": title, "weight": weight})
    profile.vector = weighted_vector(vectors)
    return profile


def retrieve_candidates(profile: TasteProfile, limit: int = 20) -> list[dict]:
    if profile.vector is None:
        return []
    if not 1 <= limit <= 20:
        raise ValueError("Candidate limit must be between 1 and 20.")
    encoded = json.dumps(profile.vector)
    with get_db_connection() as conn, conn.cursor() as cursor:
        cursor.execute(
            """SELECT re.recipe_id, r.title,
                      1 - (re.embedding <=> %s::vector) AS similarity
               FROM recipe_embeddings re JOIN recipes r ON r.id = re.recipe_id
               WHERE re.model_name = %s
                 AND vector_dims(re.embedding) = %s
                 AND vector_norm(re.embedding) > 0
                 AND (r.owner_id IS NULL OR r.owner_id = %s
                      OR EXISTS (SELECT 1 FROM saved_recipes sr
                                 WHERE sr.recipe_id = r.id AND sr.user_id = %s))
               ORDER BY re.embedding <=> %s::vector, re.recipe_id
               LIMIT %s""",
            (encoded, profile.model_name, len(profile.vector), UUID(profile.context.user_id),
             UUID(profile.context.user_id), encoded, limit),
        )
        return [{"recipe_id": str(r[0]), "title": r[1], "similarity": float(r[2])}
                for r in cursor.fetchall()]


def load_restrictions(user_id: UUID) -> tuple[str | None, set[str], set[str]]:
    with get_db_connection() as conn, conn.cursor() as cursor:
        cursor.execute("SELECT diet FROM user_preferences WHERE user_id = %s", (user_id,))
        row = cursor.fetchone()
        diet = row[0] if row else None
        cursor.execute(
            """SELECT DISTINCT r.recipe_id FROM recommendations r
               JOIN recommendation_sessions s ON s.id = r.session_id
               WHERE s.user_id = %s AND r.created_at > NOW() - INTERVAL '24 hours'""",
            (user_id,),
        )
        recent_recommendations = {str(r[0]) for r in cursor.fetchall()}
        cursor.execute(
            """SELECT DISTINCT recipe_id FROM recipe_history
               WHERE user_id = %s AND cooked_at > NOW() - INTERVAL '7 days'""", (user_id,),
        )
        recent_cooked = {str(r[0]) for r in cursor.fetchall()}
    return diet, recent_recommendations, recent_cooked


def score_candidate(recipe, similarity: float, context: UserContext, recent_cooked: set[str]) -> dict:
    if not math.isfinite(similarity):
        raise RecommendationDataError("Non-finite cosine similarity.")
    taste = min(1.0, max(0.0, similarity))
    latest = next((h for h in context.recipe_history if h.recipe_id == recipe.recipe_id), None)
    history = latest.rating / 5 if latest and latest.rating is not None else 0.5
    if recipe.recipe_id in recent_cooked:
        history *= 0.5
    # Pantry was removed from the app, so it no longer counts toward the score.
    score = round(100 * (0.85 * taste + 0.15 * history))
    return {
        "recipe_id": recipe.recipe_id, "title": recipe.title,
        "match_score": score,
        "components": {"taste": taste, "history": history},
        "discovery": not any(r.recipe_id == recipe.recipe_id for r in context.saved_recipes)
                     and latest is None,
        "cuisine": recipe.tags[0] if recipe.tags else None,
        "time_minutes": recipe.time_minutes,
        "ingredient_count": len(recipe.ingredients),
    }


def pick_mix(rows: list[dict], discovery_slots: int, familiar_slots: int) -> list[dict]:
    """Keep up to N discovery and M familiar rows, in their existing order.

    Unused slots are filled with the best remaining rows, so a group that has
    too few of one kind still gets a full list.
    """
    limit = discovery_slots + familiar_slots
    chosen = {r["recipe_id"] for r in [r for r in rows if r["discovery"]][:discovery_slots]}
    chosen |= {r["recipe_id"] for r in [r for r in rows if not r["discovery"]][:familiar_slots]}
    for row in rows:
        if len(chosen) >= limit:
            break
        chosen.add(row["recipe_id"])
    return [r for r in rows if r["recipe_id"] in chosen]


def build_shortlist(user_id: UUID, exclude: set[str] | None = None) -> tuple[dict, TasteProfile, list]:
    """exclude: recipe IDs to skip (e.g. ones already shown before a reroll)."""
    exclude = exclude or set()
    profile = build_taste_profile(user_id)
    response = {"user_id": str(user_id), "status": "ok", "agent_used": False,
                "recommendations": [], "diagnostics": profile.diagnostics()}
    if profile.vector is None:
        response["status"] = "cold_start"
        return response, profile, []
    retrieved = retrieve_candidates(profile)
    recipes = get_recipes_by_ids([UUID(r["recipe_id"]) for r in retrieved])
    by_id = {r.recipe_id: r for r in recipes}
    diet, recent_recommendations, recent_cooked = load_restrictions(user_id)
    filtered, scored = [], []
    for item in retrieved:
        recipe = by_id.get(item["recipe_id"])
        if recipe is None:
            filtered.append({**item, "reasons": ["Recipe no longer available"]})
            continue
        reasons = restriction_reasons(recipe, profile.context.allergies, diet)
        if recipe.recipe_id in recent_recommendations:
            reasons.append("Recommended in the last 24 hours")
        if recipe.recipe_id in exclude:
            reasons.append("Already shown")
        if reasons:
            filtered.append({**item, "reasons": reasons})
        else:
            scored.append(score_candidate(recipe, item["similarity"], profile.context, recent_cooked))
    scored.sort(key=lambda r: (-r["match_score"], -r["components"]["taste"], r["recipe_id"]))
    # Shortlist leans toward discovery so the final list can show 2 new + 1 familiar.
    shortlist = pick_mix(scored, 3, 2)
    response["recommendations"] = shortlist
    response["diagnostics"].update({"diet": diet, "allergies": profile.context.allergies,
        "retrieved": retrieved, "filtered": filtered, "scored": scored})
    if not scored:
        response["status"] = "no_eligible_candidates"
    elif len(scored) < 5:
        response["status"] = "limited_candidates"
    return response, profile, [by_id[r["recipe_id"]] for r in shortlist]


def finalize_recommendations(shortlist: dict, context: UserContext, output=None) -> dict:
    """Validate agent identity/coverage before using reasons or reranking.

    The Personal Agent's existing fit_score reranks only eligible shortlisted
    recipes. Displayed match_score is copied unchanged from deterministic code.
    """
    result = {k: v for k, v in shortlist.items() if k != "diagnostics"}
    rows = [dict(row) for row in shortlist["recommendations"]]
    if output is not None:
        ids = [evaluation.recipe_id for evaluation in output.evaluations]
        if output.user_id != context.user_id or len(ids) != len(set(ids)) or set(ids) != {r["recipe_id"] for r in rows}:
            raise RecommendationDataError("Personal Agent returned mismatched evaluations.")
        evaluations = {e.recipe_id: e for e in output.evaluations}
        if any(not e.reasons or not any(r.strip() for r in e.reasons) for e in output.evaluations):
            raise RecommendationDataError("Personal Agent returned empty explanations.")
        rows = [r for r in rows if not evaluations[r["recipe_id"]].dealbreakers]
        rows.sort(key=lambda r: (-evaluations[r["recipe_id"]].fit_score, -r["match_score"], r["recipe_id"]))
        for row in rows:
            row["reason"] = " ".join(evaluations[row["recipe_id"]].reasons)
            row["reason_source"] = "personal_agent"
        result["agent_used"] = True
    else:
        sources = shortlist.get("diagnostics", {}).get("sources", [])
        liked = [s["title"] for s in sorted(sources, key=lambda s: -s["weight"])[:2]]
        for row in rows:
            if row["discovery"]:
                similar = f", similar to {' and '.join(liked)}" if liked else ""
                row["reason"] = f"A new pick that closely matches your taste{similar}."
            else:
                row["reason"] = "One of your own recipes that's still a strong match for your taste."
            row["reason_source"] = "deterministic"
    result["recommendations"] = pick_mix(rows, 2, 1)
    if rows:
        result["status"] = "ok" if len(rows) >= 3 else "limited_candidates"
    elif shortlist["status"] != "cold_start":
        result["status"] = "no_eligible_candidates"
    return result


async def get_recommendations(user_id: UUID, use_agent: bool = False, exclude: set[str] | None = None) -> dict:
    # psycopg's synchronous I/O must not block FastAPI's event loop.
    shortlist, profile, candidates = await asyncio.to_thread(build_shortlist, user_id, exclude)
    if not use_agent or not candidates:
        return finalize_recommendations(shortlist, profile.context)
    from google.genai.errors import APIError
    from agents.cook_together.personal_agent import evaluate_for_user
    try:
        # The existing Personal Agent has one attempt and no tools. Never call
        # the group Planner here, and never regenerate recipe embeddings.
        output = await asyncio.wait_for(evaluate_for_user(profile.context, candidates), timeout=60)
        return finalize_recommendations(shortlist, profile.context, output)
    except (APIError, TimeoutError, ValueError, RuntimeError, RecommendationDataError):
        result = finalize_recommendations(shortlist, profile.context)
        result["agent_status"] = "unavailable"
        return result
