import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav'

const MOCK_FRIENDS = [
  { id: 'f1', name: 'Maya', emoji: '🐱' },
  { id: 'f2', name: 'Jordan', emoji: '🐼' },
  { id: 'f3', name: 'Priya', emoji: '🦊' },
  { id: 'f4', name: 'Carlos', emoji: '🐨' },
  { id: 'f5', name: 'Lily', emoji: '🐰' },
]

const AGENT_LINES = [
  'Starting Personal Agents for each friend...',
  "Maya's agent: no allergy conflicts found ✓",
  "Jordan's agent: checking pantry items...",
  "Priya's agent: no cilantro in this recipe ✓",
  "Carlos's agent: scoring recipe for the group...",
  'Group score: 92/100 — great match! 🎉',
  'Cost split: ~$3.50 per person',
  'Done! Everyone can eat this. ✓',
]

const RESULT_RECIPES = [
  { id: '1', title: 'Spicy Tteokbokki' },
  { id: '2', title: 'Mango Sticky Rice' },
  { id: '3', title: 'Birria Tacos' },
]

export default function CookTogetherPage() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState<string[]>([])
  const [mealType, setMealType] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [visibleLines, setVisibleLines] = useState(0)

  const toggle = (id: string) => setSelected(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  )

  const start = () => {
    setRunning(true)
    setVisibleLines(0)
  }

  useEffect(() => {
    if (!running || visibleLines >= AGENT_LINES.length) return
    const timer = setInterval(() => {
      setVisibleLines(prev => {
        if (prev + 1 >= AGENT_LINES.length) clearInterval(timer)
        return prev + 1
      })
    }, 600)
    return () => clearInterval(timer)
  }, [running])

  const done = visibleLines >= AGENT_LINES.length

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #F6C4C3, #FAFC97)', padding: '40px 20px 90px' }}>
      <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '2.5rem', color: '#3D2B1F', margin: '0 0 4px' }}>Cook Together</h1>
      <p style={{ color: '#888', fontSize: '13px', margin: '0 0 24px' }}>Pick your crew and let AI find the perfect recipe for everyone</p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '32px' }}>
        {MOCK_FRIENDS.map(f => (
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
        disabled={selected.length === 0 || !mealType || running}
        style={{
          width: '100%', padding: '14px',
          background: selected.length === 0 || !mealType || running ? '#ddd' : '#F8CE5B',
          color: selected.length === 0 || !mealType || running ? '#aaa' : '#3D2B1F',
          border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '16px',
          cursor: selected.length === 0 || !mealType || running ? 'not-allowed' : 'pointer',
        }}
      >
        Find Recipes
      </button>

      {running && (
        <div style={{ marginTop: '24px', background: '#1a1a2e', borderRadius: '12px', padding: '20px', fontFamily: 'monospace', fontSize: '13px' }}>
          {AGENT_LINES.slice(0, visibleLines).map((line, i) => (
            <div key={i} style={{ color: '#4ade80', lineHeight: '1.8' }}>{line}</div>
          ))}
          {!done && <span style={{ color: '#4ade80' }}>▊</span>}
        </div>
      )}

      {done && (
        <div style={{ marginTop: '32px' }}>
          <p style={{ fontWeight: 700, color: '#3D2B1F', marginBottom: '12px' }}>Recipes for your group:</p>
          {RESULT_RECIPES.map(r => (
            <div key={r.id} onClick={() => navigate(`/recipe/${r.id}`)}
              style={{ background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '12px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              <p style={{ fontWeight: 700, color: '#3D2B1F', margin: 0 }}>{r.title}</p>
            </div>
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  )
}
