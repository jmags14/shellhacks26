import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import { useUser } from '../lib/auth'
import { api, listFriends, type CookTogetherResult, type Friend, type TasteEvidence } from '../lib/api'

const cap = (name: string) => name.charAt(0).toUpperCase() + name.slice(1)

// Plain-language reasons a recipe might suit someone, from their saved/cooked recipes.
function evidenceLines(ev: TasteEvidence | undefined): string[] {
  if (!ev) return []
  const lines: string[] = []
  if (ev.your_rating != null) lines.push(`Rated it ${ev.your_rating}/5 when they cooked it`)
  else if (ev.already_saved_or_cooked) lines.push('Already one of their saved recipes')
  if (ev.most_similar_recipe) {
    lines.push(`Similar to ${ev.most_similar_recipe.title} they saved (${ev.most_similar_recipe.similarity_pct}% similar), so they might like it`)
  }
  if (ev.cuisine && ev.cuisine_matches > 0) {
    lines.push(`${ev.cuisine}: same cuisine as ${ev.cuisine_matches} of the ${ev.saved_or_cooked_total} recipes they saved or cooked`)
  }
  if (ev.taste_match_pct != null) lines.push(`${ev.taste_match_pct}% match with their overall taste`)
  return lines
}

// Remember the last search so leaving the page (e.g. to open a recipe) doesn't lose it.
interface SavedSearch {
  selected: string[]
  mealType: string | null
  result: CookTogetherResult | null
}

const storageKey = (userId: string) => `cook-together:${userId}`

function loadSaved(userId: string | undefined): SavedSearch | null {
  if (!userId) return null
  try {
    return JSON.parse(sessionStorage.getItem(storageKey(userId)) ?? 'null')
  } catch {
    return null
  }
}

function saveSearch(userId: string, search: SavedSearch | null) {
  try {
    if (search) sessionStorage.setItem(storageKey(userId), JSON.stringify(search))
    else sessionStorage.removeItem(storageKey(userId))
  } catch {
    // storage unavailable: the page still works, it just won't remember
  }
}

// Turn the backend's real result into the lines shown in the "agent log" box.
function buildLines(res: CookTogetherResult): string[] {
  const titleOf = (id: string) => res.ranking.find(r => r.recipe_id === id)?.title ?? 'a recipe'
  const lines = [`Starting Personal Agents for ${res.agents.length} ${res.agents.length === 1 ? 'person' : 'people'}...`]

  for (const agent of res.agents) {
    const best = [...agent.evaluations].sort((a, b) => b.fit_score - a.fit_score)[0]
    const blocked = agent.evaluations.filter(e => e.dealbreakers.length > 0).length
    const scored = `scored ${agent.evaluations.length} recipes`
    const fav = best ? `, favorite: ${titleOf(best.recipe_id)} (${best.fit_score}/10)` : ''
    lines.push(`${cap(agent.user_name)}'s agent: ${scored}${fav}${blocked ? `, ${blocked} with dealbreakers ⚠️` : ' ✓'}`)
  }

  lines.push(`Planner: ranked ${res.ranking.length} recipes for the group...`)
  const top = res.ranking.find(r => r.recipe_id === res.top_pick)
  if (top) lines.push(`Top pick: ${top.title} — group score ${top.group_score}/10 🎉`)
  if (res.agent_status === 'mock') lines.push('(Mock mode: Gemini is off, scores are placeholders)')
  if (res.agent_status === 'planner_fallback') lines.push('⚠️ The group planner was busy, so recipes are ranked by average score instead.')
  if (res.agent_status === 'unavailable') lines.push('⚠️ The AI is busy right now, so these are placeholder scores. Try again in a moment.')
  return lines
}

// The backend answers errors as {"detail": "..."}.
function errorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : ''
  try {
    const detail = JSON.parse(raw).detail
    if (typeof detail === 'string') return detail
  } catch {
    // not JSON
  }
  return 'Something went wrong. Please try again.'
}

export default function CookTogetherPage() {
  const navigate = useNavigate()
  const { user } = useUser()
  const [saved] = useState(() => loadSaved(user?.id))
  const [friends, setFriends] = useState<Friend[]>([])
  const [friendsLoading, setFriendsLoading] = useState(true)
  const [selected, setSelected] = useState<string[]>(saved?.selected ?? [])
  const [mealType, setMealType] = useState<string | null>(saved?.mealType ?? null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>(saved?.result ? 'done' : 'idle')
  const [result, setResult] = useState<CookTogetherResult | null>(saved?.result ?? null)
  const [lines, setLines] = useState<string[]>(() => (saved?.result ? buildLines(saved.result) : []))
  // A restored result shows immediately instead of replaying the animation.
  const [visibleLines, setVisibleLines] = useState(() => (saved?.result ? buildLines(saved.result).length : 0))
  const [error, setError] = useState('')
  const [openWhy, setOpenWhy] = useState<string | null>(null)

  // Persist the search whenever it changes.
  useEffect(() => {
    if (!user) return
    saveSearch(user.id, selected.length || mealType || result ? { selected, mealType, result } : null)
  }, [user, selected, mealType, result])

  // Only the logged-in user's own friends.
  useEffect(() => {
    if (!user) return
    listFriends(user.id)
      .then(res => setFriends(res.friends))
      .catch(() => {})
      .finally(() => setFriendsLoading(false))
  }, [user])

  // Reveal the agent log one line at a time.
  useEffect(() => {
    if (status !== 'done' || visibleLines >= lines.length) return
    const timer = setTimeout(() => setVisibleLines(v => v + 1), 600)
    return () => clearTimeout(timer)
  }, [status, visibleLines, lines])

  const toggle = (id: string) => setSelected(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  )

  async function start() {
    if (!user) return
    setStatus('loading')
    setError('')
    setResult(null)
    try {
      // You are always part of the group, plus whichever friends you picked.
      const res = await api.cookTogether([user.id, ...selected], mealType ?? undefined)
      setResult(res)
      setLines(buildLines(res))
      setVisibleLines(0)
      setStatus('done')
    } catch (err) {
      setError(errorMessage(err))
      setStatus('error')
    }
  }

  function reset() {
    setSelected([])
    setMealType(null)
    setStatus('idle')
    setResult(null)
    setLines([])
    setVisibleLines(0)
    setError('')
    setOpenWhy(null)
  }

  const disabled = selected.length === 0 || !mealType || status === 'loading'
  const done = status === 'done' && visibleLines >= lines.length

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #F6C4C3, #FAFC97)', padding: '40px 20px 90px' }}>
      <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '2.5rem', color: '#3D2B1F', margin: '0 0 4px' }}>Cook Together</h1>
      <p style={{ color: '#888', fontSize: '13px', margin: '0 0 24px' }}>Pick your crew and let AI find the perfect recipe for everyone</p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '32px' }}>
        {!friendsLoading && friends.length === 0 && (
          <span style={{ fontSize: '13px', color: '#888' }}>You don't have any friends added yet.</span>
        )}
        {friends.map(f => (
          <div key={f.id} onClick={() => toggle(f.id)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%',
              background: selected.includes(f.id) ? '#FAAED2' : '#F8DBD8',
              border: selected.includes(f.id) ? '2px solid #e8a0c0' : '2px solid transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '26px', transition: 'all 0.15s',
            }}>
              {f.emoji}
            </div>
            <span style={{ fontSize: '11px', color: '#3D2B1F', fontWeight: selected.includes(f.id) ? 700 : 400 }}>{f.name}</span>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '24px' }}>
        <p style={{ fontSize: '13px', fontWeight: 700, color: '#3D2B1F', margin: '0 0 10px' }}>What are you feeling?</p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          {[{ label: '🧂 Savory', value: 'savory' }, { label: '🍰 Sweet', value: 'sweet' }].map(opt => (
            <button key={opt.value} onClick={() => setMealType(opt.value)}
              style={{
                borderRadius: '20px', padding: '10px 24px', cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.08)', border: '1px solid',
                background: mealType === opt.value ? '#FAAED2' : '#fff',
                borderColor: mealType === opt.value ? '#e8a0c0' : '#d1d5db',
                color: mealType === opt.value ? '#3D2B1F' : '#555',
                fontWeight: mealType === opt.value ? 700 : 400,
                fontSize: '14px',
              }}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={start}
        disabled={disabled}
        style={{
          width: '100%', padding: '14px',
          background: disabled ? '#ddd' : '#F8CE5B',
          color: disabled ? '#aaa' : '#3D2B1F',
          border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '16px',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        {status === 'loading' ? 'Planning…' : 'Find Recipes'}
      </button>

      {(status === 'done' || status === 'error' || selected.length > 0 || mealType) && status !== 'loading' && (
        <button
          onClick={reset}
          style={{ width: '100%', marginTop: '10px', padding: '10px', background: 'transparent', color: '#3D2B1F', border: '1px solid #3D2B1F55', borderRadius: '12px', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}
        >
          Start over
        </button>
      )}

      {status === 'error' && (
        <p role="alert" style={{ marginTop: '16px', color: '#b91c1c', fontSize: '14px' }}>{error}</p>
      )}

      {(status === 'loading' || status === 'done') && (
        <div style={{ marginTop: '24px', background: '#1a1a2e', borderRadius: '12px', padding: '20px', fontFamily: 'monospace', fontSize: '13px' }}>
          {status === 'loading' && (
            <div style={{ color: '#4ade80', lineHeight: '1.8' }}>Starting Personal Agents for each friend...</div>
          )}
          {lines.slice(0, visibleLines).map((line, i) => (
            <div key={i} style={{ color: '#4ade80', lineHeight: '1.8' }}>{line}</div>
          ))}
          {!done && <span style={{ color: '#4ade80' }}>▊</span>}
        </div>
      )}

      {done && result && (
        <div style={{ marginTop: '32px' }}>
          <p style={{ fontWeight: 700, color: '#3D2B1F', marginBottom: '12px' }}>Recipes for your group:</p>
          {result.ranking.map(r => (
            <div key={r.recipe_id} onClick={() => navigate(`/recipe/${r.recipe_id}`)}
              style={{ background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '12px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                <p style={{ fontWeight: 700, color: '#3D2B1F', margin: 0 }}>
                  {r.recipe_id === result.top_pick && '⭐ '}{r.title}
                </p>
                <span style={{ fontSize: '12px', color: '#888', flexShrink: 0 }}>{r.group_score}/10</span>
              </div>
              {r.why[0] && <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#888' }}>{r.why[0]}</p>}
              <button
                onClick={e => { e.stopPropagation(); setOpenWhy(openWhy === r.recipe_id ? null : r.recipe_id) }}
                style={{ marginTop: '8px', padding: 0, background: 'none', border: 'none', color: '#d4689a', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                {openWhy === r.recipe_id ? 'Hide details' : 'Why?'}
              </button>

              {openWhy === r.recipe_id && (
                <div onClick={e => e.stopPropagation()} style={{ marginTop: '8px', fontSize: '12px', color: '#555', lineHeight: 1.5, cursor: 'default' }}>
                  {r.why.length > 1 && <p style={{ margin: '0 0 6px' }}>{r.why.join(' ')}</p>}
                  {r.conflicts.length > 0 && <p style={{ margin: '0 0 6px', color: '#b45309' }}>⚠️ {r.conflicts.join(' ')}</p>}
                  {result.agents.map(a => {
                    const ev = a.evaluations.find(e => e.recipe_id === r.recipe_id)
                    if (!ev) return null
                    return (
                      <div key={a.user_id} style={{ marginTop: '6px' }}>
                        <strong>{cap(a.user_name)}</strong> — {ev.fit_score}/10
                        {ev.dealbreakers.length > 0 && <div style={{ color: '#b91c1c' }}>⚠️ Dealbreaker: {ev.dealbreakers.join(', ')}</div>}
                        {evidenceLines(a.evidence[r.recipe_id]).map((line, i) => <div key={'e' + i}>• {line}</div>)}
                        {ev.reasons.map((reason, i) => <div key={i} style={{ color: '#888' }}>“{reason}”</div>)}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  )
}
