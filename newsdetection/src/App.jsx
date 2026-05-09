import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Cursor from './components/Cursor'
import Home from './components/Home'
import DetectorPage from './components/DetectorPage'
import ScanContent from './components/ScanContent'
import Reports from './components/Reports'
import Awareness from './components/Awareness'
import About from './components/About'
import Login from './components/Login'
import Signup from './components/Signup'
import Profile from './components/Profile'
import Pricing from './components/Pricing'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <Router>
      <AuthProvider>
        {/* Global Elements */}
        <div className="noise-overlay" />
        <Cursor />

        {/* Routing */}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/detector" element={<DetectorPage />} />
          <Route path="/scan" element={<ScanContent />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/awareness" element={<Awareness />} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/plans" element={<Pricing />} />
        </Routes>
      </AuthProvider>
    </Router>
  )
}

export default App
