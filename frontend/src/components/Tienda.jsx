import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import toast from "react-hot-toast";

export default function Tienda({ user, cart, setCart }) {
  const [libros, setLibros] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarLibros();
  }, []);

  const cargarLibros = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("listar_libros_con_stock");

    if (!error && data) {
      setLibros(data);
    }

    setLoading(false);
  };

  const buscar = async () => {
    const texto = query.trim();

    if (!texto) return cargarLibros();

    setLoading(true);
    const { data, error } = await supabase.rpc("buscar_libros", {
      p_query: texto,
    });

    if (!error && data) {
      setLibros(data);
    }

    setLoading(false);
  };

  const addCart = (libro) => {
    if (!user) return toast.error("Inicia sesión primero");

    const cantidadActual = cart.find((c) => c.id === libro.id)?.cantidad || 0;

    if (cantidadActual >= libro.stock_actual) {
      return toast.error("No puedes agregar más unidades que el stock disponible");
    }

    setCart((prev) => {
  const exist = prev.find((c) => c.id === libro.id);

  const nuevoCart = exist
    ? prev.map((c) =>
        c.id === libro.id ? { ...c, cantidad: c.cantidad + 1 } : c
      )
    : [
        ...prev,
        {
          id: libro.id,
          titulo: libro.titulo,
          precio: Number(libro.precio),
          cantidad: 1,
        },
      ];

       toast.success("Libro agregado al carrito");

       return nuevoCart;
  });
  };

  return (
    <section className="store-page">
      <div className="store-header">
        <div>
          <p className="eyebrow">Catálogo digital</p>
          <h1>Explorar libros</h1>
          <p className="muted">
            Busca, revisa stock y agrega libros a tu carrito.
          </p>
        </div>
      </div>

      <div className="search-bar">
        <input
          placeholder="Buscar por título o resumen..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && buscar()}
        />
        <button onClick={buscar} className="btn-primary">
          {loading ? "Buscando..." : "Buscar"}
        </button>
        {query && (
          <button
            className="btn-secondary"
            onClick={() => {
              setQuery("");
              cargarLibros();
            }}
          >
            Limpiar
          </button>
        )}
      </div>

      {loading ? (
        <div className="loading-card">Cargando libros...</div>
      ) : libros.length === 0 ? (
        <div className="empty-state">
          <h3>No se encontraron libros</h3>
          <p>Prueba con otro título o palabra clave.</p>
        </div>
      ) : (
        <div className="grid">
          {libros.map((l) => {
            const stock = l.stock_actual ?? 0;
            const agotado = stock <= 0;

            return (
              <article key={l.id} className="libro">
                <div className="book-cover">
                  {l.portada_url ? (
                    <img src={l.portada_url} alt={l.titulo} />
                  ) : (
                    <span>{l.titulo?.charAt(0) || "L"}</span>
                  )}
                </div>

                <div className="book-content">
                  <h4>{l.titulo}</h4>
                  <p className="book-author">{l.autor_nombre || "Sin autor"}</p>
                  <p className="book-summary">
                    {l.resumen || "Sin resumen disponible."}
                  </p>

                  <div className="book-footer">
                    <div>
                      <strong>${Number(l.precio).toFixed(2)}</strong>
                      <small className={agotado ? "stock-out" : "stock-ok"}>
                        Stock: {stock}
                      </small>
                    </div>

                    <button
                      onClick={() => addCart(l)}
                      className={agotado ? "btn-disabled" : "btn-primary"}
                      disabled={agotado}
                    >
                      {agotado ? "Agotado" : "Añadir"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}