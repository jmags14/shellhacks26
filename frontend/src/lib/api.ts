import { supabase } from './supabase'
import { SEEDED_FRIENDS, SEEDED_RECIPES } from './seededData'

// In dev, '/api' is proxied to the FastAPI backend (see vite.config.ts).
// Set VITE_API_URL in the root .env to point at a deployed backend instead.
const API_URL = import.meta.env.VITE_API_URL ?? '/api'

// Set VITE_USE_SEEDED_DATA=true in the root .env to use the fake recipes/friends
// in lib/seededData.ts instead of the backend (recipes, friends only).
const USE_SEEDED_DATA = import.meta.env.VITE_USE_SEEDED_DATA === 'true'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  // Attach the Supabase access token so the backend can identify the user
  // (backend verification is not implemented yet).
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  })

  if (!res.ok) {
    throw new ApiError(res.status, (await res.text()) || res.statusText)
  }
  return res.json() as Promise<T>
}

export interface Friend {
  id: string
  name: string
  emoji: string
  taste?: string
}

export interface RecipeIngredient {
  name: string
  quantity?: number | string | null
  unit?: string | null
  preparation?: string | null
  optional?: boolean
  have?: boolean // seeded data only
}

export interface RecipeSummary {
  id: string
  title: string
  source?: string | null
  source_url?: string | null
  cuisine?: string | null
  servings?: number | null
  time_minutes?: number | null
  ingredient_count?: number
}

export interface RecipeDetail extends RecipeSummary {
  description?: string | null
  ingredients: RecipeIngredient[]
  steps: string[]
  cost_to_finish?: number // seeded data only
}

const FRIEND_EMOJIS = ['🐱', '🐼', '🦊', '🐨', '🐰', '🐸', '🦁', '🐙']

// The DB has no avatar field, so derive a stable emoji from the friend's id.
function emojiFor(id: string): string {
  let sum = 0
  for (const ch of id) sum += ch.charCodeAt(0)
  return FRIEND_EMOJIS[sum % FRIEND_EMOJIS.length]
}

// Why a recipe might suit one person, computed from their saved/cooked recipes.
export interface TasteEvidence {
  cuisine: string | null
  cuisine_matches: number // how many of their saved/cooked recipes share this cuisine
  saved_or_cooked_total: number
  most_similar_recipe: { title: string; similarity_pct: number } | null
  taste_match_pct: number | null
  already_saved_or_cooked: boolean
  your_rating: number | null
}

export interface CookTogetherResult {
  mock: boolean // true while the backend runs with Gemini disabled
  // mock: Gemini off | ok: real agents | planner_fallback: planner was busy, ranked by
  // the real Personal Agent scores | unavailable: Gemini unreachable, placeholder scores
  agent_status: 'mock' | 'ok' | 'planner_fallback' | 'unavailable'
  top_pick: string
  conflicts_resolved: string[]
  ranking: { recipe_id: string; title: string; group_score: number; why: string[]; conflicts: string[] }[]
  agents: {
    user_id: string
    user_name: string
    evidence: Record<string, TasteEvidence> // by recipe_id
    evaluations: {
      recipe_id: string
      fit_score: number
      dealbreakers: string[]
      reasons: string[]
      can_bring: string[]
      missing: string[]
    }[]
  }[]
}

export interface Recommendation {
  recipe_id: string
  title: string
  match_score: number // 0-100
  cuisine: string | null
  time_minutes: number | null
  ingredient_count: number
  discovery: boolean // true = a recipe the user hasn't saved or cooked yet
  reason: string
  reason_source: 'deterministic' | 'personal_agent'
}

export interface RecommendationsResult {
  status: 'ok' | 'cold_start' | 'limited_candidates' | 'no_eligible_candidates'
  agent_used: boolean
  agent_status?: 'unavailable'
  recommendations: Recommendation[]
}

export async function listFriends(userId: string): Promise<{ friends: Friend[] }> {
  if (USE_SEEDED_DATA) return { friends: SEEDED_FRIENDS }

  const res = await request<{ friends: { id: string; username: string; taste?: string }[] }>(
    `/friends?user_id=${encodeURIComponent(userId)}`,
  )
  return { friends: res.friends.map(f => ({ id: f.id, name: f.username, emoji: emojiFor(f.id), taste: f.taste })) }
}

export async function listFriendSuggestions(userId: string): Promise<{ users: Friend[] }> {
  if (USE_SEEDED_DATA) return { users: [] }

  const res = await request<{ users: { id: string; username: string }[] }>(
    `/friends/suggestions?user_id=${encodeURIComponent(userId)}`,
  )
  return { users: res.users.map(u => ({ id: u.id, name: u.username, emoji: emojiFor(u.id) })) }
}

export async function addFriend(userId: string, friendId: string): Promise<{ success: boolean; error?: string }> {
  if (USE_SEEDED_DATA) return { success: true }

  return request<{ success: boolean; error?: string }>('/friends', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, friend_id: friendId }),
  })
}

export async function listRecipes(userId: string): Promise<{ recipes: RecipeSummary[] }> {
  if (USE_SEEDED_DATA) {
    return {
      recipes: SEEDED_RECIPES.map(r => ({ ...r, ingredient_count: r.ingredients.length })),
    }
  }

  const res = await request<{ recipes: RecipeSummary[] }>(
    `/recipes?user_id=${encodeURIComponent(userId)}`,
  )
  return { recipes: res.recipes }
}

export async function getRecipe(recipeId: string, userId: string): Promise<RecipeDetail | null> {
  if (USE_SEEDED_DATA) return SEEDED_RECIPES.find(r => r.id === recipeId) ?? null

  const res = await request<{ success: boolean; recipe?: RecipeDetail }>(
    `/recipes/${recipeId}?user_id=${encodeURIComponent(userId)}`,
  )
  return res.success && res.recipe ? res.recipe : null
}

export const api = {
  health: () => request<{ status: string }>('/'),

  listFriends,
  listFriendSuggestions,
  addFriend,
  listRecipes,
  getRecipe,

  // Background import: returns a job id right away; poll importStatus for the result.
  startImport: (url: string, userId: string) =>
    request<{ success: boolean; job_id: string }>('/import/start', {
      method: 'POST',
      body: JSON.stringify({ url, user_id: userId }),
    }),

  importStatus: (jobId: string) =>
    request<{ success: boolean; status: 'running' | 'done' | 'error'; recipe_id?: string | null; error?: string | null }>(
      `/import/status/${jobId}`,
    ),

  importRecipe: (url: string, userId: string) =>
    request<{ success: boolean; recipe_id?: string; error?: string }>('/import', {
      method: 'POST',
      body: JSON.stringify({ url, user_id: userId }),
    }),

  // useAgent=true spends one Gemini request; the default is free and deterministic.
  // exclude: recipe IDs to skip, so a reroll doesn't repeat what was already shown.
  getRecommendations: (userId: string, useAgent = false, exclude: string[] = []) => {
    const params = new URLSearchParams()
    if (useAgent) params.set('use_agent', 'true')
    exclude.forEach(id => params.append('exclude', id))
    const qs = params.toString()
    return request<RecommendationsResult>(`/recommendations/${userId}${qs ? `?${qs}` : ''}`)
  },

  cookTogether: (userIds: string[], intent?: string) =>
    request<CookTogetherResult>('/cook-together', {
      method: 'POST',
      body: JSON.stringify({ user_ids: userIds, intent }),
    }),

  // Adds a recipe to the user's home page (saved_recipes). Safe to call again.
  saveRecipe: (recipeId: string, userId: string) =>
    request<{ success: boolean }>(`/recipes/${recipeId}/save`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    }),

  // rating: 5 = love it, 3 = like it, 1 = hate it
  rateRecipe: (recipeId: string, userId: string, rating: 1 | 3 | 5) =>
    request<{ success: boolean; error?: string }>(`/recipes/${recipeId}/rate`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, rating }),
    }),
}
