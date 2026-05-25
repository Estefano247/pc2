import { supabase } from "./supabase";

const ERROR_TRANSLATIONS = {
  "stock_insuficiente": "Stock insuficiente para completar la compra",
  "Stock insuficiente": "Stock insuficiente para completar la compra",
  "Carrito vac": "El carrito está vacío",
  "Dirección de envío requerida": "Dirección de envío requerida",
  "direccion_muy_larga": "La dirección de envío es demasiado larga",
  "Invalid login credentials": "Email o contraseña incorrectos",
  "Email not confirmed": "Debes confirmar tu email antes de iniciar sesión",
  "rate_limit": "Demasiados intentos. Espera unos minutos.",
  "42501": "No tienes permisos para esta acción",
  "permission denied": "No tienes permisos para esta acción",
  "permission_denied_for_function": "No tienes permisos para esta acción",
};

export function normalizeError(err) {
  if (!err) return "Error del servidor";
  const msg = typeof err === "string" ? err : (err.message || err.description || "");
  if (!msg) return "Error del servidor";
  for (const [key, val] of Object.entries(ERROR_TRANSLATIONS)) {
    if (msg.includes(key)) return val;
  }
  return "Error al procesar la operación. Intenta de nuevo.";
}

export function formatPrice(amount) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

export async function rpcCall(name, params = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const { data, error } = await supabase.rpc(name, params, {
      signal: controller.signal,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("Tiempo de espera agotado. Verifica tu conexión.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function selectCall(table, options = {}) {
  const { columns = "*", filters, order, limit, offset, timeoutMs = 15000 } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let q = supabase.from(table).select(columns, { signal: controller.signal });
    if (filters) {
      for (const f of filters) {
        q = q[f.method](f.column, f.value);
      }
    }
    if (order) q = q.order(order.column, { ascending: order.ascending ?? true });
    if (limit) q = q.limit(limit);
    if (offset) q = q.range(offset, offset + limit - 1);
    const { data, error } = await q;
    if (error) throw error;
    return data;
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("Tiempo de espera agotado. Verifica tu conexión.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
