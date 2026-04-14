import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'

// Auth pages — pequeñas, carga inmediata
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'

// App pages — lazy loaded (chunk separado por página)
const Dashboard  = lazy(() => import('./pages/Dashboard'))
const Expenses   = lazy(() => import('./pages/Expenses'))
const Categories = lazy(() => import('./pages/Categories'))
const Budgets    = lazy(() => import('./pages/Budgets'))
const Household  = lazy(() => import('./pages/Household'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public auth routes */}
      <Route path="/login"           element={<Login />} />
      <Route path="/register"        element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password"  element={<ResetPassword />} />

      {/* Protected app routes — cada página es un chunk independiente */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <Dashboard />
            </Suspense>
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/expenses" element={
        <ProtectedRoute>
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <Expenses />
            </Suspense>
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/categories" element={
        <ProtectedRoute>
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <Categories />
            </Suspense>
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/budgets" element={
        <ProtectedRoute>
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <Budgets />
            </Suspense>
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/household" element={
        <ProtectedRoute>
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <Household />
            </Suspense>
          </Layout>
        </ProtectedRoute>
      } />

      {/* Fallback */}
      <Route path="/"  element={<Navigate to="/dashboard" replace />} />
      <Route path="*"  element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter basename="/hogar-tracker">
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
