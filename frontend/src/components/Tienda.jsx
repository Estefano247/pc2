import { useEffect, useState } from "react";
import { useAuthContext } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import { rpcCall, normalizeError, formatPrice } from "../lib/supabaseHelpers";
import toast from "react-hot-toast";
import { BookSkeleton } from "./Skeleton";

const PAGE_SIZE = 12;

export default function Tienda() {
  const { user } = useAuthContext();
  const { cart, addToCart } = useCart();
  const [libros, setLibros] = useState([]);
  const [query, setQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    const fetchBooks = async () => {
      setLoading(true);
      try {
        const limit = PAGE_SIZE + 1;
        let data;
        if (searchTerm) {
          data = await rpcCall("buscar_libros", {
            p_query: searchTerm,
            p_limit: limit,
            p_offset: page * PAGE_SIZE,
          });
        } else {
          data = await rpcCall("listar_libros_con_stock", {
            p_limit: limit,
            p_offset: page * PAGE_SIZE,
          });
        }
        setHasMore((data || []).length > PAGE_SIZE);
        setLibros(data ? data.slice(0, PAGE_SIZE) : []);
      } catch (err) {
        toast.error(normalizeError(err.message));
      } finally {
        setLoading(false);
      }
    };
    fetchBooks();
  }, [page, searchTerm]);

  const buscar = () => {
    setPage(0);
    setSearchTerm(query.trim());
  };

  const limpiarBusqueda = () => {
    setQuery("");
    setSearchTerm("");
    setPage(0);
  };

  const handleAddCart = (libro) => {
    if (!user) return toast.error("Inicia sesión primero");
    const cantidadActual = cart.find((c) => c.id === libro.id)?.cantidad || 0;
    if (cantidadActual >= libro.stock_actual) {
      return toast.error("No puedes agregar más unidades que el stock disponible");
    }
    addToCart(libro);
    toast.success("Libro agregado al carrito");
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
        {searchTerm && (
          <button className="btn-secondary" onClick={limpiarBusqueda}>
            Limpiar
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <BookSkeleton key={i} />
          ))}
        </div>
      ) : libros.length === 0 ? (
        <div className="empty-state">
          <h3>No se encontraron libros</h3>
          <p>Prueba con otro título o palabra clave.</p>
        </div>
      ) : (
        <>
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
                        <strong>{formatPrice(l.precio)}</strong>
                        <small className={agotado ? "stock-out" : "stock-ok"}>
                          Stock: {stock}
                        </small>
                      </div>

                      <button
                        onClick={() => handleAddCart(l)}
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

          <div className="pagination">
            <button
              className="btn-secondary"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Anterior
            </button>
            <span className="page-info">Página {page + 1}</span>
            <button
              className="btn-secondary"
              disabled={!hasMore}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </button>
          </div>
        </>
      )}
    </section>
  );
}
