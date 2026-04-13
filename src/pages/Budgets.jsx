import { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { format, startOfMonth, parseISO, subMonths, addMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { Plus, Edit2, Trash2, X, PiggyBank, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getCategories, getBudgets, upsertBudget, deleteBudget, getExpenses } from '../lib/supabase'

const CURRENCIES = ['USD', 'PEN', 'EUR', 'COP', 'MXN', 'ARS', 'CLP']

function BudgetModal({ budget, categories, householdId, currentMonth, onClose, onSaved }) {
  const isEdit = !!budget
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: isEdit ? {
      category_id: budget.category_id,
      currency: budget.currency,
      amount: budget.amount,
    } : {
      currency: 'USD',
    }
  })

  const onSubmit = async (data) => {
    setError('')
    setLoading(true)
    const payload = {
      ...data,
      amount: Number(data.amount),
      household_id: householdId,
      month: currentMonth,
      ...(isEdit && { id: budget.id }),
    }
    const { error: err } = await upsertBudget(payload)
    setLoading(false)
    if (err) setError(err.message)
    else onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">{isEdit ? 'Editar presupuesto' : 'Nuevo presupuesto'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
            <select
              {...register('category_id', { required: 'Selecciona una categoría' })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar categoría</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {errors.category_id && <p className="text-red-500 text-xs mt-1">{errors.category_id.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Moneda *</label>
              <select
                {...register('currency', { required: true })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CURRENCIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto límite *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                {...register('amount', { required: 'Requerido', min: { value: 0.01, message: 'Debe ser positivo' } })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
              {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
            </div>
          </div>

          <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
            📅 Este presupuesto aplica para: <strong>{format(parseISO(currentMonth), 'MMMM yyyy', { locale: es })}</strong>
          </p>

          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-lg hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2.5 rounded-lg flex items-center justify-center">
              {loading
                ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : isEdit ? 'Guardar' : 'Crear presupuesto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Budgets() {
  const { household } = useAuth()
  const [selectedMonth, setSelectedMonth] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [categories, setCategories] = useState([])
  const [budgets, setBudgets] = useState([])
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  const load = async () => {
    setLoading(true)
    const [cats, buds, exps] = await Promise.all([
      getCategories(household.id),
      getBudgets(household.id, selectedMonth),
      getExpenses(household.id, {
        date_from: selectedMonth,
        date_to: format(new Date(selectedMonth.slice(0,7) + '-28'), 'yyyy-MM-') + '31',
      }),
    ])
    setCategories(cats.data || [])
    setBudgets(buds.data || [])
    setExpenses(exps.data || [])
    setLoading(false)
  }

  useEffect(() => { if (household) load() }, [household, selectedMonth])

  const budgetsWithSpent = useMemo(() =>
    budgets.map(b => {
      const monthStr = selectedMonth.slice(0, 7)
      const spent = expenses
        .filter(e =>
          e.category_id === b.category_id &&
          e.currency === b.currency &&
          e.expense_date.startsWith(monthStr)
        )
        .reduce((s, e) => s + Number(e.amount), 0)
      const pct = Math.min((spent / b.amount) * 100, 100)
      const over = spent > b.amount
      return { ...b, spent, pct, over }
    }),
    [budgets, expenses, selectedMonth]
  )

  const prevMonth = () => setSelectedMonth(format(subMonths(parseISO(selectedMonth), 1), 'yyyy-MM-dd'))
  const nextMonth = () => setSelectedMonth(format(addMonths(parseISO(selectedMonth), 1), 'yyyy-MM-dd'))

  const handleDelete = async () => {
    await deleteBudget(deleteId)
    setDeleteId(null)
    load()
  }

  const alertCount = budgetsWithSpent.filter(b => b.pct >= 80).length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Presupuestos</h1>
          <p className="text-gray-500 text-sm">
            {budgets.length} presupuesto{budgets.length !== 1 ? 's' : ''}
            {alertCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-yellow-600 font-medium">
                <AlertTriangle size={13} /> {alertCount} alerta{alertCount > 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => setModal('new')}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-lg transition-colors self-start sm:self-auto"
        >
          <Plus size={18} /> Nuevo presupuesto
        </button>
      </div>

      {/* Month navigation */}
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between max-w-sm">
        <button onClick={prevMonth} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronLeft size={18} />
        </button>
        <span className="font-semibold text-gray-900 capitalize">
          {format(parseISO(selectedMonth), 'MMMM yyyy', { locale: es })}
        </span>
        <button onClick={nextMonth} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronRight size={18} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : budgetsWithSpent.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <PiggyBank size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-700 font-semibold">Sin presupuestos este mes</p>
          <p className="text-gray-400 text-sm mt-1">Crea presupuestos para controlar tus gastos por categoría</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgetsWithSpent.map(b => (
            <div
              key={b.id}
              className={`bg-white rounded-xl border p-5 ${b.over ? 'border-red-300 bg-red-50/30' : b.pct >= 80 ? 'border-yellow-300 bg-yellow-50/30' : 'border-gray-200'}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-lg flex-shrink-0"
                    style={{ backgroundColor: b.categories?.color || '#94a3b8' }}
                  />
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{b.categories?.name || '—'}</p>
                    <p className="text-xs text-gray-400">{b.currency}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  {b.over && <AlertTriangle size={16} className="text-red-500" />}
                  {!b.over && b.pct >= 80 && <AlertTriangle size={16} className="text-yellow-500" />}
                  <button onClick={() => setModal(b)} className="p-1 text-gray-300 hover:text-blue-600 transition-colors">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => setDeleteId(b.id)} className="p-1 text-gray-300 hover:text-red-600 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                  <span>Gastado</span>
                  <span className={b.over ? 'text-red-600 font-semibold' : ''}>{Math.round(b.pct)}%</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${b.over ? 'bg-red-500' : b.pct >= 80 ? 'bg-yellow-400' : 'bg-green-500'}`}
                    style={{ width: `${b.pct}%` }}
                  />
                </div>
              </div>

              <div className="flex justify-between text-sm">
                <div>
                  <p className="text-xs text-gray-400">Gastado</p>
                  <p className={`font-semibold ${b.over ? 'text-red-600' : 'text-gray-900'}`}>
                    {b.currency} {b.spent.toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Presupuesto</p>
                  <p className="font-semibold text-gray-900">{b.currency} {Number(b.amount).toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Disponible</p>
                  <p className={`font-semibold ${b.over ? 'text-red-600' : 'text-green-600'}`}>
                    {b.over ? '-' : ''}{b.currency} {Math.abs(b.amount - b.spent).toFixed(2)}
                  </p>
                </div>
              </div>

              {b.over && (
                <p className="text-xs text-red-600 font-medium mt-3 bg-red-100 rounded-lg px-2 py-1.5 text-center">
                  ⚠️ Excedido por {b.currency} {(b.spent - b.amount).toFixed(2)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {modal && (
        <BudgetModal
          budget={modal === 'new' ? null : modal}
          categories={categories}
          householdId={household.id}
          currentMonth={selectedMonth}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }}
        />
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
            <p className="text-4xl mb-3">🗑️</p>
            <h3 className="text-lg font-bold text-gray-900 mb-2">¿Eliminar presupuesto?</h3>
            <p className="text-gray-500 text-sm mb-6">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={handleDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-lg">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
