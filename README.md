# Librería App — MVP con Supabase + React

Backend 100 % en **Supabase** (Postgres + RLS + Auth + Funciones).  
Frontend en **React 18 + Vite**. Sin servidor API intermedio.

## Estructura del proyecto

```
libreria-app/
├── frontend/                          # React app (Vite)
│   ├── src/
│   │   ├── main.jsx                   # Entry point (con providers)
│   │   ├── App.jsx                    # Layout + lazy loading de vistas
│   │   ├── index.css                  # Estilos globales (~720 líneas)
│   │   ├── setupTests.js              # Setup de Testing Library
│   │   ├── __tests__/                 # Tests (Vitest) — 38 tests, 5 suites
│   │   │   ├── cart.test.js           # Lógica de carrito (7)
│   │   │   ├── errors.test.js         # Traducción de errores (8)
│   │   │   ├── components.test.jsx    # Smoke tests de componentes (7)
│   │   │   ├── integration.test.jsx   # Tests de integración (9)
│   │   │   └── server.test.js         # Tests del servidor HTTP (7)
│   │   ├── lib/
│   │   │   ├── supabase.js            # Cliente Supabase + validación env vars
│   │   │   └── supabaseHelpers.js     # normalizeError, formatPrice, rpcCall, selectCall
│   │   ├── contexts/
│   │   │   ├── AuthContext.jsx         # Contexto de autenticación
│   │   │   └── CartContext.jsx         # Contexto de carrito (persistencia localStorage)
│   │   └── components/
│   │       ├── NavSidebar.jsx         # Navegación lateral
│   │       ├── AuthBar.jsx            # Barra superior + login/logout
│   │       ├── LoginModal.jsx         # Modal de inicio de sesión / registro
│   │       ├── Tienda.jsx             # Tienda + búsqueda full-text + paginación
│   │       ├── CarritoSidebar.jsx     # Carrito lateral + checkout
│   │       ├── MisOrdenes.jsx         # Historial de órdenes (lazy)
│   │       ├── AdminPanel.jsx         # Panel admin (libros + autores) (lazy)
│   │       ├── Skeleton.jsx           # Componentes de carga esqueleto
│   │       └── ErrorBoundary.jsx      # Captura de errores de React
│   ├── .env.example
│   ├── .env                           # Credenciales reales (ignorado por git)
│   ├── .eslintrc.cjs                  # ESLint + React + Hooks
│   ├── .prettierrc                    # Formateo de código
│   ├── package.json
│   └── vite.config.js                 # Vite + Vitest + coverage + alias @/
├── server.js                          # Servidor estático (producción) + CSP configurable
├── Dockerfile                         # Build multi-stage para producción
├── docker-compose.yml                 # Orquestación Docker
├── supabase/
│   ├── migrations/001_schema_clean.sql # Migración completa del backend
│   └── seed.sql                       # Datos de prueba
├── .dockerignore
├── .gitignore
└── README.md
```

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | React 18 + Vite 5 |
| Backend | Supabase (Postgres 15 + RLS) |
| Autenticación | Supabase Auth (email/password) |
| Búsqueda | Full-text search tsvector (español) con `plainto_tsquery` + índice GIN |
| API | Funciones Postgres + RLS (sin servidor HTTP intermedio) |
| Servidor producción | Node.js 18+ HTTP (solo archivos estáticos) |
| Tests | Vitest 4 + jsdom + @testing-library/react |
| Linter | ESLint 8 + React/Hooks + Prettier |

## Cómo funciona

El frontend se conecta **directamente** a Supabase sin ningún servidor intermedio:

```
[Navegador] ─── supabase-js ───> [Supabase Cloud]
                                        ├── Postgres (tablas, funciones, triggers)
                                        ├── Auth (JWT, email/password)
                                        └── RLS (seguridad a nivel fila)
```

### Flujo de datos

1. **Login/Registro** → `supabase.auth.signInWithPassword()` / `signUp()`
2. **Cada consulta** envía el JWT en el header `Authorization: Bearer <token>`
3. **RLS** evalúa `auth.uid()` contra cada fila — el usuario solo ve sus datos
4. **Funciones Postgres** (`realizar_checkout`, `buscar_libros`) ejecutan lógica del lado del servidor en una transacción atómica
5. **Triggers** (`tr_descontar_stock`, `tr_historial_inventario`) se disparan automáticamente

### Funciones Postgres

| Función | Descripción |
|---------|-------------|
| `realizar_checkout(p_direccion_envio)` | Toma `auth.uid()`, bloquea carrito con `FOR UPDATE`, lee carrito, calcula total, crea orden, inserta detalles, descuenta stock y limpia carrito. Todo en una transacción. Valida longitud de dirección. |
| `listar_libros_con_stock(p_limit, p_offset)` | JOIN entre libros, autores e inventario. Filtra `deleted_at IS NULL`. Soporta paginación. |
| `buscar_libros(p_query, p_limit, p_offset)` | Búsqueda full-text con `plainto_tsquery` + paginación. |
| `sincronizar_carrito(p_items)` | Reemplaza el carrito del usuario en una sola operación. |

### Triggers

| Trigger | Evento | Acción |
|---------|--------|--------|
| `tr_crear_inventario` | `AFTER INSERT ON libros` | Crea registro en inventario con stock = 0 |
| `tr_descontar_stock` | `AFTER INSERT ON orden_detalles` | Bloquea fila con `FOR UPDATE`, descuenta stock y lanza error si es insuficiente |
| `tr_historial_inventario` | `AFTER UPDATE ON inventario` | Registra cambio en `historial_inventario` con tipo (venta/ajuste) |

## Mejoras incluidas

- **Paginación** en tienda y búsqueda (12 libros por página)
- **Soft-delete** en libros y autores (`deleted_at`)
- **Checkout idempotente** con `SELECT FOR UPDATE` en carrito e inventario
- **Autenticación con registro** de nuevos usuarios vía email
- **Lazy loading** de vistas pesadas (AdminPanel, MisOrdenes)
- **Loading skeletons** animados en tienda y órdenes
- **Historial de inventario** automático con trigger
- **CSP estricto** configurable via `SUPABASE_URL`
- **Validación** de variables de entorno al arranque
- **Manejo unificado** de errores con `normalizeError()`

## Setup rápido

```bash
# 1. Backend — ejecutar en SQL Editor de Supabase:
#    supabase/migrations/001_schema_clean.sql
#    (opcional) supabase/seed.sql

# 2. Frontend — desarrollo
cd frontend
cp .env.example .env
# Editar .env con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
npm install
npm run dev                    # http://localhost:5173

# 3. Linter y formato
npm run lint                   # ESLint
npm run lint:fix               # ESLint auto-fix
npm run format                 # Prettier

# 4. Tests
npm test                       # 38 tests (Vitest)
npm run test:watch             # modo watch

# 5. Producción (local)
npm run build
cd ..
node server.js                 # http://localhost:3000
# Opcional: SUPABASE_URL=https://... node server.js (CSP ajustado)

# 6. Producción (Docker)
# Opción A: con .env (recomendado)
# Crear archivo .env en la raíz con:
#   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
#   VITE_SUPABASE_ANON_KEY=tu-anon-key
docker compose build
docker compose up -d           # http://localhost:3000

# Opción B: con argumentos (PowerShell)
# docker compose build --build-arg "VITE_SUPABASE_URL=<url>" --build-arg "VITE_SUPABASE_ANON_KEY=<key>"
# docker compose up -d
```

## API — Endpoints (directos a Supabase)

No hay endpoints HTTP tradicionales. El frontend llama directamente a Supabase:

| Operación | Llamada |
|-----------|---------|
| Login | `supabase.auth.signInWithPassword({ email, password })` |
| Registro | `supabase.auth.signUp({ email, password })` |
| Listar libros | `supabase.rpc('listar_libros_con_stock', { p_limit, p_offset })` |
| Buscar libros | `supabase.rpc('buscar_libros', { p_query, p_limit, p_offset })` |
| Carrito (upsert) | `supabase.from('carritos').upsert([...])` |
| Checkout | `supabase.rpc('realizar_checkout', { p_direccion_envio })` |
| Órdenes del usuario | `supabase.from('ordenes').select().eq('usuario_id', id)` |
| Crear autor (admin) | `supabase.from('autores').insert([...])` |
| Crear libro (admin) | `supabase.from('libros').insert([...])` |

## Tests

```bash
cd frontend
npm test              # 38 tests — 5 suites
npm run test:watch    # modo watch
npm run coverage      # reporte de cobertura
```

| Suite | Archivo | Tests | Qué cubre |
|-------|---------|-------|-----------|
| Carrito | `src/__tests__/cart.test.js` | 7 | add, remove, cantidad, total, localStorage |
| Errores | `src/__tests__/errors.test.js` | 8 | traducción de errores login, checkout, fallback |
| Componentes | `src/__tests__/components.test.jsx` | 7 | ErrorBoundary, NavSidebar, AuthBar, Supabase client (con context providers mock) |
| Integración | `src/__tests__/integration.test.jsx` | 9 | normalizeError edge cases, CartContext (add, increment, remove, clear) |
| Servidor | `src/__tests__/server.test.js` | 7 | headers seguridad, CSP, SPA fallback, path traversal, health |

## Limitaciones conocidas (MVP)

- **Sin avatar/profile** — no hay foto de perfil ni configuración de usuario
- **Sin panel de autores completo** — solo creación, sin edición ni soft-delete desde UI
- **Sin notificaciones transaccionales** — el historial de inventario existe pero no tiene UI
