import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuthContext } from "../contexts/AuthContext";
import { normalizeError, formatPrice } from "../lib/supabaseHelpers";
import Skeleton from "./Skeleton";

export default function MisOrdenes() {
  const { user } = useAuthContext();
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
        if (err) setError(normalizeError(err));
        else if (data) setOrdenes(data);
        setLoading(false);
      });
  }, [user]);

  if (!user) return <p style={{ color: "gray" }}>Inicia sesión para ver tus órdenes</p>;

  return (
    <>
      <h1>Mi Historial de Compras</h1>
      <div style={{ marginTop: "1.5rem" }}>
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="orden-card" style={{ padding: "1.5rem" }}>
                <Skeleton height="1.2rem" width="40%" />
                <Skeleton height="0.9rem" width="70%" style={{ marginTop: "0.8rem" }} />
                <Skeleton height="1rem" width="25%" style={{ marginTop: "0.8rem" }} />
              </div>
            ))}
          </div>
        )}
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
            <div style={{ fontWeight: "bold" }}>Total: {formatPrice(o.total)}</div>
          </div>
        ))}
      </div>
    </>
  );
}
