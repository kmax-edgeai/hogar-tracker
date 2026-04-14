import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.\n' +
    'Crea un archivo .env.local con esas variables.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ─── Auth helpers ──────────────────────────────────────────────────────────

export const signUp = (email, password, fullName) =>
  supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  })

export const signIn = (email, password) =>
  supabase.auth.signInWithPassword({ email, password })

export const signOut = () => supabase.auth.signOut()

export const resetPassword = (email) =>
  supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/hogar-tracker/reset-password`,
  })

export const updatePassword = (newPassword) =>
  supabase.auth.updateUser({ password: newPassword })

// ─── Profile helpers ────────────────────────────────────────────────────────

export const getProfile = (userId) =>
  supabase
    .from('profiles')
    .select('*, households(*)')
    .eq('id', userId)
    .single()

export const updateProfile = (userId, data) =>
  supabase.from('profiles').update(data).eq('id', userId)

// ─── Household helpers ──────────────────────────────────────────────────────

export const createHousehold = async (name) => {
  const { data, error } = await supabase.rpc('create_household', {
    household_name: name,
  })
  if (error) return { error }
  return { data }
}

export const joinHousehold = async (inviteCode) => {
  const { data, error } = await supabase.rpc('join_household', {
    invite: inviteCode.toUpperCase(),
  })
  if (error) return { error: new Error(error.message) }
  return { data }
}

export const getHouseholdMembers = (householdId) =>
  supabase
    .from('profiles')
    .select('id, full_name, avatar_url, created_at')
    .eq('household_id', householdId)

// ─── Category helpers ────────────────────────────────────────────────────────

export const getCategories = (householdId) =>
  supabase
    .from('categories')
    .select('*')
    .eq('household_id', householdId)
    .order('name')

export const createCategory = (data) =>
  supabase.from('categories').insert(data).select().single()

export const updateCategory = (id, data) =>
  supabase.from('categories').update(data).eq('id', id).select().single()

export const deleteCategory = (id) =>
  supabase.from('categories').delete().eq('id', id)

// ─── Expense helpers ─────────────────────────────────────────────────────────

export const getExpenses = (householdId, filters = {}) => {
  let query = supabase
    .from('expenses')
    .select('*, categories(id, name, color, icon), profiles(id, full_name)')
    .eq('household_id', householdId)
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (filters.category_id) query = query.eq('category_id', filters.category_id)
  if (filters.currency) query = query.eq('currency', filters.currency)
  if (filters.user_id) query = query.eq('user_id', filters.user_id)
  if (filters.establishment) query = query.ilike('establishment', `%${filters.establishment}%`)
  if (filters.date_from) query = query.gte('expense_date', filters.date_from)
  if (filters.date_to) query = query.lte('expense_date', filters.date_to)

  return query
}

export const createExpense = (data) =>
  supabase.from('expenses').insert(data).select().single()

export const updateExpense = (id, data) =>
  supabase.from('expenses').update(data).eq('id', id).select().single()

export const deleteExpense = (id) =>
  supabase.from('expenses').delete().eq('id', id)

// ─── Budget helpers ──────────────────────────────────────────────────────────

export const getBudgets = (householdId, month) => {
  let query = supabase
    .from('budgets')
    .select('*, categories(id, name, color, icon)')
    .eq('household_id', householdId)
  if (month) query = query.eq('month', month)
  return query
}

export const upsertBudget = (data) =>
  supabase
    .from('budgets')
    .upsert(data, { onConflict: 'household_id,category_id,currency,month' })
    .select()
    .single()

export const deleteBudget = (id) =>
  supabase.from('budgets').delete().eq('id', id)

export const uploadReceipt = async (file, expenseId) => {
  const ext = file.name.split('.').pop()
  const path = `${expenseId}-${Date.now()}.${ext}`
  const { error } = await supabase.storage
    .from('receipts')
    .upload(path, file, { upsert: true })
  if (error) return { error }
  const { data } = supabase.storage.from('receipts').getPublicUrl(path)
  return { url: data.publicUrl }
}