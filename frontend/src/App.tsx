import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import SharePage from './pages/SharePage'
import RecipeDetailPage from './pages/RecipeDetailPage'
import CookTogetherPage from './pages/CookTogetherPage'
import RecommendedPage from './pages/RecommendedPage'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route path="/" element={
          <ProtectedRoute><HomePage /></ProtectedRoute>
        } />
        <Route path="/share" element={
          <ProtectedRoute><SharePage /></ProtectedRoute>
        } />
        <Route path="/recipe/:id" element={
          <ProtectedRoute><RecipeDetailPage /></ProtectedRoute>
        } />
        <Route path="/cook-together" element={
          <ProtectedRoute><CookTogetherPage /></ProtectedRoute>
        } />
        <Route path="/recommended" element={
          <ProtectedRoute><RecommendedPage /></ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
