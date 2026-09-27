import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'

const ANIMAL_EMOJIS = ['🐱', '🐼', '🦊', '🐨', '🐰', '🐸', '🦋', '🐯', '🦁', '🐻', '🐮', '🐷', '🐙', '🦄', '🐧']

function getAnimalEmoji(index: number) {
  return ANIMAL_EMOJIS[index % ANIMAL_EMOJIS.length]
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [myFriends, setMyFriends] = useState<{id: string, name: string, emoji: string}[]>([])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const userId = data.user?.id
      if (!userId) return
      fetch(`/api/friends?user_id=${userId}`)
        .then(r => r.json())
        .then(data => {
          const friendList = (data.friends || []).map((f: any) => ({
            id: f.id,
            name: f.username || f.display_name || f.email?.split('@')[0] || 'Friend',
            emoji: '🐾'
          }))
          setMyFriends(friendList)
        })
        .catch(() => setMyFriends([]))
    })
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email || '')
    })
  }, [])

  const [showConfirm, setShowConfirm] = useState(false)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const displayName = email.split('@')[0] || 'You'
  const initial = displayName[0]?.toUpperCase() || '?'

  return (
    <div style={{ minHeight: '100vh', background: '#fff', paddingBottom: '80px', position: 'relative' }}>
      {/* Sign out button */}
      <div style={{ position: 'absolute', top: 16, right: 16 }}>
        {!showConfirm ? (
          <button
            onClick={() => setShowConfirm(true)}
            style={{
              background: '#fee2e2', border: 'none', borderRadius: 50,
              padding: '8px 18px', fontSize: 13,
              fontFamily: 'Nunito, sans-serif', fontWeight: 700,
              color: '#dc2626', cursor: 'pointer'
            }}
          >
            Sign Out
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#888', fontFamily: 'Nunito, sans-serif' }}>Sure?</span>
            <button
              onClick={handleSignOut}
              style={{
                background: '#dc2626', border: 'none', borderRadius: 50,
                padding: '8px 16px', fontSize: 13,
                fontFamily: 'Nunito, sans-serif', fontWeight: 700,
                color: '#fff', cursor: 'pointer'
              }}
            >
              Yes
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              style={{
                background: '#e5e7eb', border: 'none', borderRadius: 50,
                padding: '8px 16px', fontSize: 13,
                fontFamily: 'Nunito, sans-serif', fontWeight: 700,
                color: '#3d1c02', cursor: 'pointer'
              }}
            >
              No
            </button>
          </div>
        )}
      </div>
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
              {myFriends.map((f, index) => (
                <div key={f.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: '#FFFFE0', borderRadius: 16, padding: '12px 18px'
                }}>
                  <span style={{ fontSize: 26 }}>{getAnimalEmoji(index)}</span>
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
