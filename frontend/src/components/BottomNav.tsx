import { useNavigate, useLocation } from 'react-router-dom'

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const active = (path: string) => location.pathname === path

  const tabs = [
    { path: '/', label: 'Home', emoji: '🏠' },
    { path: '/cook-together', label: 'Cook Together', emoji: '🍳' },
    { path: '/recommended', label: 'For You', emoji: '✨' },
    { path: '/profile', label: 'You', emoji: '👤' },
  ]

  return (
    <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', borderTop: '1px solid #f0f0f0', display: 'flex', zIndex: 100 }}>
      {tabs.map(tab => (
        <button key={tab.path} onClick={() => navigate(tab.path)}
          style={{ flex: 1, padding: '10px 0', border: 'none', background: active(tab.path) ? '#FFF0F8' : 'white', color: active(tab.path) ? '#d4689a' : '#888', fontSize: '11px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
          <span style={{ fontSize: '20px' }}>{tab.emoji}</span>
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
