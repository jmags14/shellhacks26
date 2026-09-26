import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MOCK_RECIPES, MOCK_FRIENDS } from '../lib/mockData'

const PLATFORM_ICON: Record<string, string> = {
  tiktok: '🎵',
  instagram: '📸',
}

export default function HomePage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  const filtered = MOCK_RECIPES.filter(r =>
    query.length < 2 ||
    r.title.toLowerCase().includes(query.toLowerCase()) ||
    r.tags.some(t => t.includes(query.toLowerCase()))
  )

  return (
    <div className="min-h-screen bg-[#f9f8ff] dark:bg-[#16171d] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white dark:bg-[#16171d] border-b border-[#e5e4e7] dark:border-[#2e303a] px-4 pt-10 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-[#08060d] dark:text-white tracking-tight">
              Doomscroll &amp; Dine 🍜
            </h1>
            <p className="text-xs text-[#6b6375]">What are we making tonight?</p>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="w-9 h-9 rounded-full bg-[#aa3bff] text-white text-sm font-bold flex items-center justify-center"
          >
            R
          </button>
        </div>

        {/* Intent / search bar */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b6375]">🔍</span>
          <input
            type="text"
            placeholder="tacos, pasta, something quick…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full py-2.5 pl-9 pr-4 rounded-xl bg-[#f4f3ec] dark:bg-[#1f2028] text-sm text-[#08060d] dark:text-white placeholder:text-[#6b6375] focus:outline-none focus:ring-2 focus:ring-[#aa3bff]/40"
          />
        </div>
      </header>

      <div className="px-4 pt-5 space-y-6">
        {/* Friends online */}
        <section>
          <h2 className="text-sm font-semibold text-[#6b6375] uppercase tracking-wide mb-3">
            Friends
          </h2>
          <div className="flex gap-3">
            {MOCK_FRIENDS.map(f => (
              <div key={f.name} className="flex flex-col items-center gap-1">
                <div className="w-12 h-12 rounded-full bg-[#aa3bff]/10 dark:bg-[#aa3bff]/20 flex items-center justify-center text-2xl border-2 border-[#aa3bff]/30">
                  {f.avatar}
                </div>
                <span className="text-xs text-[#6b6375]">{f.name}</span>
              </div>
            ))}
            <div className="flex flex-col items-center gap-1">
              <div className="w-12 h-12 rounded-full bg-[#f4f3ec] dark:bg-[#1f2028] flex items-center justify-center text-xl border-2 border-dashed border-[#e5e4e7] dark:border-[#2e303a]">
                +
              </div>
              <span className="text-xs text-[#6b6375]">Invite</span>
            </div>
          </div>
        </section>

        {/* Recipe cards */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#6b6375] uppercase tracking-wide">
              {query ? `Results for "${query}"` : 'Saved Recipes'}
            </h2>
            <button
              onClick={() => navigate('/share')}
              className="flex items-center gap-1.5 text-xs font-medium text-[#aa3bff] dark:text-[#c084fc]"
            >
              <span className="text-base leading-none">+</span> Add
            </button>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12 text-[#6b6375]">
              <div className="text-3xl mb-2">🍽️</div>
              <p className="text-sm">No recipes match that. Try something else!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(recipe => {
                const haveCount = recipe.ingredients.filter(i => i.have).length
                const totalCount = recipe.ingredients.length
                const pct = Math.round((haveCount / totalCount) * 100)

                return (
                  <button
                    key={recipe.id}
                    onClick={() => navigate(`/recipe/${recipe.id}`)}
                    className="w-full text-left bg-white dark:bg-[#1f2028] rounded-2xl p-4 shadow-sm border border-[#e5e4e7] dark:border-[#2e303a] active:scale-[0.98] transition-transform"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-xs">{PLATFORM_ICON[recipe.platform]}</span>
                          <span className="text-xs text-[#6b6375]">
                            saved by {recipe.saved_by}
                          </span>
                        </div>
                        <h3 className="font-semibold text-[#08060d] dark:text-white text-base leading-tight mb-2">
                          {recipe.title}
                        </h3>

                        {/* Ingredient bar */}
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-[#e5e4e7] dark:bg-[#2e303a] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#aa3bff]"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-[#6b6375] whitespace-nowrap">
                            {haveCount}/{totalCount} ingredients
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-xs font-medium text-[#aa3bff] dark:text-[#c084fc]">
                          ${recipe.cost_to_finish.toFixed(2)} to finish
                        </span>
                        <span className="text-xs text-[#6b6375]">
                          ⏱ {recipe.time_minutes}m
                        </span>
                        <div className="flex flex-wrap gap-1 justify-end mt-1">
                          {recipe.tags.slice(0, 2).map(t => (
                            <span
                              key={t}
                              className="text-[10px] bg-[#aa3bff]/10 text-[#aa3bff] dark:text-[#c084fc] rounded-full px-2 py-0.5"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        {/* Cook Together CTA */}
        <section>
          <button
            onClick={() => navigate('/recipe/1')}
            className="w-full py-4 rounded-2xl bg-[#aa3bff] text-white font-semibold text-base shadow-lg active:scale-[0.98] transition-transform"
          >
            🍳 Cook Together
          </button>
          <p className="text-xs text-center text-[#6b6375] mt-2">
            Let the AI pick the best recipe for everyone tonight
          </p>
        </section>
      </div>
    </div>
  )
}
