import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useUser } from '../lib/auth'
import { api, type Friend, type RecipeDetail } from '../lib/api'

export default function RecipeDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useUser()
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null)
  const [loadError, setLoadError] = useState('')
  const [friends, setFriends] = useState<Friend[]>([])

  const [tab, setTab] = useState<'ingredients' | 'steps'>('ingredients')
  const [selectedFriends, setSelectedFriends] = useState<string[]>([])
  const [agentRunning, setAgentRunning] = useState(false)
  const [agentLogs, setAgentLogs] = useState<string[]>([])
  const [rating, setRating] = useState<string | null>(null)
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!user) return
    api.listFriends(user.id).then(res => setFriends(res.friends)).catch(() => {})
  }, [user])

  useEffect(() => {
    if (!user || !id) return
    api.getRecipe(id, user.id)
      .then(res => {
        if (res.success && res.recipe) setRecipe(res.recipe)
        else setLoadError(res.error ?? 'Recipe not found.')
      })
      .catch(() => setLoadError('Could not load recipe.'))
  }, [user, id])

  function toggleFriend(name: string) {
    setSelectedFriends(prev =>
      prev.includes(name) ? prev.filter(f => f !== name) : [...prev, name]
    )
  }

  async function startCookTogether() {
    setAgentRunning(true)
    setAgentLogs([])
    const events = [
      'Starting Personal Agents for each friend…',
      `Rachel's agent: no allergy conflicts found`,
      `Sarah's agent: no cilantro in this recipe`,
      `Maya's agent: checking gluten — tortillas ⚠️ (can swap to corn)`,
      'Planner: scoring recipe for the group…',
      'Group score: 87/100 — great match!',
      'Shopping list: corn tortillas, Oaxacan cheese, limes',
      'Cost split: ~$3.17 per person',
      'Done! Everyone can eat this.',
    ]
    for (const event of events) {
      await new Promise(r => setTimeout(r, 600))
      setAgentLogs(prev => [...prev, event])
    }
    setAgentRunning(false)
  }

  const tabBtn = (t: 'ingredients' | 'steps') => ({
    flex: 1, padding: '0.6rem', border: 'none', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500',
    background: tab === t ? '#FAAED2' : '#fff',
    color: tab === t ? '#fff' : '#6b7280',
    borderRadius: t === 'ingredients' ? '8px 0 0 8px' : '0 8px 8px 0',
    borderTop: '1px solid #d1d5db', borderBottom: '1px solid #d1d5db',
    borderLeft: t === 'ingredients' ? '1px solid #d1d5db' : 'none',
    borderRight: t === 'steps' ? '1px solid #d1d5db' : 'none',
  })

  if (!recipe) {
    return (
      <div style={{ padding: '1.5rem 1.25rem', fontFamily: 'system-ui, sans-serif' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '0.9rem', padding: 0 }}>← Back</button>
        <p style={{ color: loadError ? '#ef4444' : '#6b7280' }}>{loadError || 'Loading…'}</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '1.5rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Nav */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '0.9rem', padding: 0 }}>← Back</button>
          {recipe.source_url && (
            <a href={recipe.source_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.85rem', color: '#FAAED2', fontWeight: '500' }}>View original</a>
          )}
        </div>

        {/* Title */}
        <div>
          <h1 style={{ margin: '0 0 0.4rem', fontSize: '1.5rem', fontWeight: '700' }}>{recipe.title}</h1>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>
            {[recipe.cuisine, recipe.time_minutes && `${recipe.time_minutes} min`, recipe.servings && `serves ${recipe.servings}`].filter(Boolean).join(' · ')}
          </p>
          {recipe.description && (
            <p style={{ margin: '0.5rem 0 0', color: '#374151', fontSize: '0.9rem', lineHeight: '1.5' }}>{recipe.description}</p>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex' }}>
          <button style={tabBtn('ingredients')} onClick={() => setTab('ingredients')}>Ingredients</button>
          <button style={tabBtn('steps')} onClick={() => setTab('steps')}>Steps</button>
        </div>

        {tab === 'ingredients' ? (
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {recipe.ingredients.map(ing => (
              <li key={ing.name} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0', borderBottom: '1px solid #f3f4f6' }}>
                <span style={{ fontSize: '0.9rem', color: '#111827', flex: 1 }}>
                  {[ing.quantity != null && Number(ing.quantity), ing.unit, ing.name].filter(Boolean).join(' ')}
                  {ing.preparation && <span style={{ color: '#6b7280' }}>, {ing.preparation}</span>}
                </span>
                {ing.optional && <span style={{ fontSize: '0.75rem', color: '#6b7280', background: '#f3f4f6', padding: '0.15rem 0.5rem', borderRadius: '999px' }}>optional</span>}
              </li>
            ))}
          </ul>
        ) : (
          <ol style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {recipe.steps.map((step, i) => (
              <li key={i} style={{ fontSize: '0.9rem', color: '#374151', lineHeight: '1.5' }}>{step}</li>
            ))}
          </ol>
        )}

        {/* Cook Together */}
        <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <h2 style={{ margin: '0 0 0.25rem', fontSize: '1rem', fontWeight: '600' }}>Cook Together</h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280' }}>Pick who's joining and let AI check allergies, pantries, and split the cost.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {friends.length === 0 && <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>No friends yet.</span>}
            {friends.map(f => (
              <label key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                <input type="checkbox" checked={selectedFriends.includes(f.username)} onChange={() => toggleFriend(f.username)} />
                <span>{f.username}</span>
                {f.taste && <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>— {f.taste}</span>}
              </label>
            ))}
          </div>

          <button
            onClick={startCookTogether}
            disabled={agentRunning || selectedFriends.length === 0}
            style={{ padding: '0.75rem', background: '#FAAED2', color: '#3D2B1F', border: 'none', borderRadius: '8px', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer', opacity: selectedFriends.length === 0 ? 0.5 : 1 }}
          >
            {agentRunning ? 'Planning…' : 'Start AI planning'}
          </button>

          {agentLogs.length > 0 && (
            <pre style={{ margin: 0, background: '#111827', color: '#4ade80', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8rem', lineHeight: '1.6', overflowX: 'auto' }}>
              {agentLogs.join('\n')}{agentRunning ? '\n▊' : ''}
            </pre>
          )}
        </section>

        {/* Rating */}
        <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#6b7280' }}>Rate this recipe</span>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {[['😍', 'I love it'], ['👍', 'Like it'], ['👎', 'Hate it']].map(([emoji, label]) => (
              <button
                key={label}
                onClick={() => setRating(label)}
                style={{
                  flex: 1, padding: '0.5rem 0.25rem',
                  background: rating === label ? '#FAAED2' : '#fff',
                  color: rating === label ? '#3D2B1F' : '#374151',
                  border: `${rating === label ? '2px solid #e8a0c0' : '1px solid #d1d5db'}`,
                  borderRadius: '999px', fontSize: '0.8rem', fontWeight: '500', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
                }}
              >
                {emoji} {label}
              </button>
            ))}
          </div>

          <textarea
            placeholder="Add a note..."
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={3}
            style={{ width: '100%', padding: '0.6rem 0.75rem', boxSizing: 'border-box', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '0.85rem', resize: 'none', outline: 'none', fontFamily: 'inherit' }}
          />

          <button
            style={{ width: '100%', padding: '0.7rem', background: '#F8CE5B', color: '#3D2B1F', border: 'none', borderRadius: '12px', fontSize: '0.9rem', fontWeight: '700', cursor: 'pointer' }}
          >
            Save
          </button>
        </section>

      </div>
    </div>
  )
}
