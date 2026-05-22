import { useState } from "react";
import { supabase } from "../lib/supabase";
import toast from "react-hot-toast";

const ERROR_MSGS = {
  stock_insuficiente: "Stock insuficiente para completar la compra",
  "Stock insuficiente": "Stock insuficiente para completar la compra",
  "Carrito vac": "El carrito está vacío",
  "Dirección de envío requerida": "Dirección de envío requerida",
};

function userError(msg) {
  if (!msg) return "Error del servidor";
  for (const [key, val] of Object.entries(ERROR_MSGS)) {
    if (msg.includes(key)) return val;
  }
  return "Error al procesar la compra. Intenta de nuevo.";
}

export default function CarritoSidebar({ cart, setCart, user }) {
  const [direccion, setDireccion] = useState("");
  const [loading, setLoading] = useState(false);

  const total = cart.reduce((s, i) => s + Number(i.precio) * i.cantidad, 0);
  const cantidadTotal = cart.reduce((s, i) => s + i.cantidad, 0);

  const removeItem = (index) => {
    setCart((prev) => prev.filter((_, idx) => idx !== index));
  };

  const checkout = async () => {
    if (!direccion.trim()) return toast.error("Dirección de envío requerida");
    if (!cart.length) return toast.error("Carrito vacío");

    setLoading(true);

    try {
      const { error: upsertError } = await supabase.from("carritos").upsert(
        cart.map((item) => ({
          usuario_id: user.id,
          libro_id: item.id,
          cantidad: item.cantidad,
        })),
        { onConflict: "usuario_id, libro_id" }
      );

      if (upsertError) throw upsertError;

      const { error } = await supabase.rpc("realizar_checkout", {
        p_direccion_envio: direccion.trim(),
      });

      if (error) throw error;

      toast.success("¡Gracias por tu compra!");
      setCart([]);
      setDireccion("");
    } catch (err) {
      toast.error(userError(err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="sidebar-cart">
      <div className="cart-header">
        <div>
          <p className="eyebrow">Compra actual</p>
          <h2>Carrito</h2>
        </div>
        <span className="cart-badge">{cantidadTotal}</span>
      </div>

      <div className="cart-list">
        {cart.length === 0 ? (
          <div className="cart-empty">
            <div className="cart-empty-icon">🛒</div>
            <h3>Tu carrito está vacío</h3>
            <p>Agrega libros desde la tienda para comenzar tu compra.</p>
          </div>
        ) : (
          cart.map((c, i) => (
            <div key={`${c.id}-${i}`} className="cart-item">
              <div className="cart-item-info">
                <strong>{c.titulo}</strong>
                <span>
                  {c.cantidad} x ${Number(c.precio).toFixed(2)}
                </span>
              </div>

              <div className="cart-item-actions">
                <span>${(Number(c.precio) * c.cantidad).toFixed(2)}</span>
                <button
                  onClick={() => removeItem(i)}
                  className="cart-remove"
                  aria-label="Eliminar item"
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="cart-footer">
        <div className="cart-total">
          <span>Total</span>
          <strong>${total.toFixed(2)}</strong>
        </div>

        <label htmlFor="direccion">Dirección de envío</label>
        <textarea
          id="direccion"
          placeholder="Ej. Av. Los Olivos 123, Lima"
          value={direccion}
          onChange={(e) => setDireccion(e.target.value)}
          aria-label="Dirección de envío"
          rows={3}
        />

        <button
          onClick={checkout}
          disabled={loading || cart.length === 0}
          className="checkout-btn"
        >
          {loading ? "Procesando compra..." : "Finalizar compra"}
        </button>
      </div>
    </aside>
  );
}