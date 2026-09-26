import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav'

const MOCK_RECIPES = [
  { id: '1', title: 'Spicy Tteokbokki', match: 96, time_minutes: 25, cost: 8 },
  { id: '5', title: 'Honey Garlic Salmon', match: 91, time_minutes: 25, cost: 18 },
  { id: '4', title: 'Pad Thai', match: 87, time_minutes: 20, cost: 10 },
  { id: '7', title: 'Miso Ramen', match: 82, time_minutes: 35, cost: 14 },
  { id: '2', title: 'Mango Sticky Rice', match: 74, time_minutes: 30, cost: 12 },
  { id: '3', title: 'Birria Tacos', match: 68, time_minutes: 45, cost: 15 },
  { id: '6', title: 'Avocado Toast', match: 61, time_minutes: 10, cost: 6 },
]

export default function RecommendedPage() {
  const navigate = useNavigate()
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #F6C4C3, #FAFC97)', padding: '40px 20px 90px' }}>
      <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '2.5rem', color: '#3D2B1F', margin: '0 0 4px' }}>For You</h1>
      <p style={{ color: '#888', fontSize: '13px', margin: '0 0 24px' }}>Based on your taste and preferences</p>

      {MOCK_RECIPES.map(r => (
        <div key={r.id} onClick={() => navigate(`/recipe/${r.id}`)}
          style={{ background: 'white', borderRadius: '16px', padding: '16px', marginBottom: '12px', cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontWeight: 700, color: '#3D2B1F', fontSize: '15px' }}>{r.title}</span>
            <span style={{ background: '#86efac', color: '#166534', fontSize: '12px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px' }}>
              {r.match}% match
            </span>
          </div>
          <p style={{ margin: 0, color: '#777', fontSize: '13px' }}>⏱ {r.time_minutes} min · ${r.cost}</p>
        </div>
      ))}

      <BottomNav />
    </div>
  )
}
