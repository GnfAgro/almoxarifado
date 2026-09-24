import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Estoque from './pages/Estoque'
import Login from './pages/Login'
import AlmoxarifeDashboard from './pages/AlmoxarifeDashboard'

function Painel() {
  const { session, perfil, carregando } = useAuth()

  if (carregando) return <div className="vazio">Carregando…</div>
  if (!session) return <Navigate to="/login" replace />
  if (!perfil) return <div className="vazio">Seu usuário não tem um perfil cadastrado (fale com o administrador).</div>

  // Admin usa o mesmo painel do almoxarife, com os poderes extras de aprovação.
  return <AlmoxarifeDashboard souAdmin={perfil.role === 'admin'} />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Estoque />} />
      <Route path="/login" element={<Login />} />
      <Route path="/painel" element={<Painel />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
