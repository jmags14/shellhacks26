from uuid import UUID

from fastapi import APIRouter, HTTPException, Query

from services.recommendation_service import RecommendationDataError, build_shortlist, get_recommendations

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.get("/{user_id}")
async def recommendations(user_id: UUID, use_agent: bool = False, exclude: list[UUID] = Query(default=[])):
    """Two new + one familiar. Opt in to one Personal Agent call with use_agent=true.

    exclude: recipe IDs to skip, used by the app's reroll so it doesn't repeat.
    """
    try:
        return await get_recommendations(user_id, use_agent=use_agent, exclude={str(e) for e in exclude})
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RecommendationDataError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.get("/{user_id}/shortlist")
def recommendation_shortlist(user_id: UUID):
    """Development preview: top five and score diagnostics, zero LLM requests."""
    try:
        result, _, _ = build_shortlist(user_id)
        return result
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RecommendationDataError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
