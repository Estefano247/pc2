import { useState } from "react";
import { supabase } from "../lib/supabase";

const ERROR_MSGS = {
  "stock_insuficiente": "Stock insuficiente para completar la compra",
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

  const total = cart.reduce((s, i) => s + i.precio * i.cantidad, 0);

  const checkout = async () => {
    if (!direccion) return alert("Dirección de envío requerida");
    if (!cart.length) return alert("Carrito vacío");

    setLoading(true);
    try {
      const { error: upsertError } = await supabase.from("carritos").upsert(
        cart.map((item) => ({ usuario_id: user.id, libro_id: item.id, cantidad: item.cantidad })),
        { onConflict: "usuario_id, libro_id" }
      );
      if (upsertError) throw upsertError;

      const { error } = await supabase.rpc("realizar_checkout", {
        p_direccion_envio: direccion,
      });

      if (error) throw error;

      alert("¡Gracias por tu compra!");
      setCart([]);
      setDireccion("");
    } catch (err) {
      alert(userError(err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sidebar-cart">
      <h2>Carrito</h2>
      <div style={{ flex: 1, overflowY: "auto", marginTop: "1rem" }}>
        {cart.length === 0 ? (
          <p style={{ color: "#94a3b8", textAlign: "center", marginTop: "2rem" }}>
            El carrito está vacío
          </p>
        ) : (
          cart.map((c, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.9rem" }}>
              <span>{c.cantidad}x {c.titulo}</span>
              <button onClick={() => setCart((prev) => prev.filter((_, idx) => idx !== i))}
                style={{ color: "red", background: "none" }} aria-label="Eliminar item">✕</button>
            </div>
          ))
        )}
      </div>
      <div style={{ paddingTop: "1rem", borderTop: "2px solid #eee" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "1.2rem" }}>
          <span>Total:</span><span>${total.toFixed(2)}</span>
        </div>
        <input placeholder="Dirección de envío" value={direccion}
          onChange={(e) => setDireccion(e.target.value)} style={{ marginTop: "1rem" }} aria-label="Dirección de envío" />
        <button onClick={checkout} disabled={loading || cart.length === 0}
          style={{
            background: "var(--success)", color: "white", width: "100%",
            marginTop: "1rem", padding: "1rem", opacity: loading ? 0.6 : 1
          }}>
          {loading ? "Procesando..." : "FINALIZAR COMPRA"}
        </button>
      </div>
    </div>
  );
}
