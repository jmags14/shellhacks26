// SEEDED DATA — remove before final demo
// Fake recipes/friends for working without the backend.
// Only used when VITE_USE_SEEDED_DATA=true (see lib/api.ts).
import type { Friend, RecipeDetail } from './api'

export const SEEDED_FRIENDS: Friend[] = [
  { id: 'f1', name: 'Maya' },
  { id: 'f2', name: 'Jordan' },
]

export const SEEDED_RECIPES: RecipeDetail[] = [
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
