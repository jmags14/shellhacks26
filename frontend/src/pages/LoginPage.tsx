import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useUser } from '../lib/auth'

export default function LoginPage() {
  const { user, loading } = useUser()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  // Already logged in → go home
  if (!loading && user) return <Navigate to="/" replace />

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) setError(error.message)
    else setSent(true)
  }

  async function handleGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/' },
    })
    if (error) setError(error.message)
  }

  if (sent) {
    return (
      <div>
        <h1>Check your email</h1>
        <p>We sent a magic link to {email}</p>
      </div>
    )
  }

  return (
    <div>
      <h1>Doomscroll &amp; Dine</h1>
      <p>Turn your saved TikTok &amp; Instagram recipes into dinner plans with friends.</p>

      <button onClick={handleGoogle}>Continue with Google</button>

      <hr />

      <form onSubmit={handleMagicLink}>
        <input
          type="email"
          required
          placeholder="your@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <button type="submit">Send magic link</button>
      </form>

      {error && <p role="alert">{error}</p>}
    </div>
  )
}
