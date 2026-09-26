import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../lib/auth'
import { MOCK_RECIPES, MOCK_FRIENDS } from '../lib/mockData'

export default function HomePage() {
  const navigate = useNavigate()
  const { user, signOut } = useUser()
  const [query, setQuery] = useState('')

  const filtered = MOCK_RECIPES.filter(r =>
    query.length < 2 ||
    r.title.toLowerCase().includes(query.toLowerCase()) ||
    r.tags.some(t => t.includes(query.toLowerCase()))
  )

  return (
    <div>
      <header>
        <h1>Doomscroll &amp; Dine</h1>
        <span>{user?.email}</span>
        <button onClick={signOut}>Sign out</button>
      </header>

      <input
        type="text"
        placeholder="tacos, pasta, something quick…"
        value={query}
        onChange={e => setQuery(e.target.value)}
      />

      <section>
        <h2>Friends</h2>
        <ul>
          {MOCK_FRIENDS.map(f => (
            <li key={f.name}>{f.avatar} {f.name}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Saved Recipes</h2>
        <button onClick={() => navigate('/share')}>+ Add recipe</button>

        {filtered.length === 0 ? (
          <p>No recipes match that.</p>
        ) : (
          <ul>
            {filtered.map(recipe => {
              const haveCount = recipe.ingredients.filter(i => i.have).length
              return (
                <li key={recipe.id}>
                  <button onClick={() => navigate(`/recipe/${recipe.id}`)}>
                    <strong>{recipe.title}</strong>
                    <span> — saved by {recipe.saved_by}</span>
                    <span> — {haveCount}/{recipe.ingredients.length} ingredients</span>
                    <span> — ${recipe.cost_to_finish} to finish</span>
                    <span> — {recipe.time_minutes}min</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <button onClick={() => navigate('/recipe/1')}>Cook Together</button>
    </div>
  )
}
