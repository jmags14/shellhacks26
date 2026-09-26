import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
const recipes = [
  { id: '1', title: 'Spicy Tteokbokki' },
  { id: '2', title: 'Mango Sticky Rice' },
  { id: '3', title: 'Birria Tacos' },
]
export default function RecommendedPage() {
  const navigate = useNavigate()
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #F6C4C3, #FAFC97)', padding: '40px 20px 90px' }}>
      <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '2.5rem', color: '#3D2B1F' }}>For You</h1>
      <p style={{ color: '#555' }}>Based on what your group loves</p>
      {recipes.map(r => (
        <div key={r.id} onClick={() => navigate(`/recipe/${r.id}`)}
          style={{ marginTop: '16px', background: 'white', borderRadius: '16px', padding: '20px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <p style={{ fontWeight: 700, color: '#3D2B1F', margin: 0 }}>{r.title}</p>
        </div>
      ))}
      <BottomNav />
    </div>
  )
}
