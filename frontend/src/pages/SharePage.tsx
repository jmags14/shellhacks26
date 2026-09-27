import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../lib/auth'
import { startImport } from '../lib/importQueue'

// Instagram/TikTok usually put the link inside the shared text
// ("Check this out https://…") rather than in the `url` field.
function findUrl(text: string | null): string | null {
  const match = text?.match(/https?:\/\/[^\s]+/)
  return match ? match[0].replace(/[.,;:!?)\]]+$/, '') : null
}

export default function SharePage() {
  const navigate = useNavigate()
  const { user } = useUser()
  const [url, setUrl] = useState('')

  const params = new URLSearchParams(window.location.search)
  const shared =
    findUrl(params.get('url')) ?? findUrl(params.get('text')) ?? findUrl(params.get('title'))

  // Opened from the Android share sheet: start the import in the background
  // and go straight home, where the recipe appears when it's ready.
  useEffect(() => {
    if (!user || !shared) return
    startImport(shared, user.id)
    navigate('/', { replace: true })
  }, [user, shared, navigate])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    startImport(url.trim(), user.id)
    navigate('/', { replace: true })
  }

  // Auto-import path: nothing to show, we're about to redirect.
  if (shared) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', color: '#6b7280' }}>
        Saving your recipe…
      </div>
    )
  }

  // Fallback: opened /share without a link (e.g. from the "+ Add" button).
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #F6C4C3 0%, #FAFC97 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif',
      padding: '24px'
    }}>
      <div style={{
        width: '100%', maxWidth: 480,
        background: '#fff', borderRadius: 24,
        padding: '36px 32px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
        display: 'flex', flexDirection: 'column', gap: '1.5rem'
      }}>
        <button onClick={() => navigate('/')} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '0.9rem', padding: 0 }}>
          ← Back
        </button>

        <div>
          <h1 style={{ margin: '0 0 8px', fontFamily: 'Bebas Neue, sans-serif', fontSize: 36, fontWeight: 400, color: '#3d1c02', letterSpacing: 1 }}>
            Add a recipe
          </h1>
          <p style={{ margin: 0, color: '#888', fontSize: '0.95rem' }}>
            Paste a reel link and we'll extract the ingredients and steps.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input
            type="url"
            required
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://instagram.com/reel/…"
            style={{
              width: '100%', padding: '14px 20px', boxSizing: 'border-box',
              border: 'none', borderRadius: 50,
              background: '#FFFFE0', fontSize: '0.95rem', outline: 'none',
              fontFamily: 'inherit', color: '#3d1c02'
            }}
          />
          <button
            type="submit"
            style={{
              width: '100%', padding: '14px',
              background: '#FAAED2', color: '#3d1c02',
              border: 'none', borderRadius: 50,
              fontSize: '1rem', fontWeight: 700,
              fontFamily: 'inherit', cursor: 'pointer'
            }}
          >
            Save recipe
          </button>
        </form>
      </div>
    </div>
  )
}
