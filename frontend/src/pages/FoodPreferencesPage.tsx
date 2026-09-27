import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav'

const ALLERGIES = ['Dairy', 'Peanuts', 'Shellfish', 'Gluten', 'Eggs', 'Soy', 'Tree Nuts', 'Fish', 'Sesame']
const DIETS = ['No Restriction', 'Vegetarian', 'Vegan', 'Pescatarian', 'Keto', 'Halal', 'Kosher', 'Gluten-Free']
const SPICE_LEVELS = ['Mild', 'Medium', 'Spicy']

function loadPrefs() {
  try {
    const raw = localStorage.getItem('foodPreferences')
    if (!raw) return { allergies: [], diets: [], spice: '' }
    return JSON.parse(raw) as { allergies: string[], diets: string[], spice: string }
  } catch {
    return { allergies: [], diets: [], spice: '' }
  }
}

export default function FoodPreferencesPage() {
  const navigate = useNavigate()
  const [allergies, setAllergies] = useState<string[]>(() => loadPrefs().allergies)
  const [diets, setDiets] = useState<string[]>(() => loadPrefs().diets)
  const [spice, setSpice] = useState<string>(() => loadPrefs().spice)
  const [saved, setSaved] = useState(false)

  const toggleAllergy = (item: string) =>
    setAllergies(prev => prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item])

  const toggleDiet = (item: string) =>
    setDiets(prev => prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item])

  const handleSave = () => {
    try {
      localStorage.setItem('foodPreferences', JSON.stringify({ allergies, diets, spice }))
    } catch {}
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const chip = (label: string, selected: boolean, onToggle: () => void, selectedColor = '#FAAED2') => (
    <button
      key={label}
      onClick={onToggle}
      style={{
        padding: '8px 18px',
        borderRadius: 50,
        border: selected ? 'none' : '1.5px solid #e5e7eb',
        background: selected ? selectedColor : '#fff',
        color: '#3d1c02',
        fontFamily: 'Nunito, sans-serif',
        fontWeight: selected ? 700 : 400,
        fontSize: 14,
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  )

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #F6C4C3 0%, #FAFC97 100%)',
      paddingBottom: '100px'
    }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '48px 24px 24px' }}>
        <button
          onClick={() => navigate('/profile')}
          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', marginBottom: 16, color: '#3d1c02' }}
        >
          ←
        </button>

        <h1 style={{
          fontFamily: 'Bebas Neue, sans-serif',
          fontSize: 36,
          color: '#3d1c02',
          margin: '0 0 32px',
          letterSpacing: 1
        }}>
          Food Preferences
        </h1>

        {/* Allergies */}
        <div style={{ marginBottom: 32 }}>
          <h2 style={{
            fontFamily: 'Bebas Neue, sans-serif',
            fontSize: 22,
            color: '#3d1c02',
            margin: '0 0 14px',
            letterSpacing: 1
          }}>
            Allergies
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {ALLERGIES.map(a => chip(a, allergies.includes(a), () => toggleAllergy(a)))}
          </div>
        </div>

        {/* Diet */}
        <div style={{ marginBottom: 32 }}>
          <h2 style={{
            fontFamily: 'Bebas Neue, sans-serif',
            fontSize: 22,
            color: '#3d1c02',
            margin: '0 0 14px',
            letterSpacing: 1
          }}>
            Diet
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {DIETS.map(d => chip(d, diets.includes(d), () => toggleDiet(d)))}
          </div>
        </div>

        {/* Spice Level */}
        <div style={{ marginBottom: 40 }}>
          <h2 style={{
            fontFamily: 'Bebas Neue, sans-serif',
            fontSize: 22,
            color: '#3d1c02',
            margin: '0 0 14px',
            letterSpacing: 1
          }}>
            Spice Level
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {SPICE_LEVELS.map(s => chip(s, spice === s, () => setSpice(s), '#F8CE5B'))}
          </div>
        </div>

        <button
          onClick={handleSave}
          style={{
            width: '100%',
            padding: '16px',
            background: saved ? '#86efac' : '#FAAED2',
            border: 'none',
            borderRadius: 50,
            fontFamily: 'Bebas Neue, sans-serif',
            fontSize: 20,
            color: '#3d1c02',
            cursor: 'pointer',
            letterSpacing: 1,
            transition: 'background 0.2s',
          }}
        >
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>
      <BottomNav />
    </div>
  )
}
