# Solo recommendations

Uses the existing FastAPI application, `DATABASE_URL`, `recipe_embeddings`
pgvector table, and Cook Together Personal Agent. There is no Solo Agent or
Planner call. The currently configured development database is TigerData
PostgreSQL; the repository uses Supabase for authentication. No database was
migrated, and no embeddings were generated or overwritten.

## API

Run the existing backend as usual. The routes are mounted in `main.py`:

| Request | Result | Model requests |
| --- | --- | --- |
| `GET /recommendations/{user_id}/shortlist` | Up to five candidates, taste sources, retrieved similarities, filter decisions, and score components | 0 |
| `GET /recommendations/{user_id}` | Up to three recommendations with deterministic explanations | 0 |
| `GET /recommendations/{user_id}?use_agent=true` | Existing Personal Agent evaluates up to five candidates, then returns up to three with contextual explanations | One attempt when candidates exist |

Live usage is opt-in regardless of `USE_MOCK_AGENTS`, to protect the development
quota. Each live HTTP request can spend another model request; there is no
cross-request agent cache yet. Empty/cold-start results never call the agent.
The existing Personal Agent is unchanged and still has retries disabled.

An API failure, 60-second agent timeout, malformed output, wrong user, duplicate,
extra, or missing recipe IDs falls back to deterministic results with
`agent_used: false`, `agent_status: "unavailable"`, and
`reason_source: "deterministic"`. ADK may still log its exception on the server.
Agent-generated explanations have `reason_source: "personal_agent"`.

`status` is `ok`, `cold_start`, `limited_candidates`, or
`no_eligible_candidates`. Never pad a result with ineligible recipes to reach
three/five. Malformed UUIDs return 422, unknown users 404, and incompatible taste
embedding data 409.

These routes follow the existing backend's user-ID route convention. Like the
existing routes, they are not yet authenticated; bind the ID to a verified
Supabase identity before exposing user-specific recommendations publicly.

## Retrieval and ranking

1. Load the existing user context, including saved recipes, history, ratings,
   allergies, and pantry. A saved recipe contributes weight 1. The latest cook
   contributes 1 for unrated/3-star, 2 for 4-star, or 3 for 5-star. A latest
   1–2-star rating overrides the save and excludes that recipe from taste.
2. Average existing embeddings with those weights. Missing embeddings are
   listed in diagnostics; no usable embeddings yields `cold_start`. Mixed
   models, mixed dimensions, zero vectors, and non-finite vectors are rejected.
3. Retrieve at most 20 candidates using pgvector cosine distance (`<=>`),
   constrained to the taste model and dimension. Search unowned catalog recipes,
   the user's own recipes, and explicitly saved recipes, including previously
   saved/cooked recipes for rediscovery. Other users' private recipes are not
   included merely because they have an embedding.
4. Apply deterministic restriction screening and exclude recommendations logged
   in the existing recommendation tables within the last 24 hours.
5. Score and shortlist at most five. Percentages use:

   `round(100 * (0.85 * taste + 0.15 * history))`

   Taste is cosine similarity clamped to [0, 1]. History is latest rating / 5,
   or 0.5 when unrated/unseen; it is halved if cooked in the last seven days.
   The pantry no longer counts (the app has no pantry feature); it used to be
   20% of the score, which capped users without a pantry at about 80%.
   Scores are Match Scores, not calibrated probabilities.
6. Optional Personal Agent evaluates just this shortlist once. Its existing
   fit scores rerank eligible candidates; ties use deterministic match then ID.
   Agent dealbreakers can further remove recipes, never restore filtered ones.
   Displayed Match Scores are copied unchanged; final ranking need not be in
   descending Match Score order when agent reranking is enabled.

The default final route keeps deterministic ordering and returns the first three.

## Restriction data and current limits

`user_preferences.diet` is enforced separately from the existing Personal Agent.
The current database has ingredient names/categories but no complete normalized
allergen or dietary suitability metadata. `recommendation_filters.py` uses a
small explicit vocabulary for the seeded catalog. Unknown ingredients for
restricted users and unsupported restrictions fail closed. Generic tortillas
are excluded for vegetarian/dairy-restricted users because their formulation is
not specified. Unsupported diets such as halal are not silently ignored.

This is screening of declared recipe ingredients, not product-label or
cross-contact certification. Expand/validate ingredient metadata as recipes are
imported; do not relax the unknown-ingredient rule simply to fill the shortlist.
Clara currently gets three eligible candidates instead of five.

The endpoints and checks are read-only. They respect existing recommendation
history but do not create exposure records on GET. A future explicit display/
feedback action should record shown recommendations in the existing tables.
The current schema has no dismissal field/table, so dismissal feedback is not
implemented. Time/budget scoring, persistent explanation caching, cold-start
fallbacks, and frontend integration are intentionally deferred.

## Incremental checks

### Expand the shared catalog

`database/seed_recipe_catalog.py` adds 12 shared recipes (six savory and six
sweet), their ingredients/instructions, and 768-dimensional embeddings using
the existing embedding service. It does not modify users, preferences, pantry,
saved recipes, or cooking history. Recipes have no owner and are eligible for
catalog discovery. Existing recommendation/display limits are unchanged.

From the repository root:

```powershell
.\venv\Scripts\python.exe backend/database/seed_recipe_catalog.py --preview
.\venv\Scripts\python.exe backend/database/seed_recipe_catalog.py
```

The second command writes to the configured database and makes up to 12 Gemini
embedding requests on the first run, even when `USE_MOCK_AGENTS=true`. It requires
the existing `recipe_embeddings` table and root `.env` credentials. Each recipe
and vector commit together; failures roll back that recipe and produce a nonzero
exit code. Reruns skip current embeddings and retry failed recipes. A title
collision with another recipe source is skipped without changes. Recipe content
already inserted by this script is preserved on reruns.

More catalog entries provide more retrieval options, not more result cards.
Cook Together currently does not apply its sweet/savory `intent` argument, so
adding sweets alone does not make that toggle filter the results.

From the repository root, using PowerShell:

```powershell
# Offline tests: no database calls and no Gemini requests.
.\venv\Scripts\python.exe -m unittest discover -s backend -p test_recommendations.py

# Live development database, no embedding generation or LLM calls.
.\venv\Scripts\python.exe backend/check_recommendations.py --stage taste
.\venv\Scripts\python.exe backend/check_recommendations.py --stage retrieval
.\venv\Scripts\python.exe backend/check_recommendations.py --stage shortlist
.\venv\Scripts\python.exe backend/check_recommendations.py --stage api
.\venv\Scripts\python.exe backend/check_recommendations.py --stage final

# Explicitly spends one Gemini attempt; do this only when needed.
.\venv\Scripts\python.exe backend/check_recommendations.py --stage final --live-agent
```

Default user is Clara (`65bb98b1-4cfd-4bba-a73c-19b1634b7f86`). Pass
`--user-id e1516a40-1a23-425d-9123-37371ccb84d2` for Leo. `api` and `final`
exercise routes mounted in the actual application through FastAPI TestClient.

Validation during implementation:

- Clara: four saved recipes, two history records, four contributing embeddings,
  no missing embeddings, dimension 768, model `gemini-embedding-2`.
- Similarity leaders: Spicy Tofu Rice Bowl 0.940, Vegetable Fried Rice 0.882,
  Black Bean Tacos 0.880. Restrictions subsequently exclude Black Bean Tacos
  because of the unspecified tortilla.
- Clara shortlist through FastAPI: Spicy Tofu Rice Bowl 87, Vegetable Fried Rice
  75, Vegetable Curry 72. Scores can change with history/recency and pantry.
- Leo deterministic final endpoint: Chicken Alfredo 88, Garlic Parmesan Pasta
  88, Creamy Tomato Pasta 77. The latter is a discovery candidate.
- Offline tests verify agent integration using mocked responses, including 503
  fallback without retry and rejection of invalid agent recipe IDs.
- One live Leo Personal Agent attempt returned Gemini 503. FastAPI successfully
  returned the deterministic Top 3. Live explanation quality remains unverified;
  no further live requests were made.

pgvector reference: https://github.com/pgvector/pgvector#querying
