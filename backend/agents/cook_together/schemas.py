# backend/agents/cook_together/schemas.py

from typing import Optional
from pydantic import BaseModel, Field


# ---------- INPUT DATA ----------

class Ingredient(BaseModel):
    name: str
    quantity: Optional[float] = None
    unit: Optional[str] = None


class CandidateRecipe(BaseModel):
    recipe_id: str
    title: str
    ingredients: list[Ingredient]
    tags: list[str] = []
    dietary: list[str] = []
    time_minutes: Optional[int] = None


class PantryItem(BaseModel):
    name: str
    quantity: Optional[float] = None
    unit: Optional[str] = None

class RecipeHistoryItem(BaseModel):
    recipe_id: str
    title: str
    rating: Optional[int] = None


class SavedRecipe(BaseModel):
    recipe_id: str
    title: str


class UserContext(BaseModel):
    user_id: str
    name: str

    # Explicit safety information
    allergies: list[str] = []

    # What they currently have
    pantry: list[PantryItem] = []

    # Behavioral preference signals
    saved_recipes: list[SavedRecipe] = []
    recipe_history: list[RecipeHistoryItem] = []

# ---------- PERSONAL AGENT OUTPUT ----------

class RecipeEvaluation(BaseModel):
    recipe_id: str

    fit_score: int = Field(
        ge=0,
        le=10,
        description="How well this recipe fits this specific user."
    )

    dealbreakers: list[str] = []
    reasons: list[str] = []

    can_bring: list[str] = []
    missing: list[str] = []


class PersonalAgentOutput(BaseModel):
    user_id: str
    user_name: str
    evaluations: list[RecipeEvaluation]


# ---------- PLANNER OUTPUT ----------

class RankedRecipe(BaseModel):
    recipe_id: str
    group_score: float

    why: list[str] = []
    conflicts: list[str] = []


class PlannerOutput(BaseModel):
    ranking: list[RankedRecipe]

    top_pick: str
    conflicts_resolved: list[str] = []