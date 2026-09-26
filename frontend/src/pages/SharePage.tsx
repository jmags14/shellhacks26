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
    <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '1.5rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        <button onClick={() => navigate('/')} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '0.9rem', padding: 0 }}>
          ← Back
        </button>

        <div>
          <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.5rem', fontWeight: '700' }}>Add a recipe</h1>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '0.95rem' }}>Paste an Instagram or TikTok link and we'll extract the ingredients and steps with AI.</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input
            type="url"
            required
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://instagram.com/reel/…"
            style={{ width: '100%', padding: '0.75rem 1rem', boxSizing: 'border-box', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.95rem', outline: 'none', background: '#fff' }}
          />
          <button
            type="submit"
            style={{ padding: '0.75rem', background: '#2F6B4F', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.95rem', fontWeight: '600', cursor: 'pointer' }}
          >
            Save recipe
          </button>
        </form>
      </div>
    </div>
  )
}
