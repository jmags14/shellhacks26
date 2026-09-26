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

  // Form screen
  if (mode) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden', padding: '2rem', background: '#fff', fontFamily: 'system-ui, sans-serif' }}>

        {/* Back arrow */}
        <button
          onClick={() => selectMode(null)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: '#3D2B1F', padding: 0, alignSelf: 'flex-start', lineHeight: 1 }}
        >
          ←
        </button>

        {/* Heading */}
        <h1 style={{ margin: '1.5rem 0 1.5rem', fontSize: '2rem', fontWeight: '800', color: '#3D2B1F', fontFamily: 'Bebas Neue, sans-serif' }}>
          {mode === 'login' ? 'Log In' : 'Sign Up'}
        </h1>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {mode === 'signup' && (
            <input type="text" required placeholder="Name" value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
          )}
          <input type="email" required placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
          <input type="password" required placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />
          {mode === 'signup' && (
            <input type="password" required placeholder="Confirm Password" value={confirm} onChange={e => setConfirm(e.target.value)} style={inputStyle} />
          )}
          <button
            type="submit"
            style={{
              width: '100%', padding: '0.75rem',
              background: mode === 'login' ? '#FAAED2' : '#F8CE5B',
              color: '#3D2B1F', border: 'none', borderRadius: '12px',
              fontSize: '0.95rem', fontWeight: '700', cursor: 'pointer',
              marginTop: '0.5rem',
            }}
          >
            {mode === 'login' ? 'Log In' : 'Sign Up'}
          </button>
        </form>

        {error && <p style={{ color: '#ef4444', textAlign: 'center', margin: '0.75rem 0 0' }} role="alert">{error}</p>}
        {success && <p style={{ color: '#2F6B4F', textAlign: 'center', margin: '0.75rem 0 0' }}>{success}</p>}
      </div>
    )
  }

  // Splash screen
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden',
      margin: 0, padding: '2rem',
      background: 'linear-gradient(to bottom, #ffffff 40%, #FAAED2 100%)',
      fontFamily: 'system-ui, sans-serif',
    }}>

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '2rem' }}>
        <img
          src="/logo.png"
          alt="Doomscroll & Dine"
          style={{ width: '280px', display: 'block', mixBlendMode: 'multiply' }}
        />
      </div>

      {/* WELCOME + tagline */}
      <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
        <p style={{ margin: 0, fontSize: '2.5rem', fontWeight: '800', color: '#3D2B1F', letterSpacing: '0.1em', fontFamily: 'Bebas Neue, sans-serif' }}>
          WELCOME
        </p>
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem', fontWeight: '600', fontStyle: 'italic', color: '#fff' }}>
          Your FYP is now your meal plan.<br />Scroll, save, and cook with friends.
        </p>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button
          onClick={() => selectMode('login')}
          style={{
            flex: 1, padding: '0.5rem 1rem',
            background: '#FAAED2', color: '#3D2B1F',
            border: '1.5px solid #d4608a', boxShadow: '0 2px 8px rgba(212, 96, 138, 0.3)',
            borderRadius: '12px', fontWeight: '700', fontSize: '0.95rem', cursor: 'pointer',
          }}
        >
          Log In
        </button>
        <button
          onClick={() => selectMode('signup')}
          style={{
            flex: 1, padding: '0.5rem 1rem',
            background: '#F8CE5B', color: '#3D2B1F',
            border: '1.5px solid #c9a000', boxShadow: '0 2px 8px rgba(201, 160, 0, 0.3)',
            borderRadius: '12px', fontWeight: '700', fontSize: '0.95rem', cursor: 'pointer',
          }}
        >
          Sign Up
        </button>
      </div>
    </div>
  )
}
