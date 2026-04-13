import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Plus, Edit2, Trash2, X, Tag } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getCategories, createCategory, updateCategory, deleteCategory } from '../lib/supabase'

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#64748b',
]

const ICONS = [
  { value: 'shopping-cart', label: '🛒 Compras' },
  { value: 'utensils', label: '🍽️ Comida' },
  { value: 'car', label: '🚗 Transporte' },
  { value: 'home', label: '🏠 Hogar' },
  { value: 'heart', label: '❤️ Salud' },
  { value: 'book', label: '📚 Educación' },
  { value: 'gamepad', label: '🎮 Entretenimiento' },
  { value: 'shirt', label: '👕 Ropa' },
  { value: 'zap', label: '⚡ Servicios' },
  { value: 'plane', label: '✈️ Viajes' },
  { value: 'gift', label: '🎁 Regalos' },
  { value: 'tag', label: '🏷️ Otro' },
]

function CategoryModal({ category, householdId, onClose, onSaved }) {
  const isEdit = !!category
  const [selectedColor, setSelectedColor] = useState(category?.color || '#3b82f6')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      name: category?.name || '',
      icon: category?.icon || 'tag',
    }
  })

  const onSubmit = async (data) => {
    setError('')
    setLoading(true)
    const payload = { ...data, color: selectedColor, household_id: householdId }
    const { error: err } = isEdit
      ? await updateCategory(category.id, payload)
      : await createCategory(payload)
    setLoading(false)
    if (err) setError(err.message)
    else onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">{isEdit ? 'Editar categoría' : 'Nueva categoría'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
            <input
              {...register('name', { required: 'El nombre es requerido' })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: Alimentación, Transporte..."
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ícono</label>
            <select
              {...register('icon')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {ICONS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedColor(c)}
                  className={`w-8 h-8 rounded-full transition-transform ${selectedColor === c ? 'scale-125 ring-2 ring-offset-2 ring-gray-400' : 'hover:scale-110'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={selectedColor}
                  onChange={e => setSelectedColor(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border border-gray-300"
                />
                <span className="text-xs text-gray-400">Personalizado</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-lg hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2.5 rounded-lg flex items-center justify-center">
              {loading
                ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : isEdit ? 'Guardar' : 'Crear categoría'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Categories() {
  const { household } = useAuth()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  const load = async () => {
    setLoading(true)
    const { data } = await getCategories(household.id)
    setCategories(data || [])
    setLoading(false)
  }

  useEffect(() => { if (household) load() }, [household])

  const handleDelete = async () => {
    await deleteCategory(deleteId)
    setDeleteId(null)
    load()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categorías</h1>
          <p className="text-gray-500 text-sm">{categories.length} categorías</p>
        </div>
        <button
          onClick={() => setModal('new')}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus size={18} /> Nueva categoría
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <Tag size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-700 font-semibold">No hay categorías</p>
          <p className="text-gray-400 text-sm mt-1">Crea categorías para organizar tus gastos</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {categories.map(cat => (
            <div key={cat.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4 group">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl flex-shrink-0"
                style={{ backgroundColor: cat.color }}
              >
                {ICONS.find(i => i.value === cat.icon)?.label.split(' ')[0] || '🏷️'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{cat.name}</p>
                <p className="text-xs text-gray-400">{cat.color}</p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setModal(cat)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => setDeleteId(cat.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <CategoryModal
          category={modal === 'new' ? null : modal}
          householdId={household.id}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }}
        />
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
            <p className="text-4xl mb-3">🗑️</p>
            <h3 className="text-lg font-bold text-gray-900 mb-2">¿Eliminar categoría?</h3>
            <p className="text-gray-500 text-sm mb-6">Los gastos asociados quedarán sin categoría.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-lg hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={handleDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-lg">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
