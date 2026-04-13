import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Copy, Check, Users, LogOut, RefreshCw } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getHouseholdMembers, updateProfile, supabase } from '../lib/supabase'

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${copied ? 'bg-green-100 text-green-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? '¡Copiado!' : label}
    </button>
  )
}

export default function Household() {
  const { user, profile, household, refreshProfile } = useAuth()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [editName, setEditName] = useState(false)
  const [newName, setNewName] = useState(profile?.full_name || '')
  const [saving, setSaving] = useState(false)
  const [householdStats, setHouseholdStats] = useState({ totalExpenses: 0, totalCategories: 0 })

  const load = async () => {
    setLoading(true)
    if (!household) { setLoading(false); return }
    const { data } = await getHouseholdMembers(household.id)
    setMembers(data || [])

    // Load stats
    const [expRes, catRes] = await Promise.all([
      supabase.from('expenses').select('id', { count: 'exact' }).eq('household_id', household.id),
      supabase.from('categories').select('id', { count: 'exact' }).eq('household_id', household.id),
    ])
    setHouseholdStats({
      totalExpenses: expRes.count || 0,
      totalCategories: catRes.count || 0,
    })
    setLoading(false)
  }

  useEffect(() => { load() }, [household])

  const handleSaveName = async () => {
    if (!newName.trim()) return
    setSaving(true)
    await updateProfile(user.id, { full_name: newName.trim() })
    await refreshProfile()
    setSaving(false)
    setEditName(false)
  }

  const handleLeave = async () => {
    if (!window.confirm('¿Seguro que quieres salir del hogar? Perderás acceso a los datos compartidos.')) return
    await updateProfile(user.id, { household_id: null })
    await refreshProfile()
  }

  const initials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
  const avatarColors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500']

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mi Hogar</h1>
        <p className="text-gray-500 text-sm">Gestiona tu hogar y los miembros</p>
      </div>

      {/* Household info card */}
      {household && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center text-2xl">🏠</div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{household.name}</h2>
                <p className="text-sm text-gray-400">Creado el {format(new Date(household.created_at), "d 'de' MMMM, yyyy", { locale: es })}</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{members.length}</p>
              <p className="text-xs text-gray-500 mt-0.5">Miembros</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{householdStats.totalExpenses}</p>
              <p className="text-xs text-gray-500 mt-0.5">Gastos totales</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-purple-600">{householdStats.totalCategories}</p>
              <p className="text-xs text-gray-500 mt-0.5">Categorías</p>
            </div>
          </div>

          {/* Invite code */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <p className="text-sm font-semibold text-blue-900 mb-2">🔗 Código de invitación</p>
            <p className="text-xs text-blue-600 mb-3">Comparte este código para que otros miembros se unan a tu hogar</p>
            <div className="flex items-center gap-3">
              <code className="flex-1 bg-white border border-blue-200 rounded-lg px-4 py-2.5 text-xl font-mono font-bold tracking-widest text-blue-800 text-center">
                {household.invite_code}
              </code>
              <CopyButton text={household.invite_code} label="Copiar código" />
            </div>
            <div className="mt-2">
              <CopyButton
                text={`Únete a mi hogar en HogarTracker con el código: ${household.invite_code}`}
                label="Copiar mensaje de invitación"
              />
            </div>
          </div>
        </div>
      )}

      {/* My profile */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Mi perfil</h3>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-lg">
            {initials(profile?.full_name)}
          </div>
          <div className="flex-1">
            {editName ? (
              <div className="flex items-center gap-2">
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                />
                <button onClick={handleSaveName} disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-2 rounded-lg disabled:opacity-50">
                  {saving ? '...' : 'Guardar'}
                </button>
                <button onClick={() => setEditName(false)}
                  className="text-gray-400 hover:text-gray-600 text-sm px-2 py-2">
                  Cancelar
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div>
                  <p className="font-semibold text-gray-900">{profile?.full_name || 'Sin nombre'}</p>
                  <p className="text-sm text-gray-400">{user?.email}</p>
                </div>
                <button
                  onClick={() => { setNewName(profile?.full_name || ''); setEditName(true) }}
                  className="text-xs text-blue-600 hover:underline ml-2"
                >
                  Editar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Members list */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Users size={18} className="text-gray-400" />
            Miembros del hogar
          </h3>
          <button onClick={load} className="text-gray-400 hover:text-gray-700 p-1 transition-colors">
            <RefreshCw size={15} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-20">
            <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {members.map((m, i) => (
              <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${avatarColors[i % avatarColors.length]}`}>
                  {initials(m.full_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {m.full_name || 'Sin nombre'}
                    {m.id === user.id && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">Tú</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400">
                    Miembro desde {format(new Date(m.created_at), "d 'de' MMMM, yyyy", { locale: es })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Leave household */}
      <div className="bg-red-50 rounded-xl border border-red-200 p-5">
        <h3 className="font-semibold text-red-900 mb-1 flex items-center gap-2">
          <LogOut size={16} /> Salir del hogar
        </h3>
        <p className="text-sm text-red-600 mb-4">
          Si sales del hogar, perderás acceso a los gastos, categorías y presupuestos compartidos.
          Podrás unirte a otro hogar o crear uno nuevo.
        </p>
        <button
          onClick={handleLeave}
          className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          Salir del hogar
        </button>
      </div>
    </div>
  )
}
