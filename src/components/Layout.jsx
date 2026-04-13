import { useState } from 'react'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { createHousehold, joinHousehold } from '../lib/supabase'

function HouseholdSetup() {
  const { user, refreshProfile } = useAuth()
  const [mode, setMode] = useState(null)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')
    const { error } = await createHousehold(name.trim(), user.id)
    setLoading(false)
    if (error) setError(error.message)
    else await refreshProfile()
  }

  const handleJoin = async (e) => {
    e.preventDefault()
    if (!code.trim()) return
    setLoading(true)
    setError('')
    const { error } = await joinHousehold(code.trim(), user.id)
    setLoading(false)
    if (error) setError(error.message)
    else await refreshProfile()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <span className="text-5xl">🏠</span>
          <h2 className="text-2xl font-bold text-gray-900 mt-4">Configura tu Hogar</h2>
          <p className="text-gray-500 mt-2">Crea un nuevo hogar o únete a uno existente con un código de invitación</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
            {error}
          </div>
        )}

        {!mode && (
          <div className="space-y-3">
            <button
              onClick={() => setMode('create')}
              className="w-full border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 rounded-xl p-4 text-left transition-colors"
            >
              <p className="font-semibold text-gray-900">➕ Crear un nuevo hogar</p>
              <p className="text-sm text-gray-500 mt-0.5">Soy el primero de mi familia en registrarse</p>
            </button>
            <button
              onClick={() => setMode('join')}
              className="w-full border-2 border-green-200 hover:border-green-400 hover:bg-green-50 rounded-xl p-4 text-left transition-colors"
            >
              <p className="font-semibold text-gray-900">🔗 Unirme a un hogar existente</p>
              <p className="text-sm text-gray-500 mt-0.5">Tengo un código de invitación</p>
            </button>
          </div>
        )}

        {mode === 'create' && (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del hogar</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Casa García, Familia López..."
              />
            </div>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2.5 rounded-lg transition-colors"
            >
              {loading ? 'Creando...' : 'Crear hogar'}
            </button>
            <button type="button" onClick={() => setMode(null)} className="w-full text-gray-500 text-sm hover:underline">
              Volver
            </button>
          </form>
        )}

        {mode === 'join' && (
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código de invitación</label>
              <input
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="XXXXXXXX"
                maxLength={8}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-semibold py-2.5 rounded-lg transition-colors"
            >
              {loading ? 'Uniéndome...' : 'Unirme al hogar'}
            </button>
            <button type="button" onClick={() => setMode(null)} className="w-full text-gray-500 text-sm hover:underline">
              Volver
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { household, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!household) return <HouseholdSetup />

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-500 hover:text-gray-700 p-1"
          >
            <Menu size={22} />
          </button>
          <span className="font-bold text-gray-900">HogarTracker</span>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
