import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export default function SharePage() {
  const navigate = useNavigate()
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [_text, setText] = useState('')
  const [saveState, setSaveState] = useState<SaveState>('idle')

  useEffect(() => {
    // Web Share Target API passes params as query string
    const params = new URLSearchParams(window.location.search)
    const sharedUrl = params.get('url') ?? ''
    const sharedTitle = params.get('title') ?? ''
    const sharedText = params.get('text') ?? ''

    setUrl(sharedUrl)
    setTitle(sharedTitle || sharedText.split('\n')[0] || 'Untitled Recipe')
    setText(sharedText)
  }, [])

  function getPlatform(u: string) {
    if (u.includes('tiktok')) return { name: 'TikTok', icon: '🎵' }
    if (u.includes('instagram')) return { name: 'Instagram', icon: '📸' }
    if (u.includes('youtube')) return { name: 'YouTube', icon: '▶️' }
    return { name: 'Web', icon: '🔗' }
  }

  const platform = getPlatform(url)

  async function handleSave() {
    setSaveState('saving')
    // TODO: call POST /import or supabase insert
    await new Promise(r => setTimeout(r, 1200)) // stub delay
    setSaveState('saved')
  }

  if (saveState === 'saved') {
    return (
      <div className="min-h-screen bg-white dark:bg-[#16171d] flex flex-col items-center justify-center px-6 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-[#08060d] dark:text-white mb-2">
          Recipe saved!
        </h2>
        <p className="text-sm text-[#6b6375] mb-8 max-w-xs">
          We're extracting the ingredients and steps in the background.
        </p>
        <button
          onClick={() => navigate('/')}
          className="w-full max-w-xs py-3 rounded-xl bg-[#aa3bff] text-white font-medium text-sm"
        >
          Back to my recipes
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#16171d] px-6 py-12">
      {/* Back */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-1.5 text-sm text-[#6b6375] mb-8"
      >
        ← Back
      </button>

      <div className="flex items-center gap-2 mb-1">
        <span className="text-2xl">{platform.icon}</span>
        <span className="text-sm text-[#6b6375]">{platform.name}</span>
      </div>
      <h1 className="text-2xl font-bold text-[#08060d] dark:text-white mb-1">
        Save this recipe?
      </h1>
      <p className="text-sm text-[#6b6375] mb-6">
        We'll extract ingredients and steps with AI.
      </p>

      {/* Card preview */}
      <div className="rounded-2xl border border-[#e5e4e7] dark:border-[#2e303a] bg-[#f9f8ff] dark:bg-[#1f2028] p-4 mb-6">
        {/* Thumbnail placeholder */}
        <div className="w-full aspect-video rounded-xl bg-gradient-to-br from-[#aa3bff]/20 to-[#aa3bff]/5 flex items-center justify-center mb-3">
          <span className="text-4xl">{platform.icon}</span>
        </div>

        <div className="space-y-2">
          <div>
            <label className="text-xs text-[#6b6375] uppercase tracking-wide">
              Title
            </label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full mt-1 py-2 px-3 rounded-lg border border-[#e5e4e7] dark:border-[#2e303a] bg-white dark:bg-[#16171d] text-sm text-[#08060d] dark:text-white focus:outline-none focus:border-[#aa3bff]"
            />
          </div>

          {url && (
            <div>
              <label className="text-xs text-[#6b6375] uppercase tracking-wide">
                URL
              </label>
              <p className="mt-1 text-xs text-[#6b6375] break-all truncate">
                {url}
              </p>
            </div>
          )}

          {!url && !title && (
            <div>
              <label className="text-xs text-[#6b6375] uppercase tracking-wide">
                Paste a link
              </label>
              <input
                type="url"
                placeholder="https://tiktok.com/..."
                value={url}
                onChange={e => setUrl(e.target.value)}
                className="w-full mt-1 py-2 px-3 rounded-lg border border-[#e5e4e7] dark:border-[#2e303a] bg-white dark:bg-[#16171d] text-sm text-[#08060d] dark:text-white focus:outline-none focus:border-[#aa3bff]"
              />
            </div>
          )}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saveState === 'saving' || (!url && !title)}
        className="w-full py-3.5 rounded-xl bg-[#aa3bff] disabled:opacity-50 text-white font-semibold text-base active:scale-[0.98] transition-transform"
      >
        {saveState === 'saving' ? '✨ Extracting recipe…' : '💾 Save recipe'}
      </button>

      {saveState === 'error' && (
        <p className="text-sm text-red-500 text-center mt-3">
          Something went wrong. Try again.
        </p>
      )}
    </div>
  )
}
