import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Tienda({ user, cart, setCart }) {
  const [libros, setLibros] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { cargarLibros(); }, []);

  const cargarLibros = async () => {
    setLoading(true);
    const { data } = await supabase.rpc("listar_libros_con_stock");
    if (data) setLibros(data);
    setLoading(false);
  };

  const buscar = async () => {
    if (!query) return cargarLibros();
    setLoading(true);
    const { data } = await supabase.rpc("buscar_libros", { p_query: query });
    if (data) setLibros(data);
    setLoading(false);
  };

  const addCart = (id, titulo, precio) => {
    if (!user) return alert("Inicia sesión primero");
    setCart((prev) => {
      const exist = prev.find((c) => c.id === id);
      return exist
        ? prev.map((c) => (c.id === id ? { ...c, cantidad: c.cantidad + 1 } : c))
        : [...prev, { id, titulo, precio, cantidad: 1 }];
    });
  };

  return (
    <>
      <h1>Explorar Libros</h1>
      <div className="search-bar">
        <input placeholder="Buscar por título o resumen..."
          value={query} onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && buscar()} />
        <button onClick={buscar} style={{ background: "var(--primary)", color: "white" }}>
          {loading ? "Buscando..." : "Buscar"}
        </button>
      </div>
      {loading ? (
        <p style={{ color: "#94a3b8", marginTop: "2rem" }}>Cargando libros...</p>
      ) : (
        <div className="grid">
          {libros.map((l) => (
            <div key={l.id} className="libro">
              <h4>{l.titulo}</h4>
              <p style={{ color: "gray", fontSize: "0.85rem" }}>{l.autor_nombre || "Sin autor"}</p>
              <div style={{ color: "var(--success)", fontWeight: "bold", margin: "0.5rem 0" }}>
                ${parseFloat(l.precio).toFixed(2)}
              </div>
              <small>Stock: {l.stock_actual ?? 0}</small>
              <button onClick={() => addCart(l.id, l.titulo, l.precio)}
                style={{
                  background: "var(--primary)", color: "white", width: "100%", marginTop: "0.5rem",
                  opacity: l.stock_actual <= 0 ? 0.5 : 1
                }}
                disabled={l.stock_actual <= 0}>
                {l.stock_actual > 0 ? "Añadir" : "Agotado"}
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
