import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MOCK_RECIPES, MOCK_FRIENDS } from '../lib/mockData'

const PLATFORM_ICON: Record<string, string> = {
  tiktok: '🎵',
  instagram: '📸',
}

export default function RecipeDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const recipe = MOCK_RECIPES.find(r => r.id === id) ?? MOCK_RECIPES[0]

  const [tab, setTab] = useState<'ingredients' | 'steps'>('ingredients')
  const [cookTogether, setCookTogether] = useState(false)
  const [selectedFriends, setSelectedFriends] = useState<string[]>([])
  const [agentRunning, setAgentRunning] = useState(false)
  const [agentLogs, setAgentLogs] = useState<string[]>([])

  const haveCount = recipe.ingredients.filter(i => i.have).length
  const totalCount = recipe.ingredients.length

  function toggleFriend(name: string) {
    setSelectedFriends(prev =>
      prev.includes(name) ? prev.filter(f => f !== name) : [...prev, name]
    )
  }

  async function startCookTogether() {
    setAgentRunning(true)
    setAgentLogs([])

    // Stub streaming events (TODO: replace with real SSE from POST /cook-together)
    const events = [
      '🤖 Starting Personal Agents for each friend…',
      `✅ Rachel's agent: no allergy conflicts found`,
      `✅ Sarah's agent: no cilantro in this recipe`,
      `✅ Maya's agent: checking gluten — tortillas ⚠️ (can swap to corn)`,
      '🧠 Planner: scoring recipe for the group…',
      '📊 Group score: 87/100 — great match!',
      '🛒 Shopping list: corn tortillas, Oaxacan cheese, limes',
      '💰 Cost split: ~$3.17 per person',
      '✅ Done! Everyone can eat this.',
    ]

    for (const event of events) {
      await new Promise(r => setTimeout(r, 600))
      setAgentLogs(prev => [...prev, event])
    }
    setAgentRunning(false)
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#16171d] pb-24">
      {/* Hero */}
      <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-[#aa3bff]/30 to-[#aa3bff]/5 flex items-center justify-center">
        <span className="text-7xl">{recipe.saved_by_avatar}</span>

        <button
          onClick={() => navigate(-1)}
          className="absolute top-10 left-4 w-9 h-9 rounded-full bg-white/80 dark:bg-black/40 backdrop-blur-sm flex items-center justify-center text-sm shadow"
        >
          ←
        </button>

        <a
          href={recipe.source_url}
          target="_blank"
          rel="noreferrer"
          className="absolute top-10 right-4 flex items-center gap-1.5 bg-white/80 dark:bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs font-medium shadow"
        >
          {PLATFORM_ICON[recipe.platform]}
          <span className="text-[#08060d] dark:text-white">View original</span>
        </a>
      </div>

      <div className="px-4 pt-5">
        {/* Title row */}
        <div className="flex items-start justify-between gap-3 mb-1">
          <h1 className="text-2xl font-bold text-[#08060d] dark:text-white leading-tight">
            {recipe.title}
          </h1>
          <span className="shrink-0 text-sm font-medium text-[#aa3bff] dark:text-[#c084fc] mt-1">
            ⏱ {recipe.time_minutes}m
          </span>
        </div>
        <p className="text-sm text-[#6b6375] mb-4">
          Saved by {recipe.saved_by} · serves {recipe.serves}
        </p>

        {/* Ingredient progress */}
        <div className="bg-[#f9f8ff] dark:bg-[#1f2028] rounded-2xl p-4 mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-[#08060d] dark:text-white">
              You have {haveCount}/{totalCount} ingredients
            </span>
            <span className="text-sm font-medium text-[#aa3bff] dark:text-[#c084fc]">
              ${recipe.cost_to_finish.toFixed(2)} to finish
            </span>
          </div>
          <div className="h-2 rounded-full bg-[#e5e4e7] dark:bg-[#2e303a] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#aa3bff]"
              style={{ width: `${(haveCount / totalCount) * 100}%` }}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl overflow-hidden border border-[#e5e4e7] dark:border-[#2e303a] mb-4">
          {(['ingredients', 'steps'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors capitalize ${
                tab === t
                  ? 'bg-[#aa3bff] text-white'
                  : 'bg-white dark:bg-[#1f2028] text-[#6b6375]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'ingredients' ? (
          <ul className="space-y-2 mb-6">
            {recipe.ingredients.map(ing => (
              <li
                key={ing.name}
                className="flex items-center gap-3 py-2.5 border-b border-[#e5e4e7] dark:border-[#2e303a] last:border-0"
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 ${
                    ing.have
                      ? 'bg-[#aa3bff]/20 text-[#aa3bff]'
                      : 'bg-[#e5e4e7] dark:bg-[#2e303a] text-[#6b6375]'
                  }`}
                >
                  {ing.have ? '✓' : '·'}
                </span>
                <span
                  className={`text-sm ${
                    ing.have
                      ? 'text-[#08060d] dark:text-white'
                      : 'text-[#6b6375]'
                  }`}
                >
                  {ing.name}
                </span>
                {!ing.have && (
                  <span className="ml-auto text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full px-2 py-0.5">
                    need this
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <ol className="space-y-3 mb-6">
            {recipe.steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-[#aa3bff]/10 text-[#aa3bff] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-[#6b6375] dark:text-gray-300 leading-relaxed">
                  {step}
                </p>
              </li>
            ))}
          </ol>
        )}

        {/* Cook Together section */}
        <div className="rounded-2xl border border-[#aa3bff]/30 bg-[#aa3bff]/5 dark:bg-[#aa3bff]/10 p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-[#08060d] dark:text-white">
              🍳 Cook Together
            </h2>
            <button
              onClick={() => setCookTogether(!cookTogether)}
              className="text-xs text-[#aa3bff] dark:text-[#c084fc] font-medium"
            >
              {cookTogether ? 'Cancel' : 'Plan dinner'}
            </button>
          </div>

          {!cookTogether ? (
            <p className="text-sm text-[#6b6375]">
              Invite friends and let AI check allergies, pantries, and split the cost.
            </p>
          ) : (
            <div>
              <p className="text-xs text-[#6b6375] mb-3">Who's joining tonight?</p>
              <div className="flex gap-2 mb-4">
                {MOCK_FRIENDS.map(f => (
                  <button
                    key={f.name}
                    onClick={() => toggleFriend(f.name)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-colors ${
                      selectedFriends.includes(f.name)
                        ? 'border-[#aa3bff] bg-[#aa3bff]/10'
                        : 'border-[#e5e4e7] dark:border-[#2e303a] bg-white dark:bg-[#1f2028]'
                    }`}
                  >
                    <span className="text-xl">{f.avatar}</span>
                    <span className="text-xs text-[#6b6375]">{f.name}</span>
                  </button>
                ))}
              </div>

              {!agentRunning && agentLogs.length === 0 && (
                <button
                  onClick={startCookTogether}
                  disabled={selectedFriends.length === 0}
                  className="w-full py-3 rounded-xl bg-[#aa3bff] disabled:opacity-40 text-white font-semibold text-sm active:scale-[0.98] transition-transform"
                >
                  Start AI planning →
                </button>
              )}

              {(agentRunning || agentLogs.length > 0) && (
                <div className="mt-3 rounded-xl bg-[#08060d] dark:bg-black p-3 font-mono text-xs space-y-1.5">
                  {agentLogs.map((log, i) => (
                    <div key={i} className="text-green-400 leading-relaxed">
                      {log}
                    </div>
                  ))}
                  {agentRunning && (
                    <div className="text-[#aa3bff] animate-pulse">▊</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
