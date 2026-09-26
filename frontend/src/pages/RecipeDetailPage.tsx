import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MOCK_RECIPES, MOCK_FRIENDS } from '../lib/mockData'

export default function RecipeDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const recipe = MOCK_RECIPES.find(r => r.id === id) ?? MOCK_RECIPES[0]

  const [tab, setTab] = useState<'ingredients' | 'steps'>('ingredients')
  const [selectedFriends, setSelectedFriends] = useState<string[]>([])
  const [agentRunning, setAgentRunning] = useState(false)
  const [agentLogs, setAgentLogs] = useState<string[]>([])

  const haveCount = recipe.ingredients.filter(i => i.have).length

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

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '1.5rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Nav */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '0.9rem', padding: 0 }}>← Back</button>
          <a href={recipe.source_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.85rem', color: '#FAAED2', fontWeight: '500' }}>View original</a>
        </div>

        {/* Title */}
        <div>
          <h1 style={{ margin: '0 0 0.4rem', fontSize: '1.5rem', fontWeight: '700' }}>{recipe.title}</h1>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>
            Saved by {recipe.saved_by} · {recipe.time_minutes} min · serves {recipe.serves}
          </p>
        </div>

        {/* Ingredient progress */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>You have {haveCount}/{recipe.ingredients.length} ingredients</span>
            <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#F8CE5B' }}>${recipe.cost_to_finish.toFixed(2)} to finish</span>
          </div>
          <div style={{ height: '6px', background: '#e5e7eb', borderRadius: '999px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(haveCount / recipe.ingredients.length) * 100}%`, background: '#F8CE5B', borderRadius: '999px' }} />
          </div>
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
                <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: ing.have ? '#fce7f3' : '#f3f4f6', color: ing.have ? '#FAAED2' : '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', flexShrink: 0 }}>
                  {ing.have ? '✓' : '○'}
                </span>
                <span style={{ fontSize: '0.9rem', color: ing.have ? '#111827' : '#6b7280', flex: 1 }}>{ing.name}</span>
                {!ing.have && <span style={{ fontSize: '0.75rem', color: '#d97706', background: '#fef9c3', padding: '0.15rem 0.5rem', borderRadius: '999px' }}>need</span>}
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
            {MOCK_FRIENDS.map(f => (
              <label key={f.name} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                <input type="checkbox" checked={selectedFriends.includes(f.name)} onChange={() => toggleFriend(f.name)} />
                <span>{f.avatar} {f.name}</span>
                <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>— {f.taste}</span>
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

      </div>
    </div>
  )
}
