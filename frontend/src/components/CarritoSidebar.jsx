import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuthContext } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import { rpcCall, normalizeError, formatPrice } from "../lib/supabaseHelpers";
import toast from "react-hot-toast";

const DIRECCION_MAX_LENGTH = 500;

export default function CarritoSidebar() {
  const { user } = useAuthContext();
  const { cart, removeItem, clearCart, total, cantidadTotal } = useCart();
  const [direccion, setDireccion] = useState("");
  const [loading, setLoading] = useState(false);

  const checkout = async () => {
    if (!direccion.trim()) return toast.error("Dirección de envío requerida");
    if (direccion.trim().length > DIRECCION_MAX_LENGTH) {
      return toast.error(`La dirección no puede superar los ${DIRECCION_MAX_LENGTH} caracteres`);
    }
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

      await rpcCall("realizar_checkout", {
        p_direccion_envio: direccion.trim(),
      });

      toast.success("¡Gracias por tu compra!");
      clearCart();
      setDireccion("");
    } catch (err) {
      toast.error(normalizeError(err.message));
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
                  {c.cantidad} x {formatPrice(c.precio)}
                </span>
              </div>

              <div className="cart-item-actions">
                <span>{formatPrice(Number(c.precio) * c.cantidad)}</span>
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
          <strong>{formatPrice(total)}</strong>
        </div>

        <label htmlFor="direccion">Dirección de envío</label>
        <textarea
          id="direccion"
          placeholder="Ej. Av. Los Olivos 123, Lima"
          value={direccion}
          onChange={(e) => setDireccion(e.target.value.slice(0, DIRECCION_MAX_LENGTH))}
          aria-label="Dirección de envío"
          rows={3}
          maxLength={DIRECCION_MAX_LENGTH}
        />
        <small style={{ color: "#94a3b8", fontSize: "0.75rem" }}>
          {direccion.length}/{DIRECCION_MAX_LENGTH}
        </small>

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
