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

  if (saveState === 'saved') {
    return (
      <div>
        <h1>Recipe saved!</h1>
        <p>We're extracting the ingredients and steps in the background.</p>
        <button onClick={() => navigate('/')}>Back to recipes</button>
      </div>
    )
  }

  return (
    <div>
      <button onClick={() => navigate('/')}>← Back</button>

      <h1>Save this recipe?</h1>
      <p>We'll extract ingredients and steps with AI.</p>

      <form onSubmit={handleSave}>
        <div>
          <label htmlFor="recipe-title">Title</label>
          <input
            id="recipe-title"
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Recipe name"
          />
        </div>
        <div>
          <label htmlFor="recipe-url">URL</label>
          <input
            id="recipe-url"
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://tiktok.com/..."
          />
        </div>
        <button type="submit" disabled={saveState === 'saving' || (!url && !title)}>
          {saveState === 'saving' ? 'Saving…' : 'Save recipe'}
        </button>
      </form>

      {saveState === 'error' && <p role="alert">Something went wrong. Try again.</p>}
    </div>
  )
}
