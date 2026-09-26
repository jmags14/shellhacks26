import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useUser } from '../lib/auth'

type Mode = null | 'login' | 'signup'

export default function LoginPage() {
  const { user, loading } = useUser()
  const [mode, setMode] = useState<Mode>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  if (!loading && user) return <Navigate to="/" replace />

  function selectMode(m: Mode) {
    setMode(m)
    setError('')
    setSuccess('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (mode === 'signup') {
      if (password !== confirm) { setError('Passwords do not match.'); return }
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: name } },
      })
      if (error) setError(error.message)
      else setSuccess('Account created! Check your email to confirm.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    }
  }

  const inputStyle = {
    width: '100%', padding: '0.75rem 1rem', boxSizing: 'border-box' as const,
    border: '1px solid #F8DBD8', borderRadius: '12px',
    fontSize: '0.95rem', outline: 'none', background: '#fff',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden', padding: '2rem', background: '#fff', fontFamily: 'system-ui, sans-serif' }}>

      {/* Logo + Tagline */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '1rem', gap: '0.5rem' }}>
        <img
          src="/logo.jpg"
          alt="Doomscroll & Dine"
          style={{ width: '180px', display: 'block' }}
        />
        <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: '600', fontStyle: 'italic', color: '#F8CE5B', textAlign: 'center' }}>
          Your FYP is now your meal plan.
        </p>
      </div>

      {/* Form — shown after a mode is selected */}
      {mode && (
        <div style={{ width: '100%', maxWidth: '360px', alignSelf: 'center', marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {mode === 'signup' && (
              <input
                type="text"
                required
                placeholder="Name"
                value={name}
                onChange={e => setName(e.target.value)}
                style={inputStyle}
              />
            )}
            <input
              type="email"
              required
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={inputStyle}
            />
            <input
              type="password"
              required
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={inputStyle}
            />
            {mode === 'signup' && (
              <input
                type="password"
                required
                placeholder="Confirm Password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                style={inputStyle}
              />
            )}
            <button
              type="submit"
              style={{
                width: '100%', padding: '0.75rem',
                background: mode === 'login' ? '#FAAED2' : '#F8CE5B',
                color: '#5C2D2D',
                border: 'none', borderRadius: '12px',
                fontSize: '0.95rem', fontWeight: '700', cursor: 'pointer',
              }}
            >
              {mode === 'login' ? 'Log In' : 'Sign Up'}
            </button>
          </form>

          {error && <p style={{ color: '#ef4444', textAlign: 'center', margin: 0 }} role="alert">{error}</p>}
          {success && <p style={{ color: '#2F6B4F', textAlign: 'center', margin: 0 }}>{success}</p>}
        </div>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Mode buttons */}
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button
          onClick={() => selectMode('login')}
          style={{
            flex: 1, padding: '0.65rem',
            background: '#FAAED2', color: '#5C2D2D',
            border: mode === 'login' ? '2px solid #d4608a' : '2px solid transparent',
            borderRadius: '12px',
            fontSize: '0.95rem', fontWeight: '700', cursor: 'pointer',
          }}
        >
          Log In
        </button>
        <button
          onClick={() => selectMode('signup')}
          style={{
            flex: 1, padding: '0.65rem',
            background: '#F8CE5B', color: '#5C2D2D',
            border: mode === 'signup' ? '2px solid #c9a000' : '2px solid transparent',
            borderRadius: '12px',
            fontSize: '0.95rem', fontWeight: '700', cursor: 'pointer',
          }}
        >
          Sign Up
        </button>
      </div>
    </div>
  )
}
