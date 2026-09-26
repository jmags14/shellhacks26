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
    // TODO: replace with real SSE from POST /cook-together
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

  return (
    <div>
      <button onClick={() => navigate(-1)}>← Back</button>

      <h1>{recipe.title}</h1>
      <p>Saved by {recipe.saved_by} · {recipe.time_minutes} min · serves {recipe.serves}</p>
      <a href={recipe.source_url} target="_blank" rel="noreferrer">View original</a>

      <p>
        You have {haveCount}/{recipe.ingredients.length} ingredients —{' '}
        ${recipe.cost_to_finish.toFixed(2)} to finish
      </p>

      {/* Tabs */}
      <div role="tablist">
        <button role="tab" aria-selected={tab === 'ingredients'} onClick={() => setTab('ingredients')}>
          Ingredients
        </button>
        <button role="tab" aria-selected={tab === 'steps'} onClick={() => setTab('steps')}>
          Steps
        </button>
      </div>

      {tab === 'ingredients' ? (
        <ul>
          {recipe.ingredients.map(ing => (
            <li key={ing.name}>
              <span>{ing.have ? '✓' : '○'}</span>
              <span>{ing.name}</span>
              {!ing.have && <span>(need to buy)</span>}
            </li>
          ))}
        </ul>
      ) : (
        <ol>
          {recipe.steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      )}

      {/* Cook Together */}
      <section>
        <h2>Cook Together</h2>
        <p>Pick who's joining and let AI check allergies, pantries, and split the cost.</p>

        <div>
          {MOCK_FRIENDS.map(f => (
            <label key={f.name}>
              <input
                type="checkbox"
                checked={selectedFriends.includes(f.name)}
                onChange={() => toggleFriend(f.name)}
              />
              {f.avatar} {f.name} — {f.taste}
            </label>
          ))}
        </div>

        <button
          onClick={startCookTogether}
          disabled={agentRunning || selectedFriends.length === 0}
        >
          {agentRunning ? 'Planning…' : 'Start AI planning'}
        </button>

        {agentLogs.length > 0 && (
          <pre>
            {agentLogs.join('\n')}
            {agentRunning && '\n▊'}
          </pre>
        )}
      </section>
    </div>
  )
}
