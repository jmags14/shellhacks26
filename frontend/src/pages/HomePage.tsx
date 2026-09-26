import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../lib/auth'
import { api, type RecipeSummary } from '../lib/api'
import { MOCK_FRIENDS } from '../lib/mockData'

export default function HomePage() {
  const navigate = useNavigate()
  const { user, signOut } = useUser()
  const [query, setQuery] = useState('')
  const [backendUp, setBackendUp] = useState<boolean | null>(null)

  const [recipes, setRecipes] = useState<RecipeSummary[]>([])
  const [recipesLoading, setRecipesLoading] = useState(true)
  const [recipesError, setRecipesError] = useState('')

  // Temporary connectivity check against the FastAPI backend.
  useEffect(() => {
    api.health().then(() => setBackendUp(true)).catch(() => setBackendUp(false))
  }, [])

  useEffect(() => {
    if (!user) return
    api.listRecipes(user.id)
      .then(res => setRecipes(res.recipes))
      .catch(() => setRecipesError('Could not load recipes.'))
      .finally(() => setRecipesLoading(false))
  }, [user])

  const filtered = recipes.filter(r =>
    query.length < 2 ||
    r.title.toLowerCase().includes(query.toLowerCase()) ||
    (r.cuisine ?? '').toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: '400', fontFamily: 'Bebas Neue, sans-serif', color: '#1a1a1a' }}>Doomscroll &amp; Dine</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span
            title={backendUp === null ? 'Checking backend…' : backendUp ? 'Backend connected' : 'Backend unreachable'}
            style={{ width: '8px', height: '8px', borderRadius: '50%', background: backendUp === null ? '#9ca3af' : backendUp ? '#22c55e' : '#ef4444' }}
          />
          <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{user?.user_metadata?.full_name?.split(' ')[0] ?? user?.email}</span>
          <button onClick={signOut} style={{ fontSize: '0.8rem', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            Sign out
          </button>
        </div>
      </header>

      <div style={{ padding: '1.25rem', maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Search */}
        <input
          type="text"
          placeholder="Search recipes…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ width: '100%', padding: '0.75rem 1rem', boxSizing: 'border-box', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.95rem', outline: 'none', background: '#fff' }}
        />

        {/* Friends */}
        <section>
          <h2 style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Friends</h2>
          <div style={{ display: 'flex', gap: '1rem' }}>
            {MOCK_FRIENDS.map(f => (
              <div key={f.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
                  {f.avatar}
                </div>
                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{f.name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Recipes */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <h2 style={{ margin: 0, fontSize: '0.8rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Saved Recipes</h2>
            <button onClick={() => navigate('/share')} style={{ fontSize: '0.85rem', fontWeight: '600', color: '#2F6B4F', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              + Add
            </button>
          </div>

          {recipesLoading ? (
            <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Loading recipes…</p>
          ) : recipesError ? (
            <p style={{ color: '#ef4444', fontSize: '0.9rem' }}>{recipesError}</p>
          ) : filtered.length === 0 ? (
            <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
              {recipes.length === 0 ? 'No recipes yet — tap + Add.' : 'No recipes match that.'}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {filtered.map(recipe => (
                <button
                  key={recipe.id}
                  onClick={() => navigate(`/recipe/${recipe.id}`)}
                  style={{ textAlign: 'left', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '1rem', cursor: 'pointer', width: '100%' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                    <div>
                      <p style={{ margin: '0 0 0.25rem', fontWeight: '600', fontSize: '0.95rem', color: '#111827' }}>{recipe.title}</p>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280' }}>
                        {[recipe.cuisine, recipe.time_minutes && `${recipe.time_minutes} min`].filter(Boolean).join(' · ') || recipe.source}
                      </p>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280', flexShrink: 0 }}>{recipe.ingredient_count} ingredients</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Cook Together CTA */}
        <button
          onClick={() => recipes[0] && navigate(`/recipe/${recipes[0].id}`)}
          style={{ width: '100%', padding: '0.875rem', background: '#2F6B4F', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.95rem', fontWeight: '600', cursor: 'pointer' }}
        >
          Cook Together
        </button>

      </div>
    </div>
  )
}
