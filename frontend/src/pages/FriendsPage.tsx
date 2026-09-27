import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav'

const ALL_FRIENDS = [
  { id: '1', name: 'Maya', emoji: '🐱' },
  { id: '2', name: 'Jordan', emoji: '🐼' },
  { id: '3', name: 'Priya', emoji: '🦊' },
  { id: '4', name: 'Carlos', emoji: '🐨' },
  { id: '5', name: 'Lily', emoji: '🐰' },
  { id: '6', name: 'Sam', emoji: '🐸' },
  { id: '7', name: 'Ava', emoji: '🦋' },
]

export default function FriendsPage() {
  const navigate = useNavigate()
  const [added, setAdded] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('friends') || '[]')
    } catch { return [] }
  })

  const suggestions = ALL_FRIENDS.filter(f => !added.includes(f.id))

  const addFriend = (id: string) => {
    const next = [...added, id]
    setAdded(next)
    try { localStorage.setItem('friends', JSON.stringify(next)) } catch {}
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fff', paddingBottom: '80px' }}>
      <div style={{ maxWidth: 420, margin: '0 auto', padding: '48px 24px 24px' }}>
        <button onClick={() => navigate('/profile')} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', marginBottom: 16 }}>←</button>
        <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 32, color: '#3d1c02', margin: '0 0 8px' }}>Friends</h1>
        <p style={{ color: '#aaa', fontSize: 14, marginBottom: 32 }}>People you might know</p>

        {suggestions.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: 60 }}>
            <p style={{ color: '#aaa', fontSize: 15, marginBottom: 24 }}>You've added everyone! 🎉</p>
            <button
              onClick={() => {
                try { localStorage.removeItem('friends') } catch {}
                setAdded([])
              }}
              style={{
                background: '#FAFC97', border: 'none', borderRadius: 50,
                padding: '14px 32px', fontSize: 16,
                fontFamily: 'Nunito, sans-serif', fontWeight: 700,
                color: '#3d1c02', cursor: 'pointer'
              }}
            >
              Reset Friends List
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {suggestions.map(friend => (
              <div key={friend.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: '#FFFFE0', borderRadius: 16, padding: '14px 18px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 28 }}>{friend.emoji}</span>
                  <span style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 600, color: '#3d1c02', fontSize: 16 }}>{friend.name}</span>
                </div>
                <button
                  onClick={() => addFriend(friend.id)}
                  style={{
                    background: '#F8CE5B', border: 'none', borderRadius: 50,
                    padding: '8px 20px', fontSize: 13,
                    fontFamily: 'Nunito, sans-serif', fontWeight: 700,
                    color: '#3d1c02', cursor: 'pointer'
                  }}
                >
                  + Add
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
