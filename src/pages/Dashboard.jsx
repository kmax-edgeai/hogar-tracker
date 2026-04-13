import { useState, useEffect, useMemo } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, Users } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getExpenses, getCategories, getBudgets, getHouseholdMembers } from '../lib/supabase'

const CURRENCIES = ['USD', 'PEN', 'EUR', 'Todas']

function StatCard({ title, value, subtitle, icon: Icon, color = 'blue', trend }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600',
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon size={20} />
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-medium flex items-center gap-1 ${trend >= 0 ? 'text-red-500' : 'text-green-500'}`}>
            {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm font-medium text-gray-700 mt-0.5">{title}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
  )
}

function BudgetAlert({ budget, spent }) {
  const pct = Math.round((spent / budget.amount) * 100)
  const over = spent > budget.amount
  if (pct < 80) return null
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg text-sm ${over ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'}`}>
      <AlertTriangle size={16} className={over ? 'text-red-500 mt-0.5 flex-shrink-0' : 'text-yellow-500 mt-0.5 flex-shrink-0'} />
      <div>
        <p className={`font-semibold ${over ? 'text-red-700' : 'text-yellow-700'}`}>
          {over ? '⚠️ Presupuesto excedido' : '🟡 Cerca del límite'} — {budget.categories?.name}
        </p>
        <p className={over ? 'text-red-600' : 'text-yellow-600'}>
          Gastado: {budget.currency} {spent.toFixed(2)} / {budget.currency} {budget.amount} ({pct}%)
        </p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { household } = useAuth()
  const [expenses, setExpenses] = useState([])
  const [categories, setCategories] = useState([])
  const [budgets, setBudgets] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [currency, setCurrency] = useState('USD')
  const [monthsBack, setMonthsBack] = useState(3)

  useEffect(() => {
    if (!household) return
    const load = async () => {
      setLoading(true)
      const dateFrom = format(subMonths(startOfMonth(new Date()), monthsBack - 1), 'yyyy-MM-dd')
      const [exp, cats, bud, mem] = await Promise.all([
        getExpenses(household.id, { date_from: dateFrom }),
        getCategories(household.id),
        getBudgets(household.id, format(startOfMonth(new Date()), 'yyyy-MM-dd')),
        getHouseholdMembers(household.id),
      ])
      setExpenses(exp.data || [])
      setCategories(cats.data || [])
      setBudgets(bud.data || [])
      setMembers(mem.data || [])
      setLoading(false)
    }
    load()
  }, [household, monthsBack])

  const filteredExpenses = useMemo(() =>
    currency === 'Todas' ? expenses : expenses.filter(e => e.currency === currency),
    [expenses, currency]
  )

  const currentMonth = format(new Date(), 'yyyy-MM')
  const currentMonthExpenses = filteredExpenses.filter(e =>
    e.expense_date.startsWith(currentMonth)
  )

  const totalCurrentMonth = currentMonthExpenses.reduce((s, e) => s + Number(e.amount), 0)
  const prevMonthStr = format(subMonths(new Date(), 1), 'yyyy-MM')
  const prevMonthTotal = filteredExpenses
    .filter(e => e.expense_date.startsWith(prevMonthStr))
    .reduce((s, e) => s + Number(e.amount), 0)
  const trend = prevMonthTotal > 0
    ? Math.round(((totalCurrentMonth - prevMonthTotal) / prevMonthTotal) * 100)
    : 0

  // By category (current month)
  const byCategoryData = useMemo(() => {
    const map = {}
    currentMonthExpenses.forEach(e => {
      const name = e.categories?.name || 'Sin categoría'
      const color = e.categories?.color || '#94a3b8'
      map[name] = map[name] || { name, value: 0, color }
      map[name].value += Number(e.amount)
    })
    return Object.values(map).sort((a, b) => b.value - a.value).slice(0, 8)
  }, [currentMonthExpenses])

  // By month (line chart)
  const byMonthData = useMemo(() => {
    const map = {}
    filteredExpenses.forEach(e => {
      const m = e.expense_date.slice(0, 7)
      map[m] = (map[m] || 0) + Number(e.amount)
    })
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, total]) => ({
        month: format(parseISO(month + '-01'), 'MMM yy', { locale: es }),
        total: Number(total.toFixed(2)),
      }))
  }, [filteredExpenses])

  // By person (current month)
  const byPersonData = useMemo(() => {
    const map = {}
    currentMonthExpenses.forEach(e => {
      const name = e.profiles?.full_name || 'Desconocido'
      map[name] = (map[name] || 0) + Number(e.amount)
    })
    return Object.entries(map).map(([name, total]) => ({ name, total: Number(total.toFixed(2)) }))
  }, [currentMonthExpenses])

  // Budget alerts
  const budgetAlerts = useMemo(() => {
    return budgets
      .filter(b => currency === 'Todas' || b.currency === currency)
      .map(b => {
        const spent = currentMonthExpenses
          .filter(e => e.category_id === b.category_id && (currency === 'Todas' || e.currency === b.currency))
          .reduce((s, e) => s + Number(e.amount), 0)
        return { budget: b, spent }
      })
      .filter(({ budget, spent }) => spent / budget.amount >= 0.8)
  }, [budgets, currentMonthExpenses, currency])

  const symb = currency === 'Todas' ? '' : currency + ' '

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm">{format(new Date(), "MMMM yyyy", { locale: es })}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            value={currency}
            onChange={e => setCurrency(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {CURRENCIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <select
            value={monthsBack}
            onChange={e => setMonthsBack(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={1}>Este mes</option>
            <option value={3}>Últimos 3 meses</option>
            <option value={6}>Últimos 6 meses</option>
            <option value={12}>Último año</option>
          </select>
        </div>
      </div>

      {/* Budget Alerts */}
      {budgetAlerts.length > 0 && (
        <div className="space-y-2">
          {budgetAlerts.map(({ budget, spent }) => (
            <BudgetAlert key={budget.id} budget={budget} spent={spent} />
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Gasto este mes"
          value={`${symb}${totalCurrentMonth.toFixed(2)}`}
          subtitle={`vs ${symb}${prevMonthTotal.toFixed(2)} mes anterior`}
          icon={DollarSign}
          color="blue"
          trend={trend}
        />
        <StatCard
          title="Transacciones"
          value={currentMonthExpenses.length}
          subtitle="este mes"
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          title="Categorías activas"
          value={byCategoryData.length}
          subtitle="con gastos este mes"
          icon={TrendingDown}
          color="purple"
        />
        <StatCard
          title="Miembros del hogar"
          value={members.length}
          subtitle={household?.name}
          icon={Users}
          color="yellow"
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending over time */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Gastos por mes</h3>
          {byMonthData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={byMonthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={v => `${symb}${v}`} />
                <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
              Sin datos en el período seleccionado
            </div>
          )}
        </div>

        {/* By category pie */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Gastos por categoría (mes actual)</h3>
          {byCategoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={byCategoryData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {byCategoryData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={v => `${symb}${Number(v).toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
              Sin gastos este mes
            </div>
          )}
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By person */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Gastos por persona (mes actual)</h3>
          {byPersonData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byPersonData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
                <Tooltip formatter={v => `${symb}${v}`} />
                <Bar dataKey="total" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
              Sin datos este mes
            </div>
          )}
        </div>

        {/* Category breakdown bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Top categorías (mes actual)</h3>
          {byCategoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byCategoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={v => `${symb}${Number(v).toFixed(2)}`} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {byCategoryData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
              Sin datos este mes
            </div>
          )}
        </div>
      </div>

      {/* Budget progress */}
      {budgets.filter(b => currency === 'Todas' || b.currency === currency).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Progreso de presupuestos (mes actual)</h3>
          <div className="space-y-4">
            {budgets
              .filter(b => currency === 'Todas' || b.currency === currency)
              .map(b => {
                const spent = currentMonthExpenses
                  .filter(e => e.category_id === b.category_id)
                  .reduce((s, e) => s + Number(e.amount), 0)
                const pct = Math.min((spent / b.amount) * 100, 100)
                const over = spent > b.amount
                return (
                  <div key={b.id}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium text-gray-700">{b.categories?.name || '—'}</span>
                      <span className={`font-semibold ${over ? 'text-red-600' : 'text-gray-700'}`}>
                        {b.currency} {spent.toFixed(2)} / {b.amount}
                      </span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${over ? 'bg-red-500' : pct > 80 ? 'bg-yellow-400' : 'bg-green-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}
