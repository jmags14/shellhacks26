import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import { useUser } from '../lib/auth'
import { api, type RecommendationsResult } from '../lib/api'

// Off by default: the Personal Agent spends a Gemini request on every page load.
// Set VITE_RECOMMENDATIONS_USE_AGENT=true in the root .env to get agent-written reasons.
const USE_AGENT = import.meta.env.VITE_RECOMMENDATIONS_USE_AGENT === 'true'

const EMPTY_MESSAGES: Record<string, string> = {
  cold_start: 'Save or cook a few recipes and we’ll learn your taste.',
  no_eligible_candidates: 'Nothing fits your dietary needs and allergies right now. Try adding more recipes.',
  limited_candidates: 'No recommendations yet.',
  ok: 'No recommendations yet.',
}

function errorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : ''
  try {
    const detail = JSON.parse(raw).detail
    if (typeof detail === 'string') return detail
  } catch {
    // not JSON
  }
  return 'Could not load recommendations.'
}

export default function RecommendedPage() {
  const navigate = useNavigate()
  const { user } = useUser()
  const [data, setData] = useState<RecommendationsResult | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  // Everything shown since the last "start over", so a reroll doesn't repeat it.
  const [seen, setSeen] = useState<string[]>([])
  const [restarted, setRestarted] = useState(false)

  async function load(exclude: string[]) {
    if (!user) return
    setLoading(true)
    setError('')
    setRestarted(false)
    try {
      let res = await api.getRecommendations(user.id, USE_AGENT, exclude)
      let nowSeen = exclude
      // Nothing left that we haven't shown: start the cycle over.
      if (res.recommendations.length === 0 && exclude.length > 0) {
        res = await api.getRecommendations(user.id, USE_AGENT)
        nowSeen = []
        setRestarted(res.recommendations.length > 0)
      }
      setData(res)
      setSeen([...nowSeen, ...res.recommendations.map(r => r.recipe_id)])
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #F6C4C3, #FAFC97)', padding: '40px 20px 90px' }}>
      <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '2.5rem', color: '#3D2B1F', margin: '0 0 4px' }}>For You</h1>
      <p style={{ color: '#888', fontSize: '13px', margin: '0 0 24px' }}>Based on your taste and preferences</p>

      {loading && <p style={{ color: '#888', fontSize: '14px' }}>Finding your picks…</p>}

      {restarted && !loading && (
        <p style={{ color: '#888', fontSize: '12px' }}>You’ve seen everything for now — starting over.</p>
      )}

      {error && <p role="alert" style={{ color: '#b91c1c', fontSize: '14px' }}>{error}</p>}

      {!loading && data && data.recommendations.length === 0 && (
        <div style={{ background: 'white', borderRadius: '16px', padding: '24px', textAlign: 'center', color: '#888', fontSize: '14px' }}>
          {EMPTY_MESSAGES[data.status] ?? EMPTY_MESSAGES.ok}
        </div>
      )}

      {!loading && data?.recommendations.map(r => (
        <div key={r.recipe_id} onClick={() => navigate(`/recipe/${r.recipe_id}`)}
          style={{ background: 'white', borderRadius: '16px', padding: '16px', marginBottom: '12px', cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <span style={{ fontWeight: 700, color: '#3D2B1F', fontSize: '15px' }}>{r.title}</span>
            <span style={{ background: '#86efac', color: '#166534', fontSize: '12px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', flexShrink: 0 }}>
              {r.match_score}% match
            </span>
          </div>
          <p style={{ margin: '0 0 8px', color: '#777', fontSize: '13px', lineHeight: 1.5 }}>{r.reason}</p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '11px', color: '#888' }}>
            <span style={{ background: r.discovery ? '#fdf2f8' : '#f3f4f6', padding: '2px 8px', borderRadius: '12px' }}>
              {r.discovery ? '✨ New for you' : '❤️ From your recipes'}
            </span>
            {r.cuisine && <span style={{ background: '#f3f4f6', padding: '2px 8px', borderRadius: '12px' }}>🍽 {r.cuisine}</span>}
            {r.time_minutes && <span style={{ background: '#f3f4f6', padding: '2px 8px', borderRadius: '12px' }}>⏱ {r.time_minutes} min</span>}
            <span style={{ background: '#f3f4f6', padding: '2px 8px', borderRadius: '12px' }}>🥕 {r.ingredient_count} ingredients</span>
          </div>
        </div>
      ))}

      {!loading && data && (
        <button
          onClick={() => load(seen)}
          style={{ width: '100%', marginTop: '4px', padding: '12px', background: '#F8CE5B', color: '#3D2B1F', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}
        >
          🔄 Reroll
        </button>
      )}

      {data?.agent_status === 'unavailable' && (
        <p style={{ color: '#888', fontSize: '12px' }}>AI explanations are unavailable right now, showing standard reasons.</p>
      )}

      <BottomNav />
    </div>
  )
}
