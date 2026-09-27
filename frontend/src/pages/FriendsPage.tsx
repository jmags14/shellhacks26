import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import { supabase } from '../lib/supabase'
import { api, type Friend } from '../lib/api'

export default function FriendsPage() {
  const navigate = useNavigate()
  const [userId, setUserId] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<Friend[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [adding, setAdding] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const id = data.user?.id
      if (!id) { setLoading(false); return }
      setUserId(id)
      api.listFriendSuggestions(id)
        .then(res => setSuggestions(res.users))
        .catch(() => setError("Couldn't load people right now."))
        .finally(() => setLoading(false))
    })
  }, [])

  const addFriend = async (friendId: string) => {
    if (!userId || adding) return
    setAdding(friendId)
    setError('')
    try {
      const res = await api.addFriend(userId, friendId)
      if (!res.success) throw new Error(res.error)
      setSuggestions(prev => prev.filter(f => f.id !== friendId))
    } catch {
      setError("Couldn't add that friend. Try again.")
    } finally {
      setAdding(null)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fff', paddingBottom: '80px' }}>
      <div style={{ maxWidth: 420, margin: '0 auto', padding: '48px 24px 24px' }}>
        <button onClick={() => navigate('/profile')} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', marginBottom: 16 }}>←</button>
        <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 32, color: '#3d1c02', margin: '0 0 8px' }}>Friends</h1>
        <p style={{ color: '#aaa', fontSize: 14, marginBottom: 32 }}>People you might know</p>

        {error && <p style={{ color: '#c0392b', fontSize: 14, marginBottom: 16 }}>{error}</p>}

        {loading ? (
          <p style={{ color: '#aaa', fontSize: 15, textAlign: 'center', marginTop: 60 }}>Loading…</p>
        ) : suggestions.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: 60 }}>
            <p style={{ color: '#aaa', fontSize: 15 }}>You've added everyone! 🎉</p>
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
                  disabled={adding !== null}
                  style={{
                    background: '#F8CE5B', border: 'none', borderRadius: 50,
                    padding: '8px 20px', fontSize: 13,
                    fontFamily: 'Nunito, sans-serif', fontWeight: 700,
                    color: '#3d1c02', cursor: 'pointer',
                    opacity: adding === friend.id ? 0.6 : 1
                  }}
                >
                  {adding === friend.id ? 'Adding…' : '+ Add'}
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
