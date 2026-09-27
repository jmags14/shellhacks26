import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useUser } from '../lib/auth'
import { api, getRecipe, type RecipeDetail } from '../lib/api'

const RATING_VALUES: Record<string, 1 | 3 | 5> = {
  'I love it': 5,
  'Like it': 3,
  'Hate it': 1,
}

export default function RecipeDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useUser()
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null)
  const [loadError, setLoadError] = useState('')

  const [tab, setTab] = useState<'ingredients' | 'steps'>('ingredients')
  const [rating, setRating] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)

  useEffect(() => {
    if (!user || !id) return
    getRecipe(id, user.id)
      .then(res => {
        if (res) setRecipe(res)
        else setLoadError('Recipe not found.')
      })
      .catch(() => setLoadError('Could not load recipe.'))
  }, [user, id])

  const handleNarrate = async () => {
    if (isPlaying && audio) {
      audio.pause()
      setIsPlaying(false)
      return
    }
    if (audio) {
      audio.play()
      setIsPlaying(true)
      return
    }
    const userId = user?.id ?? ''
    const response = await fetch(`/api/recipes/${id}/narrate?user_id=${userId}`)
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const newAudio = new Audio(url)
    newAudio.onended = () => setIsPlaying(false)
    newAudio.playbackRate = speed
    setAudio(newAudio)
    newAudio.play()
    setIsPlaying(true)
  }

  useEffect(() => {
    if (audio) audio.playbackRate = speed
  }, [speed, audio])

  async function handleSave() {
    if (!user || !id) return
    setSaveState('saving')
    try {
      await api.saveRecipe(id, user.id)
      if (rating) await api.rateRecipe(id, user.id, RATING_VALUES[rating])
      setSaveState('saved')
    } catch {
      setSaveState('error')
    }
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
          <>
          <button onClick={handleNarrate}
            style={{ width: '100%', padding: '14px', background: '#F8CE5B', color: '#3D2B1F', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '16px', cursor: 'pointer', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            {isPlaying ? '⏸ Pause' : '▶ Play Instructions'}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <span style={{ fontSize: '20px' }}>🐢</span>
            <input type="range" min="0.5" max="2" step="0.25" value={speed}
              onChange={e => setSpeed(parseFloat(e.target.value))}
              style={{ flex: 1, accentColor: '#F8CE5B' }} />
            <span style={{ fontSize: '20px' }}>🐇</span>
          </div>
          <ol style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {recipe.steps?.map((step, i) => (
              <li key={i} style={{ fontSize: '0.9rem', color: '#374151', lineHeight: '1.5' }}>{step}</li>
            ))}
          </ol>
          </>
        )}

        {/* Rating */}
        <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#6b7280' }}>Rate this recipe</span>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {[['😍', 'I love it'], ['👍', 'Like it'], ['👎', 'Hate it']].map(([emoji, label]) => (
              <button
                key={label}
                onClick={() => { setRating(label); setSaveState('idle') }}
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
            onClick={handleSave}
            disabled={saveState === 'saving'}
            style={{ width: '100%', padding: '0.7rem', background: '#F8CE5B', color: '#3D2B1F', border: 'none', borderRadius: '12px', fontSize: '0.9rem', fontWeight: '700', cursor: saveState === 'saving' ? 'default' : 'pointer', opacity: saveState === 'saving' ? 0.7 : 1 }}
          >
            {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved ✓' : 'Save'}
          </button>
          {saveState === 'error' && (
            <p role="alert" style={{ margin: 0, color: '#ef4444', fontSize: '0.8rem' }}>Couldn't save. Try again.</p>
          )}
        </section>

      </div>
    </div>
  )
}
