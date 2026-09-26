import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export default function SharePage() {
  const navigate = useNavigate()
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [saveState, setSaveState] = useState<SaveState>('idle')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setUrl(params.get('url') ?? '')
    const t = params.get('title') ?? params.get('text') ?? ''
    setTitle(t.split('\n')[0])
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaveState('saving')
    // TODO: POST /import or supabase insert
    await new Promise(r => setTimeout(r, 800))
    setSaveState('saved')
  }

  const inputStyle = {
    width: '100%', padding: '0.75rem 1rem', boxSizing: 'border-box' as const,
    border: '1px solid #d1d5db', borderRadius: '8px',
    fontSize: '0.95rem', outline: 'none', background: '#fff',
  }

  if (saveState === 'saved') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
        <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.5rem', fontWeight: '700' }}>Recipe saved!</h1>
        <p style={{ margin: '0 0 2rem', color: '#6b7280' }}>We're extracting ingredients and steps in the background.</p>
        <button onClick={() => navigate('/')} style={{ padding: '0.75rem 1.5rem', background: '#2F6B4F', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.95rem', fontWeight: '600', cursor: 'pointer' }}>
          Back to recipes
        </button>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '1.5rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        <button onClick={() => navigate('/')} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '0.9rem', padding: 0 }}>
          ← Back
        </button>

        <div>
          <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.5rem', fontWeight: '700' }}>Save this recipe?</h1>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '0.95rem' }}>We'll extract ingredients and steps with AI.</p>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '500', color: '#374151' }}>Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Recipe name" style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '500', color: '#374151' }}>URL</label>
            <input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://tiktok.com/..." style={inputStyle} />
          </div>
          <button
            type="submit"
            disabled={saveState === 'saving' || (!url && !title)}
            style={{ padding: '0.75rem', background: '#2F6B4F', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.95rem', fontWeight: '600', cursor: 'pointer', opacity: (!url && !title) ? 0.5 : 1 }}
          >
            {saveState === 'saving' ? 'Saving…' : 'Save recipe'}
          </button>
        </form>

        {saveState === 'error' && <p role="alert" style={{ color: '#ef4444', margin: 0 }}>Something went wrong. Try again.</p>}
      </div>
    </div>
  )
}
