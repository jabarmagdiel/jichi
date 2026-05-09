import { Routes, Route, Navigate } from 'react-router-dom'
import AdminLayout from './pages/AdminLayout'
import Dashboard from './pages/Dashboard'
import Contenedores from './pages/Contenedores'
import Rutas from './pages/Rutas'
import ConductorApp from './pages/ConductorApp'

export const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000'

function App() {
  return (
    <Routes>
      {/* Panel Admin */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="contenedores" element={<Contenedores />} />
        <Route path="rutas" element={<Rutas />} />
      </Route>

      {/* App Conductor (Móvil) */}
      <Route path="/conductor" element={<ConductorApp />} />
      <Route path="/conductor/:camionId" element={<ConductorApp />} />

      {/* Redirect raíz */}
      <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
    </Routes>
  )
}

export default App
