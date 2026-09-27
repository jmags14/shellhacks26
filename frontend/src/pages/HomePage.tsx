import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import { useUser } from '../lib/auth'
import { api, type RecipeSummary } from '../lib/api'
import { dismissImport, useImportJobs } from '../lib/importQueue'
import { supabase } from '../lib/supabase'

function getDifficultyDot(minutes: number) {
  if (minutes <= 20) return { color: '#86efac', label: 'Easy' }
  if (minutes <= 45) return { color: '#F8CE5B', label: 'Medium' }
  return { color: '#fca5a5', label: 'Hard' }
}

export default function HomePage() {
  const navigate = useNavigate()
  const { user } = useUser()
  const [query, setQuery] = useState('')
  const importJobs = useImportJobs()
  const doneImports = importJobs.filter(j => j.status === 'done').length
  const [recipes, setRecipes] = useState<RecipeSummary[]>([])
  const [recipesLoading, setRecipesLoading] = useState(true)
  const [recipesError, setRecipesError] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const handleDelete = async (recipeId: string) => {
    const { data } = await supabase.auth.getUser()
    const userId = data.user?.id
    if (!userId) return
    await fetch(`/api/recipes/${recipeId}?user_id=${userId}`, { method: 'DELETE' })
    setRecipes(prev => prev.filter(r => r.id !== recipeId))
    setConfirmDeleteId(null)
  }

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
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #F6C4C3 0%, #FAFC97 100%)',
      paddingBottom: '80px'
    }}>
      {/* Header */}
      <div style={{ padding: '48px 24px 24px' }}>
        <h1 style={{
          fontFamily: 'Bebas Neue, sans-serif',
          fontSize: 42,
          color: '#3d1c02',
          margin: '0 0 24px',
          lineHeight: 1.1,
          letterSpacing: 1
        }}>
          Doomscroll &<br />Dine
        </h1>

        {/* Search bar */}
        <input
          type="text"
          placeholder="Search recipes..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '14px 20px',
            borderRadius: 50,
            border: 'none',
            background: '#FFFFE0',
            fontSize: 15,
            fontFamily: 'Nunito, sans-serif',
            color: '#3d1c02',
            boxSizing: 'border-box',
            outline: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
          }}
        />
      </div>

      {/* Recipes */}
      <div style={{ padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{
            fontFamily: 'Bebas Neue, sans-serif',
            fontSize: 22,
            color: '#3d1c02',
            margin: 0,
            letterSpacing: 1
          }}>
            Saved Recipes
          </h2>
          <button onClick={() => navigate('/share')} style={{ fontSize: 14, fontWeight: 700, color: '#3d1c02', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'Nunito, sans-serif' }}>
            + Add
          </button>
        </div>

        {importJobs.filter(j => j.status !== 'done').map(job => (
          <div
            key={job.id}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12, padding: '12px 16px', borderRadius: 12, fontSize: 14, background: job.status === 'error' ? '#fef2f2' : '#fdf2f8', border: `1px solid ${job.status === 'error' ? '#fecaca' : '#fbcfe8'}`, color: job.status === 'error' ? '#b91c1c' : '#3D2B1F' }}
          >
            <span>{job.status === 'error' ? `Couldn't import that recipe. ${job.error ?? ''}` : 'Importing your recipe… this can take a minute.'}</span>
            {job.status === 'error' && (
              <button onClick={() => dismissImport(job.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700, padding: 0 }}>Dismiss</button>
            )}
          </div>
        ))}

        {recipesLoading ? (
          <p style={{ color: '#3d1c02', fontFamily: 'Nunito, sans-serif' }}>Loading recipes...</p>
        ) : recipesError ? (
          <p style={{ color: '#b91c1c', fontFamily: 'Nunito, sans-serif' }}>{recipesError}</p>
        ) : filtered.length === 0 ? (
          <p style={{ color: '#3d1c02', fontFamily: 'Nunito, sans-serif' }}>
            {recipes.length === 0 ? 'No recipes yet — tap + Add.' : 'No recipes match that.'}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(recipe => (
              confirmDeleteId === recipe.id ? (
                <div key={recipe.id} style={{
                  background: '#fff',
                  borderRadius: 16,
                  padding: '16px 20px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 16,
                  minHeight: 72
                }}>
                  <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: 14, color: '#3d1c02', fontWeight: 600 }}>Delete this recipe?</span>
                  <button onClick={() => handleDelete(recipe.id)} style={{
                    background: '#dc2626', border: 'none', borderRadius: 50,
                    padding: '6px 16px', fontSize: 13, color: '#fff',
                    fontFamily: 'Nunito, sans-serif', fontWeight: 700, cursor: 'pointer'
                  }}>Yes</button>
                  <button onClick={() => setConfirmDeleteId(null)} style={{
                    background: '#e5e7eb', border: 'none', borderRadius: 50,
                    padding: '6px 16px', fontSize: 13, color: '#3d1c02',
                    fontFamily: 'Nunito, sans-serif', fontWeight: 700, cursor: 'pointer'
                  }}>No</button>
                </div>
              ) : (
              <Link
                key={recipe.id}
                to={`/recipe/${recipe.id}`}
                style={{ textDecoration: 'none' }}
              >
                <div style={{
                  background: '#fff',
                  borderRadius: 16,
                  padding: '16px 20px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  position: 'relative'
                }}>
                  <div style={{ position: 'absolute', top: 10, right: 12 }}>
                    <button onClick={(e) => { e.preventDefault(); setConfirmDeleteId(recipe.id) }} style={{
                      background: 'none', border: 'none', fontSize: 14,
                      color: '#ccc', cursor: 'pointer', lineHeight: 1
                    }}>✕</button>
                  </div>
                  <div>
                    <p style={{
                      fontFamily: 'Nunito, sans-serif',
                      fontWeight: 700,
                      fontSize: 16,
                      color: '#3d1c02',
                      margin: '0 0 4px'
                    }}>
                      {recipe.title}
                    </p>
                    <p style={{
                      fontFamily: 'Nunito, sans-serif',
                      fontSize: 13,
                      color: '#888',
                      margin: 0
                    }}>
                      {recipe.cuisine} · ⏱ {recipe.time_minutes} min · 🛒 {recipe.ingredient_count} ingredients
                    </p>
                  </div>
                  {(() => {
                    const diff = getDifficultyDot(recipe.time_minutes)
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 40 }}>
                        <div style={{
                          width: 14, height: 14, borderRadius: '50%',
                          background: diff.color,
                          flexShrink: 0
                        }} />
                        <span style={{
                          fontSize: 10, fontFamily: 'Nunito, sans-serif',
                          color: '#888', fontWeight: 600
                        }}>{diff.label}</span>
                      </div>
                    )
                  })()}
                </div>
              </Link>
              )
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
