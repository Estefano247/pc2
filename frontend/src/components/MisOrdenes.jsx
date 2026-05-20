import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function MisOrdenes({ user }) {
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError("");
    supabase
      .from("ordenes")
      .select(`
        id, estado, total, direccion_envio, created_at,
        orden_detalles (cantidad, precio_unitario_historico, libros (titulo))
      `)
      .eq("usuario_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data, error: err }) => {
        if (err) setError("Error al cargar órdenes");
        else if (data) setOrdenes(data);
        setLoading(false);
      });
  }, [user]);

  if (!user) return <p style={{ color: "gray" }}>Inicia sesión para ver tus órdenes</p>;

  return (
    <>
      <h1>Mi Historial de Compras</h1>
      <div style={{ marginTop: "1.5rem" }}>
        {loading && <p style={{ color: "#94a3b8" }}>Cargando órdenes...</p>}
        {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
        {!loading && !error && ordenes.length === 0 && (
          <p style={{ color: "gray" }}>No tienes órdenes aún</p>
        )}
        {ordenes.map((o) => (
          <div key={o.id} className="orden-card">
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>Orden: {o.id.substring(0, 8)}</strong>
              <span style={{ color: "var(--primary)" }}>{o.estado.toUpperCase()}</span>
            </div>
            <div style={{ fontSize: "0.9rem", margin: "0.5rem 0" }}>
              {o.orden_detalles?.map((d, i) => (
                <span key={i}>{d.cantidad}x {d.libros?.titulo}{i < o.orden_detalles.length - 1 ? ", " : ""}</span>
              ))}
            </div>
            <div style={{ fontWeight: "bold" }}>Total: ${parseFloat(o.total).toFixed(2)}</div>
          </div>
        ))}
      </div>
    </>
  );
}
