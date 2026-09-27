import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'

export default function ProfilePage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [myFriends, setMyFriends] = useState<{id: string, name: string, emoji: string}[]>([])

  useEffect(() => {
    const ALL_FRIENDS = [
      { id: '1', name: 'Maya', emoji: '🐱' },
      { id: '2', name: 'Jordan', emoji: '🐼' },
      { id: '3', name: 'Priya', emoji: '🦊' },
      { id: '4', name: 'Carlos', emoji: '🐨' },
      { id: '5', name: 'Lily', emoji: '🐰' },
      { id: '6', name: 'Sam', emoji: '🐸' },
      { id: '7', name: 'Ava', emoji: '🦋' },
    ]
    try {
      const addedIds: string[] = JSON.parse(localStorage.getItem('friends') || '[]')
      setMyFriends(ALL_FRIENDS.filter(f => addedIds.includes(f.id)))
    } catch {}
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email || '')
    })
  }, [])

  const displayName = email.split('@')[0] || 'You'
  const initial = displayName[0]?.toUpperCase() || '?'

  return (
    <div style={{ minHeight: '100vh', background: '#fff', paddingBottom: '80px' }}>
      <div style={{ maxWidth: 420, margin: '0 auto', padding: '60px 24px 24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 48 }}>
          <div style={{
            width: 90, height: 90, borderRadius: '50%',
            background: '#FAAED2', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 42,
            fontFamily: 'Bebas Neue, sans-serif', color: '#fff',
            marginBottom: 16, boxShadow: '0 4px 16px rgba(0,0,0,0.10)'
          }}>
            {initial}
          </div>
          <h1 style={{
            fontFamily: 'Bebas Neue, sans-serif', fontSize: 32,
            color: '#3d1c02', margin: 0, letterSpacing: 1
          }}>
            {displayName}
          </h1>
          <p style={{ color: '#aaa', fontSize: 14, margin: '4px 0 0' }}>{email}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <button
            onClick={() => navigate('/profile/friends')}
            style={{
              background: '#FAAED2', border: 'none', borderRadius: 50,
              padding: '18px 0', width: '100%', fontSize: 18,
              fontFamily: 'Bebas Neue, sans-serif', color: '#3d1c02',
              cursor: 'pointer', letterSpacing: 1
            }}
          >
            👥  Friends
          </button>
          <button
            onClick={() => navigate('/profile/preferences')}
            style={{
              background: '#FAFC97', border: 'none', borderRadius: 50,
              padding: '18px 0', width: '100%', fontSize: 18,
              fontFamily: 'Bebas Neue, sans-serif', color: '#3d1c02',
              cursor: 'pointer', letterSpacing: 1
            }}
          >
            🥗  Food Preferences
          </button>
        </div>

        {myFriends.length > 0 && (
          <div style={{ marginTop: 40 }}>
            <h2 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 24, color: '#3d1c02', marginBottom: 16 }}>
              My Friends
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {myFriends.map(f => (
                <div key={f.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: '#FFFFE0', borderRadius: 16, padding: '12px 18px'
                }}>
                  <span style={{ fontSize: 26 }}>{f.emoji}</span>
                  <span style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 600, color: '#3d1c02', fontSize: 16 }}>{f.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
