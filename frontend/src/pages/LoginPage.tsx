import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    // TODO: supabase.auth.signInWithOtp({ email })
    setSent(true)
  }

  function handleGoogle() {
    // TODO: supabase.auth.signInWithOAuth({ provider: 'google' })
    navigate('/')
  }

  return (
    <div className="flex flex-col min-h-screen items-center justify-center px-6 py-12 bg-white dark:bg-[#16171d]">
      {/* Logo / branding */}
      <div className="mb-8 text-center">
        <div className="text-5xl mb-3">📱🍜</div>
        <h1 className="text-3xl font-bold tracking-tight text-[#08060d] dark:text-white">
          Doomscroll&nbsp;&amp;&nbsp;Dine
        </h1>
        <p className="mt-2 text-[#6b6375] dark:text-gray-400 text-sm leading-relaxed max-w-xs mx-auto">
          Turn your saved TikTok &amp; Instagram recipes into dinner plans with
          friends.
        </p>
      </div>

      {sent ? (
        <div className="w-full max-w-sm text-center">
          <div className="text-4xl mb-4">✉️</div>
          <h2 className="text-xl font-semibold text-[#08060d] dark:text-white mb-1">
            Check your email
          </h2>
          <p className="text-sm text-[#6b6375] dark:text-gray-400">
            We sent a magic link to <strong>{email}</strong>
          </p>
        </div>
      ) : (
        <div className="w-full max-w-sm flex flex-col gap-3">
          {/* Google */}
          <button
            onClick={handleGoogle}
            className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-xl border border-[#e5e4e7] dark:border-[#2e303a] bg-white dark:bg-[#1f2028] text-[#08060d] dark:text-white font-medium text-sm shadow-sm active:scale-[0.98] transition-transform"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 my-1">
            <div className="flex-1 h-px bg-[#e5e4e7] dark:bg-[#2e303a]" />
            <span className="text-xs text-[#6b6375]">or</span>
            <div className="flex-1 h-px bg-[#e5e4e7] dark:bg-[#2e303a]" />
          </div>

          {/* Magic link */}
          <form onSubmit={handleMagicLink} className="flex flex-col gap-3">
            <input
              type="email"
              required
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full py-3 px-4 rounded-xl border border-[#e5e4e7] dark:border-[#2e303a] bg-white dark:bg-[#1f2028] text-[#08060d] dark:text-white text-sm placeholder:text-[#6b6375] focus:outline-none focus:border-[#aa3bff] dark:focus:border-[#c084fc] transition-colors"
            />
            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-[#aa3bff] text-white font-medium text-sm active:scale-[0.98] transition-transform shadow"
            >
              Send magic link
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
