import { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
import { Plus, Search, Edit2, Trash2, X, Filter, ChevronDown, Paperclip, FileText, Eye } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import {
  getExpenses, createExpense, updateExpense, deleteExpense,
  getCategories, getHouseholdMembers,
  uploadReceipt, deleteReceipt, getReceiptPublicUrl,
} from '../lib/supabase'

const CURRENCIES = ['USD', 'PEN', 'EUR', 'COP', 'MXN', 'ARS', 'CLP']

const RECEIPT_MAX_BYTES = 5 * 1024 * 1024
const RECEIPT_ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf'

function ExpenseModal({ expense, categories, householdId, userId, onClose, onSaved }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [receiptFile, setReceiptFile] = useState(null)
  const [receiptPreview, setReceiptPreview] = useState(null)
  const [removeReceipt, setRemoveReceipt] = useState(false)
  const isEdit = !!expense

  const existingReceiptUrl = isEdit && expense.receipt_url
    ? getReceiptPublicUrl(expense.receipt_url)
    : null

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: isEdit ? {
      item: expense.item,
      establishment: expense.establishment,
      category_id: expense.category_id || '',
      description: expense.description || '',
      currency: expense.currency,
      amount: expense.amount,
      expense_date: expense.expense_date,
    } : {
      currency: 'USD',
      expense_date: format(new Date(), 'yyyy-MM-dd'),
    }
  })

  const handleReceiptChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!RECEIPT_ACCEPT.includes(file.type)) {
      setError('Tipo no permitido. Usa JPG, PNG, WEBP o PDF.')
      return
    }
    if (file.size > RECEIPT_MAX_BYTES) {
      setError('El archivo no puede superar 5 MB.')
      return
    }
    setError('')
    setReceiptFile(file)
    setRemoveReceipt(false)
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (ev) => setReceiptPreview(ev.target.result)
      reader.readAsDataURL(file)
    } else {
      setReceiptPreview(null)
    }
  }

  const handleClearReceipt = () => {
    setReceiptFile(null)
    setReceiptPreview(null)
    setRemoveReceipt(true)
  }

  const onSubmit = async (data) => {
    setError('')
    setLoading(true)
    const payload = {
      ...data,
      amount: Number(data.amount),
      category_id: data.category_id || null,
      household_id: householdId,
      user_id: userId,
    }

    let expenseId = expense?.id

    if (isEdit) {
      const { error: err } = await updateExpense(expenseId, payload)
      if (err) { setError(err.message); setLoading(false); return }
    } else {
      const { data: created, error: err } = await createExpense(payload)
      if (err) { setError(err.message); setLoading(false); return }
      expenseId = created.id
    }

    if (receiptFile) {
      if (isEdit && expense.receipt_url) await deleteReceipt(expense.receipt_url)
      const { data: rd, error: uploadErr } = await uploadReceipt(receiptFile, householdId, expenseId)
      if (uploadErr) {
        setError('Gasto guardado, pero error al subir recibo: ' + uploadErr.message)
        setLoading(false)
        onSaved()
        return
      }
      await updateExpense(expenseId, { receipt_url: rd.path })
    } else if (removeReceipt && isEdit && expense.receipt_url) {
      await deleteReceipt(expense.receipt_url)
      await updateExpense(expenseId, { receipt_url: null })
    }

    setLoading(false)
    onSaved()
  }

  const showUploadZone = !receiptFile && (!existingReceiptUrl || removeReceipt)

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">{isEdit ? 'Editar gasto' : 'Nuevo gasto'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Ítem / Descripción corta *</label>
              <input
                {...register('item', { required: 'Requerido' })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Compra supermercado"
              />
              {errors.item && <p className="text-red-500 text-xs mt-1">{errors.item.message}</p>}
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Establecimiento *</label>
              <input
                {...register('establishment', { required: 'Requerido' })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Wong, Plaza Vea..."
              />
              {errors.establishment && <p className="text-red-500 text-xs mt-1">{errors.establishment.message}</p>}
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
              <select
                {...register('category_id')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sin categoría</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Moneda *</label>
              <select
                {...register('currency', { required: 'Requerido' })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CURRENCIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                {...register('amount', {
                  required: 'Requerido',
                  min: { value: 0.01, message: 'Debe ser positivo' }
                })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
              {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
              <input
                type="date"
                {...register('expense_date', { required: 'Requerido' })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción opcional</label>
              <textarea
                {...register('description')}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Notas adicionales..."
              />
            </div>

            {/* ── Recibo ─────────────────────────────────────────── */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Recibo / Comprobante</label>

              {/* Recibo existente (edición) */}
              {existingReceiptUrl && !removeReceipt && !receiptFile && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-lg mb-2">
                  <FileText size={16} className="text-emerald-600 flex-shrink-0" />
                  <span className="text-sm text-emerald-700 flex-1 truncate">Recibo adjunto</span>
                  <a href={existingReceiptUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium">
                    <Eye size={12} /> Ver
                  </a>
                  <button type="button" onClick={handleClearReceipt}
                    className="text-xs text-red-500 hover:text-red-700 font-medium">
                    Eliminar
                  </button>
                </div>
              )}

              {/* Archivo nuevo seleccionado */}
              {receiptFile && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-lg mb-2">
                  {receiptPreview
                    ? <img src={receiptPreview} alt="preview" className="w-9 h-9 object-cover rounded flex-shrink-0" />
                    : <FileText size={16} className="text-blue-600 flex-shrink-0" />
                  }
                  <span className="text-sm text-blue-700 flex-1 truncate">{receiptFile.name}</span>
                  <button type="button" onClick={handleClearReceipt}
                    className="text-xs text-red-500 hover:text-red-700 font-medium">
                    Quitar
                  </button>
                </div>
              )}

              {/* Zona de carga */}
              {showUploadZone && (
                <label className="flex flex-col items-center gap-1.5 px-4 py-5 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                  <Paperclip size={20} className="text-gray-400" />
                  <span className="text-sm text-gray-500 text-center">
                    Adjuntar recibo<br />
                    <span className="text-xs text-gray-400">JPG, PNG, WEBP o PDF · máx. 5 MB</span>
                  </span>
                  <input type="file" className="hidden" accept={RECEIPT_ACCEPT}
                    onChange={handleReceiptChange} />
                </label>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center">
              {loading
                ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : isEdit ? 'Guardar cambios' : 'Agregar gasto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Expenses() {
  const { household, user } = useAuth()
  const [expenses, setExpenses] = useState([])
  const [categories, setCategories] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | 'new' | expense object
  const [deleteId, setDeleteId] = useState(null)
  const [showFilters, setShowFilters] = useState(false)

  const [filters, setFilters] = useState({
    search: '',
    category_id: '',
    currency: '',
    user_id: '',
    establishment: '',
    date_from: '',
    date_to: '',
  })

  const load = async () => {
    setLoading(true)
    const [exp, cats, mem] = await Promise.all([
      getExpenses(household.id),
      getCategories(household.id),
      getHouseholdMembers(household.id),
    ])
    setExpenses(exp.data || [])
    setCategories(cats.data || [])
    setMembers(mem.data || [])
    setLoading(false)
  }

  useEffect(() => { if (household) load() }, [household])

  const filtered = useMemo(() => {
    return expenses.filter(e => {
      if (filters.search && !e.item.toLowerCase().includes(filters.search.toLowerCase()) &&
          !e.establishment.toLowerCase().includes(filters.search.toLowerCase())) return false
      if (filters.category_id && e.category_id !== filters.category_id) return false
      if (filters.currency && e.currency !== filters.currency) return false
      if (filters.user_id && e.user_id !== filters.user_id) return false
      if (filters.establishment && !e.establishment.toLowerCase().includes(filters.establishment.toLowerCase())) return false
      if (filters.date_from && e.expense_date < filters.date_from) return false
      if (filters.date_to && e.expense_date > filters.date_to) return false
      return true
    })
  }, [expenses, filters])

  const handleDelete = async () => {
    if (!deleteId) return
    const expenseToDelete = expenses.find(e => e.id === deleteId)
    if (expenseToDelete?.receipt_url) await deleteReceipt(expenseToDelete.receipt_url)
    await deleteExpense(deleteId)
    setDeleteId(null)
    load()
  }

  const handleSaved = () => {
    setModal(null)
    load()
  }

  const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val }))
  const clearFilters = () => setFilters({ search: '', category_id: '', currency: '', user_id: '', establishment: '', date_from: '', date_to: '' })
  const hasFilters = Object.values(filters).some(Boolean)

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gastos</h1>
          <p className="text-gray-500 text-sm">{filtered.length} registros</p>
        </div>
        <button
          onClick={() => setModal('new')}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-lg transition-colors self-start sm:self-auto"
        >
          <Plus size={18} /> Agregar gasto
        </button>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={filters.search}
              onChange={e => setFilter('search', e.target.value)}
              placeholder="Buscar por ítem o establecimiento..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${hasFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
          >
            <Filter size={15} /> Filtros {hasFilters && <span className="bg-blue-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{Object.values(filters).filter(Boolean).length - (filters.search ? 1 : 0)}</span>}
            <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          {hasFilters && (
            <button onClick={clearFilters} className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
              Limpiar
            </button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-1">
            <select value={filters.category_id} onChange={e => setFilter('category_id', e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Todas las categorías</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={filters.currency} onChange={e => setFilter('currency', e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Todas las monedas</option>
              {CURRENCIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <select value={filters.user_id} onChange={e => setFilter('user_id', e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Todas las personas</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            </select>
            <div className="flex gap-1.5">
              <input type="date" value={filters.date_from} onChange={e => setFilter('date_from', e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input type="date" value={filters.date_to} onChange={e => setFilter('date_to', e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <p className="text-4xl mb-3">💸</p>
          <p className="text-gray-700 font-semibold">No hay gastos registrados</p>
          <p className="text-gray-400 text-sm mt-1">Haz clic en "Agregar gasto" para empezar</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ítem</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Establecimiento</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Categoría</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Persona</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Monto</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{e.expense_date}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium text-gray-900">{e.item}</p>
                        {e.receipt_url && (
                          <a href={getReceiptPublicUrl(e.receipt_url)} target="_blank" rel="noopener noreferrer"
                            title="Ver recibo"
                            className="text-gray-400 hover:text-blue-600 transition-colors flex-shrink-0">
                            <Paperclip size={13} />
                          </a>
                        )}
                      </div>
                      {e.description && <p className="text-xs text-gray-400 truncate max-w-xs">{e.description}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{e.establishment}</td>
                    <td className="px-4 py-3">
                      {e.categories ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: e.categories.color }}>
                          {e.categories.name}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {e.profiles?.full_name || '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold text-gray-900">{e.currency} {Number(e.amount).toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => setModal(e)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => setDeleteId(e.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-gray-100">
            {filtered.map(e => (
              <div key={e.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-gray-900 truncate">{e.item}</p>
                      {e.receipt_url && (
                        <a href={getReceiptPublicUrl(e.receipt_url)} target="_blank" rel="noopener noreferrer"
                          title="Ver recibo"
                          className="text-gray-400 hover:text-blue-600 transition-colors flex-shrink-0">
                          <Paperclip size={13} />
                        </a>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{e.establishment} · {e.expense_date}</p>
                    {e.categories && (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: e.categories.color }}>
                        {e.categories.name}
                      </span>
                    )}
                  </div>
                  <div className="text-right ml-3">
                    <p className="font-bold text-gray-900">{e.currency} {Number(e.amount).toFixed(2)}</p>
                    <div className="flex gap-1 mt-1 justify-end">
                      <button onClick={() => setModal(e)} className="p-1.5 text-gray-400 hover:text-blue-600"><Edit2 size={14} /></button>
                      <button onClick={() => setDeleteId(e.id)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expense modal */}
      {modal && (
        <ExpenseModal
          expense={modal === 'new' ? null : modal}
          categories={categories}
          householdId={household.id}
          userId={user.id}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
            <p className="text-4xl mb-3">🗑️</p>
            <h3 className="text-lg font-bold text-gray-900 mb-2">¿Eliminar gasto?</h3>
            <p className="text-gray-500 text-sm mb-6">Esta acción no se puede deshacer.</p>
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
