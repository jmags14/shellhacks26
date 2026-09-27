import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import { useUser } from '../lib/auth'
import { api, type RecipeSummary } from '../lib/api'
import { dismissImport, useImportJobs } from '../lib/importQueue'

export default function HomePage() {
  const navigate = useNavigate()
  const { user, signOut } = useUser()
  const [query, setQuery] = useState('')
  const [backendUp, setBackendUp] = useState<boolean | null>(null)

  const importJobs = useImportJobs()
  const doneImports = importJobs.filter(j => j.status === 'done').length
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
      .then(res => { console.log('recipes result:', res); setRecipes(res.recipes) })
      .catch(err => { console.error('recipes error:', err); setRecipesError('Could not load recipes.') })
      .finally(() => setRecipesLoading(false))
    // Refetch when a background import finishes so the new recipe appears.
  }, [user, doneImports])

  const filtered = recipes.filter(r =>
    query.length < 2 ||
    r.title.toLowerCase().includes(query.toLowerCase()) ||
    (r.cuisine ?? '').toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: 'system-ui, sans-serif', paddingBottom: '80px' }}>

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

        {/* Recipes */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <h2 style={{ margin: 0, fontSize: '0.8rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Saved Recipes</h2>
            <button onClick={() => navigate('/share')} style={{ fontSize: '0.85rem', fontWeight: '600', color: '#2F6B4F', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              + Add
            </button>
          </div>

          {importJobs.filter(j => j.status !== 'done').map(job => (
            <div
              key={job.id}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem', padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.85rem', background: job.status === 'error' ? '#fef2f2' : '#fdf2f8', border: `1px solid ${job.status === 'error' ? '#fecaca' : '#fbcfe8'}`, color: job.status === 'error' ? '#b91c1c' : '#3D2B1F' }}
            >
              <span>{job.status === 'error' ? `Couldn't import that recipe. ${job.error ?? ''}` : 'Importing your recipe… this can take a minute.'}</span>
              {job.status === 'error' && (
                <button onClick={() => dismissImport(job.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: '600', padding: 0 }}>Dismiss</button>
              )}
            </div>
          ))}

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
                <Link
                  key={recipe.id}
                  to={`/recipe/${recipe.id}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div style={{ textAlign: 'left', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '1rem', cursor: 'pointer', width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                      <div>
                        <p style={{ margin: '0 0 0.25rem', fontWeight: '600', fontSize: '0.95rem', color: '#111827' }}>{recipe.title}</p>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280' }}>
                          {[recipe.cuisine, recipe.time_minutes && `${recipe.time_minutes} min`].filter(Boolean).join(' · ') || recipe.source}
                        </p>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280', flexShrink: 0 }}>{recipe.ingredient_count} ingredients</p>
                    </div>
                  </div>
                </Link>
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
      <BottomNav />
    </div>
  )
}
