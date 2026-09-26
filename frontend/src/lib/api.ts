// SEEDED DATA — remove before final demo
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export interface Friend {
  id: string
  name: string
  taste?: string
}

export interface RecipeIngredient {
  name: string
  have: boolean
}

export interface RecipeSummary {
  id: string
  title: string
  source?: string
  source_url?: string
  cuisine?: string
  servings?: number
  time_minutes?: number
  ingredient_count?: number
  cost_to_finish?: number
  ingredients?: RecipeIngredient[]
  steps?: string[]
}

const MOCK_RECIPES: RecipeSummary[] = [
  {
    id: '1', title: 'Spicy Tteokbokki', time_minutes: 25, cost_to_finish: 8,
    ingredients: [{ name: 'rice cakes', have: true }, { name: 'gochujang', have: true }, { name: 'fish cakes', have: false }],
    steps: ['Soak rice cakes in warm water for 20 minutes', 'Mix gochujang, soy sauce, and sugar in a bowl', 'Add fish cakes and rice cakes to a pan with the sauce', 'Simmer on medium heat for 10 minutes until sauce thickens', 'Garnish with green onions and sesame seeds'],
  },
  {
    id: '2', title: 'Mango Sticky Rice', time_minutes: 30, cost_to_finish: 12,
    ingredients: [{ name: 'glutinous rice', have: false }, { name: 'mango', have: true }, { name: 'coconut milk', have: true }],
    steps: ['Soak glutinous rice for 4 hours then steam for 25 minutes', 'Heat coconut milk with sugar and salt until dissolved', 'Pour coconut milk mixture over cooked rice and let absorb', 'Peel and slice fresh mango', 'Plate sticky rice with mango slices and drizzle remaining coconut milk'],
  },
  {
    id: '3', title: 'Birria Tacos', time_minutes: 45, cost_to_finish: 15,
    ingredients: [{ name: 'beef chuck', have: false }, { name: 'dried chiles', have: false }, { name: 'corn tortillas', have: true }],
    steps: ['Toast dried chiles in a dry pan then soak in hot water for 15 minutes', 'Blend chiles with garlic, cumin, and oregano into a paste', 'Coat beef chuck in chile paste and marinate 1 hour', 'Braise beef in broth for 3 hours until tender', 'Shred beef, dip tortillas in the broth, and fry until crispy', 'Fill tacos with beef and serve with consommé for dipping'],
  },
]

export async function getRecipe(id: string): Promise<RecipeSummary | null> {
  return MOCK_RECIPES.find(r => r.id === id) ?? null
}

export async function listFriends(_userId: string): Promise<{ friends: Friend[] }> {
  return { friends: [{ id: 'f1', name: 'Maya' }, { id: 'f2', name: 'Jordan' }] }
}

export const api = {
  health: () =>
    fetch(`${BASE_URL}/`).then(r => { if (!r.ok) throw new Error('unhealthy'); return r.json() }),

  listFriends: (_userId: string): Promise<{ friends: Friend[] }> =>
    Promise.resolve({ friends: [
      { id: 'f1', name: 'Maya' },
      { id: 'f2', name: 'Jordan' },
    ]}),

  listRecipes: (_userId: string): Promise<{ recipes: RecipeSummary[] }> =>
    Promise.resolve({ recipes: MOCK_RECIPES }),
}
