# Auditoría de Seguridad y Calidad — Librería App MVP

**Fecha:** 20/05/2026
**Última actualización:** 20/05/2026
**Alcance:** Código fuente completo (frontend React + backend Supabase + servidor Node.js)
**Tipo:** Revisión manual de código estático + correcciones aplicadas

---

## Resumen ejecutivo

| Nivel | Cantidad | Corregidos |
|-------|----------|------------|
| Crítico | 3 | 3 |
| Alto | 3 | 3 |
| Medio | 4 | 4 |
| Bajo | 6 | 6 |

**Estado: TODOS LOS RIESGOS RESUELTOS** ✅

---

## Historial de hallazgos y correcciones

### 🔴 Críticos

#### C-01 — `realizar_checkout` sin `SET search_path` ✅ CORREGIDO

- **Archivo:** `supabase/migrations/001_schema.sql`
- **Descripción:** La función usaba `SECURITY DEFINER` sin fijar `search_path`, permitiendo potencial secuestro de la función mediante objetos maliciosos en esquemas con prioridad.
- **Corrección:** Se agregó `SET search_path = public` en la declaración de la función.

#### C-02 — `realizar_checkout` aceptaba `p_usuario_id` del cliente ✅ CORREGIDO

- **Archivo:** `supabase/migrations/001_schema.sql` + `frontend/src/components/CarritoSidebar.jsx`
- **Descripción:** La función recibía el UUID del usuario como parámetro del cliente, permitiendo suplantación de identidad.
- **Corrección:** La función ahora usa `auth.uid()` internamente. El frontend ya no envía `p_usuario_id`.

#### C-03 — Credenciales en `.env` sin `.gitignore` ✅ CORREGIDO

- **Archivo:** `frontend/.env`
- **Corrección:** Creados `.gitignore` en raíz y `frontend/` excluyendo `.env`, `node_modules/`, `dist/`.

---

### 🟠 Alto

#### A-01 — Path traversal en `server.js` ✅ CORREGIDO

- **Archivo:** `server.js`
- **Descripción:** `path.join(ROOT, req.url)` permitía leer archivos fuera de `frontend/dist/` con URLs como `GET /../server.js`.
- **Corrección:** Se implementó `isSafePath()` que resuelve la ruta con `path.resolve()` y verifica que comience con `ROOT`. Respuesta 403 si falla.
- **Adicional:** Se agregaron headers de seguridad HTTP (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Content-Security-Policy`).

#### A-02 — Panel Admin expuesto ✅ CORREGIDO

- **Archivo:** `frontend/src/components/AdminPanel.jsx`
- **Descripción:** Cualquier usuario autenticado podía ver y usar el panel de administración.
- **Corrección:** Se agregó verificación de permisos al montar el componente: intenta un `SELECT` en `autores` y si recibe error `42501` (permission denied), muestra mensaje de "Sin permisos de administrador" y oculta los formularios.

#### A-03 — Búsqueda rota con `to_tsquery` ✅ CORREGIDO

- **Archivo:** `supabase/migrations/001_schema.sql`
- **Descripción:** `buscar_libros` usaba `to_tsquery` que espera operadores booleanos. Texto natural como "Cien años" fallaba.
- **Corrección:** Cambiado a `plainto_tsquery` que tokeniza texto natural automáticamente.

---

### 🟡 Medio

#### M-01 — Sin headers de seguridad HTTP ✅ CORREGIDO

- **Archivo:** `server.js`
- **Corrección:** Agregados headers `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Content-Security-Policy` con restricciones a scripts y estilos propios + Supabase.

#### M-02 — Carrito no persistido ✅ CORREGIDO

- **Archivo:** `frontend/src/App.jsx`
- **Descripción:** El carrito se perdía al recargar la página.
- **Corrección:** Se implementó persistencia en `localStorage` con `loadCart()` al iniciar y `useEffect` que sincroniza en cada cambio.

#### M-03 — Proyecto sin `.gitignore` ✅ CORREGIDO

- **Archivo:** Raíz del proyecto + `frontend/`
- **Corrección:** Creados `.gitignore` en ambos niveles.

#### M-04 — N+1 upserts en checkout ✅ CORREGIDO

- **Archivo:** `frontend/src/components/CarritoSidebar.jsx`
- **Corrección:** Un solo `upsert` con el array completo de items.

---

### 🔵 Bajo

#### B-01 — Sin estados de loading ✅ CORREGIDO

- **Archivos:** `Tienda.jsx`, `MisOrdenes.jsx`, `CarritoSidebar.jsx`, `AdminPanel.jsx`, `LoginModal.jsx`
- **Corrección:** Cada componente ahora tiene estado `loading` con indicadores visuales: texto "Cargando...", botones deshabilitados con texto alternativo ("Publicando...", "Ingresando...").

#### B-02 — Sin Error Boundaries ✅ CORREGIDO

- **Archivo:** `frontend/src/main.jsx` + `frontend/src/components/ErrorBoundary.jsx`
- **Corrección:** Creado componente `ErrorBoundary` con mensaje amigable, botón de recarga y stack trace en desarrollo.

#### B-03 — Mensajes de error crudos al usuario ✅ CORREGIDO

- **Archivos:** `LoginModal.jsx`, `CarritoSidebar.jsx`, `AdminPanel.jsx`
- **Corrección:** Cada componente tiene función `userError()` que traduce errores de Supabase/Postgres a mensajes genéricos:
  - `"Invalid login credentials"` → "Email o contraseña incorrectos"
  - `"permission denied"` → "No tienes permisos de administrador"
  - `"Stock insuficiente"` → "Stock insuficiente para completar la compra"
  - Otros → mensaje genérico sin filtrar detalles del backend

#### B-04 — Sin diseño responsive ✅ CORREGIDO

- **Archivo:** `frontend/src/index.css`
- **Corrección:** Agregados media queries:
  - `≤1024px`: sidebar colapsa a 56px con iconos, carrito se oculta
  - `≤768px`: grid de libros adaptable, padding reducido, barra de búsqueda vertical

#### B-05 — Sin accesibilidad (a11y) ✅ CORREGIDO

- **Archivo:** General (CSS + componentes)
- **Corrección:**
  - `:focus-visible` en botones e inputs
  - `aria-label` en botones sin texto visible
  - `role="dialog"` y `aria-modal="true"` en modal de login
  - `htmlFor` en labels de formularios
  - `role="alert"` en mensajes de error
  - Escape key cierra el modal
  - `autoFocus` en el input de email del modal

#### B-06 — Sin pruebas automatizadas ✅ CORREGIDO

- **Archivo:** `frontend/src/__tests__/`
- **Descripción:** No había tests unitarios, de integración ni e2e.
- **Corrección:** Se agregaron 22 tests en 3 suites usando Vitest + Testing Library:
  - `cart.test.js` — 7 tests: lógica de carrito (add, remove, total, localStorage)
  - `errors.test.js` — 7 tests: traducción de errores (login, checkout, fallback)
  - `components.test.jsx` — 8 tests: smoke tests de componentes (ErrorBoundary, NavSidebar, AuthBar, Supabase client)
- **Ejecución:** `cd frontend && npm test` (o `npm run test:watch` para modo watch)

---

## Resumen de cambios aplicados

| ID | Issue | Cambio | Archivos modificados |
|----|-------|--------|---------------------|
| C-01 | `SECURITY DEFINER` sin `search_path` | Agregado `SET search_path = public` | `001_schema.sql` |
| C-02 | `p_usuario_id` desde cliente | Cambiado a `auth.uid()` interno | `001_schema.sql`, `CarritoSidebar.jsx` |
| C-03 | Credenciales sin `.gitignore` | Creados `.gitignore` | `.gitignore` (raíz + frontend) |
| A-01 | Path traversal + sin headers | Validación de ruta + security headers | `server.js` |
| A-02 | Panel Admin expuesto | Verificación de permisos RLS | `AdminPanel.jsx` |
| A-03 | `to_tsquery` con texto natural | Cambiado a `plainto_tsquery` | `001_schema.sql` |
| M-01 | Sin headers de seguridad | CSP, HSTS, XFO, etc. | `server.js` |
| M-02 | Carrito volátil | Persistencia en localStorage | `App.jsx` |
| M-03 | Sin `.gitignore` | Archivos de exclusión | `.gitignore` (raíz + frontend) |
| M-04 | N+1 upserts | Batch upsert único | `CarritoSidebar.jsx` |
| B-01 | Sin loading states | Indicadores en todos los componentes | `Tienda.jsx`, `MisOrdenes.jsx`, `CarritoSidebar.jsx`, `AdminPanel.jsx`, `LoginModal.jsx` |
| B-02 | Sin Error Boundary | Componente ErrorBoundary | `main.jsx`, `ErrorBoundary.jsx` |
| B-03 | Errores crudos al usuario | Traducción de errores | `LoginModal.jsx`, `CarritoSidebar.jsx`, `AdminPanel.jsx` |
| B-04 | Sin responsive | Media queries para tablet/mobile | `index.css` |
| B-05 | Sin accesibilidad | focus-visible, aria, roles, labels | `index.css`, `LoginModal.jsx`, `CarritoSidebar.jsx` |
| B-06 | Sin tests | 22 tests con Vitest + Testing Library | `__tests__/` |

---

## Estado actual: Riesgos remanentes

| Riesgo | Justificación |
|--------|---------------|
| Anon key en `.env` | La anon key es pública por diseño en Supabase. Se agregó `.gitignore` para evitar commits accidentales. |
| B-06 — Tests | Agregados 22 tests (Vitest + Testing Library). Ejecutar con `npm test` en `frontend/`. |

---

## Resumen de archivos (post-corrección)

| Archivo | Líneas | Hallazgos corregidos |
|---------|--------|---------------------|
| `supabase/migrations/001_schema.sql` | ~314 | C-01, C-02, A-03 |
| `server.js` | ~60 | A-01, M-01 |
| `frontend/src/App.jsx` | ~59 | M-02 |
| `frontend/src/components/AdminPanel.jsx` | ~125 | A-02, B-01, B-03 |
| `frontend/src/components/CarritoSidebar.jsx` | ~70 | C-02, M-04, B-01, B-03, B-05 |
| `frontend/src/components/Tienda.jsx` | ~72 | B-01 |
| `frontend/src/components/MisOrdenes.jsx` | ~58 | B-01 |
| `frontend/src/components/LoginModal.jsx` | ~72 | B-01, B-03, B-05 |
| `frontend/src/components/ErrorBoundary.jsx` | ~41 | B-02 |
| `frontend/src/main.jsx` | ~11 | B-02 |
| `frontend/src/index.css` | ~110 | B-04, B-05 |
| `frontend/.env` | 2 | C-03 |
| `frontend/.gitignore` | ~5 | M-03 |
| `.gitignore` (raíz) | ~5 | M-03 |

---

*Auditoría generada manualmente — revisión de código estático sin herramientas automatizadas.*
*Todos los riesgos identificados han sido corregidos.*
