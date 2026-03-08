import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { DesignProvider } from './context/DesignContext'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import RoomSetup from './pages/RoomSetup'
import Editor2D from './pages/Editor2D'
import Preview3D from './pages/Preview3D'

// Requires full login (Dashboard)
function PrivateRoute({ children }) {
  const hasToken = !!localStorage.getItem('token')
  return hasToken ? children : <Navigate to="/" />
}

// Allows guests and logged-in users (Room Setup, Editor, 3D)
function DesignRoute({ children }) {
  const hasToken = !!localStorage.getItem('token')
  const isGuest = localStorage.getItem('isGuest') === 'true'
  return (hasToken || isGuest) ? children : <Navigate to="/" />
}

export default function App() {
  return (
    <DesignProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/room-setup" element={<DesignRoute><RoomSetup /></DesignRoute>} />
          <Route path="/editor" element={<DesignRoute><Editor2D /></DesignRoute>} />
          <Route path="/preview3d" element={<DesignRoute><Preview3D /></DesignRoute>} />
        </Routes>
      </BrowserRouter>
    </DesignProvider>
  )
}