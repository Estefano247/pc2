# Librería App — MVP con Supabase + React

Backend 100 % en **Supabase** (Postgres + RLS + Auth + Funciones).  
Frontend en **React 18 + Vite**. Sin servidor API intermedio.

## Estructura del proyecto

```
libreria-app/
├── frontend/                          # React app (Vite)
│   ├── src/
│   │   ├── main.jsx                   # Entry point
│   │   ├── App.jsx                    # Layout + navegación + estado global
│   │   ├── index.css                  # Estilos globales (~700 líneas)
│   │   ├── setupTests.js              # Setup de Testing Library
│   │   ├── __tests__/                 # Tests (Vitest)
│   │   │   ├── cart.test.js           # Lógica de carrito
│   │   │   ├── errors.test.js         # Traducción de errores
│   │   │   └── components.test.jsx    # Smoke tests de componentes
│   │   ├── lib/supabase.js            # Cliente Supabase (singleton)
│   │   ├── hooks/useAuth.js           # Hook de autenticación
│   │   └── components/
│   │       ├── NavSidebar.jsx         # Navegación lateral
│   │       ├── AuthBar.jsx            # Barra superior (indicador de sesión)
│   │       ├── LoginModal.jsx         # Modal de inicio de sesión
│   │       ├── Tienda.jsx             # Tienda + búsqueda full-text
│   │       ├── CarritoSidebar.jsx     # Carrito lateral + checkout
│   │       ├── MisOrdenes.jsx         # Historial de órdenes
│   │       ├── AdminPanel.jsx         # Panel admin (libros + autores)
│   │       └── ErrorBoundary.jsx      # Captura de errores de React
│   ├── .env.example
│   ├── .env                           # Credenciales reales (ignorado por git)
│   ├── package.json
│   └── vite.config.js
├── server.js                          # Servidor estático (solo producción)
├── supabase/
│   ├── migrations/001_schema_clean.sql # Migración completa del backend
│   └── seed.sql                       # Datos de prueba
├── AUDITORIA.md                       # Auditoría de seguridad y calidad
├── package-lock.json                  # (huérfano — ver AUDITORIA N-04)
├── .gitignore
└── README.md
```

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | React 18 + Vite 5 |
| Backend | Supabase (Postgres 15 + RLS) |
| Autenticación | Supabase Auth (email/password) |
| Búsqueda | Full-text search tsvector (español) con `plainto_tsquery` |
| API | Funciones Postgres + RLS (sin servidor HTTP intermedio) |
| Servidor producción | Node.js 18+ HTTP (solo archivos estáticos) |

## Cómo funciona

El frontend se conecta **directamente** a Supabase sin ningún servidor intermedio:

```
[Navegador] ─── supabase-js ───> [Supabase Cloud]
                                        ├── Postgres (tablas, funciones, triggers)
                                        ├── Auth (JWT, email/password)
                                        └── RLS (seguridad a nivel fila)
```

### Flujo de datos

1. **Login** → `supabase.auth.signInWithPassword(email, password)` → Supabase devuelve un JWT
2. **Cada consulta** envía el JWT en el header `Authorization: Bearer <token>`
3. **RLS** evalúa `auth.uid()` contra cada fila — el usuario solo ve sus datos
4. **Funciones Postgres** (`realizar_checkout`, `buscar_libros`) ejecutan lógica del lado del servidor en una transacción atómica
5. **Triggers** (`tr_descontar_stock`) se disparan automáticamente al insertar detalles de orden

### Funciones Postgres

| Función | Descripción |
|---------|-------------|
| `realizar_checkout(direccion)` | Toma `auth.uid()` internamente, lee carrito, calcula total, crea orden, inserta detalles, descuenta stock y limpia carrito. Todo en una transacción. |
| `listar_libros_con_stock()` | JOIN entre libros, autores e inventario. Devuelve todo en una llamada. |
| `buscar_libros(query)` | Búsqueda full-text con `plainto_tsquery` (acepta texto natural, sin operadores). |
| `sincronizar_carrito(items)` | (No usado desde frontend) Reemplaza el carrito del usuario en una sola operación. |

### Triggers

| Trigger | Evento | Acción |
|---------|--------|--------|
| `tr_crear_inventario` | `AFTER INSERT ON libros` | Crea registro en inventario con stock = 0 |
| `tr_descontar_stock` | `AFTER INSERT ON orden_detalles` | Descuenta stock y lanza error si es insuficiente |

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

# 3. Tests
npm test                       # 22 tests (Vitest)
npm run test:watch             # modo watch

# 4. Producción
npm run build
cd ..
node server.js                 # http://localhost:3000
```

## API — Endpoints (directos a Supabase)

No hay endpoints HTTP tradicionales. El frontend llama directamente a Supabase:

| Operación | Llamada |
|-----------|---------|
| Login | `supabase.auth.signInWithPassword({ email, password })` |
| Listar libros | `supabase.rpc('listar_libros_con_stock')` |
| Buscar libros | `supabase.rpc('buscar_libros', { p_query: 'texto' })` |
| Carrito (upsert) | `supabase.from('carritos').upsert([...])` |
| Checkout | `supabase.rpc('realizar_checkout', { p_direccion_envio })` |
| Órdenes del usuario | `supabase.from('ordenes').select().eq('usuario_id', id)` |
| Crear autor (admin) | `supabase.from('autores').insert([...])` |
| Crear libro (admin) | `supabase.from('libros').insert([...])` |

## Tests

```bash
cd frontend
npm test              # 22 tests — 3 suites
npm run test:watch    # modo watch
```

| Suite | Archivo | Tests | Qué cubre |
|-------|---------|-------|-----------|
| Carrito | `src/__tests__/cart.test.js` | 7 | add, remove, cantidad, total, localStorage |
| Errores | `src/__tests__/errors.test.js` | 8 | traducción de errores login, checkout, fallback |
| Componentes | `src/__tests__/components.test.jsx` | 7 | ErrorBoundary, NavSidebar, AuthBar, Supabase client |

**Nota:** Los tests de AuthBar en `components.test.jsx` verifican botones que el componente actual no renderiza (ver `AUDITORIA.md` N-02).

## Limitaciones conocidas (MVP)

- **Sin registro público** — crear usuarios desde Supabase Dashboard
- **Sin paginación** — carga todos los libros/órdenes de una vez
- **Sin avatar/profile** — no hay foto de perfil ni configuración de usuario


