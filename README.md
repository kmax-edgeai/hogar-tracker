# 🏠 HogarTracker

Aplicación web para el control de gastos del hogar en familia. Desplegada como página estática en GitHub Pages con Supabase como backend.

## ✨ Funcionalidades

- **Autenticación completa** — registro, login, recuperación de contraseña
- **Hogares** — crear un hogar o unirse con código de invitación
- **Gastos** — registrar gastos con ítem, establecimiento, categoría, moneda, monto y fecha
- **Categorías** — crear categorías personalizadas con color e ícono
- **Presupuestos mensuales** — límites por categoría con alertas visuales al 80% y al exceder
- **Dashboard analítico** — gráficas de gastos por mes, por categoría, por persona; filtros por moneda y período
- **Multi-moneda** — soporte para USD, PEN, EUR y más

---

## 🚀 Guía de despliegue paso a paso

### Paso 1 — Crear proyecto en Supabase

1. Ve a [https://app.supabase.com](https://app.supabase.com) y crea una cuenta gratuita
2. Haz clic en **New Project** y completa el nombre y contraseña de la base de datos
3. Espera ~2 minutos a que el proyecto esté listo
4. Ve a **SQL Editor** (menú izquierdo) y pega el contenido de `src/lib/schema.sql`
5. Haz clic en **Run** — esto crea todas las tablas y configuraciones de seguridad
6. Ve a **Settings → API** y copia:
   - `Project URL` → es tu `VITE_SUPABASE_URL`
   - `anon public` key → es tu `VITE_SUPABASE_ANON_KEY`

### Paso 2 — Crear repositorio en GitHub

1. Ve a [https://github.com/new](https://github.com/new)
2. Nombre del repositorio: **`hogar-tracker`** (importante: debe coincidir con `base` en `vite.config.js`)
3. Déjalo como **Public** (requerido para GitHub Pages gratuito)
4. Haz clic en **Create repository**

### Paso 3 — Subir el código

```bash
cd hogar-tracker
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/hogar-tracker.git
git push -u origin main
```

### Paso 4 — Configurar GitHub Secrets

1. En tu repositorio GitHub, ve a **Settings → Secrets and variables → Actions**
2. Crea estos dos secrets haciendo clic en **New repository secret**:

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGci...` |

### Paso 5 — Activar GitHub Pages

1. Ve a **Settings → Pages**
2. En **Source**, selecciona **GitHub Actions**
3. ¡Listo! GitHub Actions construirá y desplegará automáticamente

### Paso 6 — Configurar URL de recuperación de contraseña en Supabase

1. Ve a tu proyecto Supabase → **Authentication → URL Configuration**
2. En **Site URL**, pon: `https://TU_USUARIO.github.io/hogar-tracker`
3. En **Redirect URLs**, agrega: `https://TU_USUARIO.github.io/hogar-tracker/reset-password`

---

## 💻 Desarrollo local

```bash
# 1. Instalar dependencias
npm install

# 2. Crear archivo de configuración
cp .env.example .env.local
# Edita .env.local con tus credenciales de Supabase

# 3. Iniciar servidor de desarrollo
npm run dev
```

La app estará disponible en `http://localhost:5173/hogar-tracker/`

---

## 📁 Estructura del proyecto

```
hogar-tracker/
├── .github/workflows/deploy.yml   # GitHub Actions (deploy automático)
├── src/
│   ├── lib/
│   │   ├── supabase.js            # Cliente y helpers de Supabase
│   │   └── schema.sql             # Schema de la base de datos
│   ├── contexts/
│   │   └── AuthContext.jsx        # Estado global de autenticación
│   ├── components/
│   │   ├── Layout.jsx             # Layout principal + setup de hogar
│   │   ├── Sidebar.jsx            # Navegación lateral
│   │   └── ProtectedRoute.jsx     # Guard de rutas privadas
│   ├── pages/
│   │   ├── auth/                  # Login, Register, ForgotPassword, ResetPassword
│   │   ├── Dashboard.jsx          # Analytics con gráficas
│   │   ├── Expenses.jsx           # CRUD de gastos con filtros
│   │   ├── Categories.jsx         # Gestión de categorías
│   │   ├── Budgets.jsx            # Presupuestos mensuales con alertas
│   │   └── Household.jsx          # Gestión del hogar y miembros
│   ├── App.jsx                    # Router principal
│   └── main.jsx                   # Entry point
├── .env.example                   # Variables de entorno de ejemplo
├── vite.config.js                 # Configuración de Vite (base path)
└── package.json
```

---

## ⚙️ Cambiar el nombre del repositorio

Si usas un nombre diferente a `hogar-tracker`, actualiza el `base` en `vite.config.js`:

```js
// vite.config.js
export default defineConfig({
  base: '/MI-REPO-NAME/',  // ← cambia esto
})
```

Y también en `src/App.jsx`:

```jsx
<BrowserRouter basename="/MI-REPO-NAME">
```

Y en `src/lib/supabase.js` (redirect URL de reset password):

```js
redirectTo: `${window.location.origin}/MI-REPO-NAME/reset-password`
```

---

## 🛡️ Seguridad

- Row Level Security (RLS) activado en todas las tablas
- Los usuarios solo pueden ver datos de su propio hogar
- Las claves de Supabase son seguras de exponer en el frontend (son claves `anon` con permisos limitados por RLS)
- Las contraseñas son manejadas completamente por Supabase Auth (no se almacenan en texto plano)

---

## 🤝 Agregar miembros al hogar

1. El primer miembro crea el hogar desde el setup inicial
2. Va a **Mi Hogar** y copia el **código de invitación** (8 caracteres)
3. Los demás miembros se registran y en el setup inicial eligen "Unirme con código"
4. Pegan el código y ¡listo! Verán todos los gastos compartidos
