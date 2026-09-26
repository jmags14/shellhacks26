export interface Recipe {
  id: string
  title: string
  source_url: string
  platform: 'tiktok' | 'instagram'
  saved_by: string
  saved_by_avatar: string
  time_minutes: number
  ingredients: { name: string; have: boolean }[]
  steps: string[]
  tags: string[]
  cost_to_finish: number
  serves: number
}

export const MOCK_RECIPES: Recipe[] = [
  {
    id: '1',
    title: 'Birria Tacos',
    source_url: 'https://tiktok.com/@birriaking/video/123',
    platform: 'tiktok',
    saved_by: 'Rachel',
    saved_by_avatar: '🌮',
    time_minutes: 180,
    ingredients: [
      { name: 'beef chuck (2 lbs)', have: true },
      { name: 'dried guajillo chiles', have: true },
      { name: 'chipotle in adobo', have: true },
      { name: 'beef broth', have: true },
      { name: 'corn tortillas', have: false },
      { name: 'Oaxacan cheese', have: false },
      { name: 'white onion', have: true },
      { name: 'cilantro', have: true },
      { name: 'limes', have: false },
    ],
    steps: [
      'Toast dried chiles in a dry pan 30 seconds per side.',
      'Blend chiles with broth, chipotle, garlic, cumin, and oregano.',
      'Brown beef in batches then braise in chile sauce 2.5 hrs.',
      'Shred beef, dip tortillas in consommé, fry until crispy.',
      'Fill with beef + cheese, serve with consommé for dipping.',
    ],
    tags: ['dinner', 'mexican', 'weekend'],
    cost_to_finish: 9.5,
    serves: 4,
  },
  {
    id: '2',
    title: 'Baked Feta Pasta',
    source_url: 'https://instagram.com/p/abc123',
    platform: 'instagram',
    saved_by: 'Sarah',
    saved_by_avatar: '🧀',
    time_minutes: 45,
    ingredients: [
      { name: 'block feta (8 oz)', have: false },
      { name: 'cherry tomatoes (2 cups)', have: false },
      { name: 'rigatoni (12 oz)', have: true },
      { name: 'olive oil', have: true },
      { name: 'garlic (6 cloves)', have: true },
      { name: 'fresh basil', have: false },
      { name: 'red pepper flakes', have: true },
    ],
    steps: [
      'Preheat oven to 400°F. Put feta block in center of baking dish.',
      'Surround with cherry tomatoes, drizzle everything with olive oil.',
      'Season with pepper flakes and garlic. Bake 35 min until bubbly.',
      'Cook pasta, reserve 1 cup pasta water.',
      'Smash feta + tomatoes into a sauce, toss with pasta.',
    ],
    tags: ['dinner', 'pasta', 'easy'],
    cost_to_finish: 12.0,
    serves: 3,
  },
  {
    id: '3',
    title: 'Salmon Rice Bowl',
    source_url: 'https://tiktok.com/@healthyish/video/456',
    platform: 'tiktok',
    saved_by: 'Maya',
    saved_by_avatar: '🍣',
    time_minutes: 25,
    ingredients: [
      { name: 'salmon fillet (1 lb)', have: false },
      { name: 'sushi rice (2 cups)', have: true },
      { name: 'soy sauce', have: true },
      { name: 'sriracha mayo', have: true },
      { name: 'avocado', have: false },
      { name: 'cucumber', have: false },
      { name: 'sesame seeds', have: true },
      { name: 'furikake', have: false },
    ],
    steps: [
      'Cook sushi rice per package; season with rice vinegar.',
      'Cube salmon, marinate in soy + sesame oil 10 min.',
      'Air-fry salmon at 400°F for 8 min until caramelized.',
      'Bowl: rice → cucumber → avocado → salmon → sauces → furikake.',
    ],
    tags: ['lunch', 'healthy', 'quick'],
    cost_to_finish: 14.0,
    serves: 2,
  },
]

export const MOCK_FRIENDS = [
  { name: 'Rachel', avatar: '🌮', taste: 'Loves spicy, no shellfish' },
  { name: 'Sarah', avatar: '🧀', taste: 'Vegetarian-ish, hates cilantro' },
  { name: 'Maya', avatar: '🍣', taste: 'Gluten-free, loves umami' },
]
