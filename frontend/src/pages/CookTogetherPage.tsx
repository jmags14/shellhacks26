import BottomNav from '../components/BottomNav'
export default function CookTogetherPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #F6C4C3, #FAFC97)', padding: '40px 20px 90px' }}>
      <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '2.5rem', color: '#3D2B1F' }}>Cook Together</h1>
      <p style={{ color: '#555' }}>Pick a recipe to make with friends</p>
      <div style={{ marginTop: '40px', background: 'white', borderRadius: '16px', padding: '24px', textAlign: 'center', color: '#aaa' }}>
        No recipe selected yet
      </div>
      <BottomNav />
    </div>
  )
}
