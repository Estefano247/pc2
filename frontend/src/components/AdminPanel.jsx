import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import toast from "react-hot-toast";

export default function AdminPanel({ user }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const [autores, setAutores] = useState([]);
  const [libros, setLibros] = useState([]);
  const [editandoId, setEditandoId] = useState(null);
  const [autorNombre, setAutorNombre] = useState("");
  const [loadingAutor, setLoadingAutor] = useState(false);
  const [loadingLibro, setLoadingLibro] = useState(false);
  const [libro, setLibro] = useState({ titulo: "", isbn: "", precio: "", autor_id: "", resumen: "", portada_url: "", stock: 0 });

  useEffect(() => {
    if (!user) { setChecking(false); return; }
    supabase.from("autores").select("*").limit(1).then(({ error }) => {
      setIsAdmin(!error || error.code !== "42501");
      setChecking(false);
    });
  }, [user]);

  useEffect(() => {
    supabase.from("autores").select("*").order("nombre").then(({ data }) => {
      if (data) setAutores(data);
    });
  }, []);

  useEffect(() => {
  cargarLibrosAdmin();
}, []);

const cargarLibrosAdmin = async () => {
  const { data } = await supabase
    .from("libros")
    .select("*")
    .order("titulo");

  if (data) setLibros(data);
};

  const traducirError = (msg) => {
    if (!msg) return "Error del servidor";
    if (msg.includes("42501") || msg.includes("permission denied") || msg.includes("permission_denied_for_function"))
      return "No tienes permisos de administrador para esta acción";
    if (msg.includes("stock_insuficiente") || msg.includes("Stock insuficiente"))
      return "Stock insuficiente para completar la operación";
    if (msg.includes("Invalid login credentials"))
      return "Email o contraseña incorrectos";
    return msg;
  };

  const guardarAutor = async (e) => {
    e.preventDefault();
    setLoadingAutor(true);
    const { error } = await supabase.from("autores").insert([{ nombre: autorNombre }]);
    setLoadingAutor(false);
    if (error) return alert(traducirError(error.message));
    alert("Autor creado!");
    setAutorNombre("");
    const { data } = await supabase.from("autores").select("*").order("nombre");
    if (data) setAutores(data);
  };

  const guardarLibro = async (e) => {
    e.preventDefault();
    setLoadingLibro(true);
    let data, error;

if (editandoId) {
  const response = await supabase
    .from("libros")
    .update({
      titulo: libro.titulo,
      isbn: libro.isbn,
      precio: parseFloat(libro.precio) || 0,
      autor_id: libro.autor_id || null,
      resumen: libro.resumen,
      portada_url: libro.portada_url || null,
    })
    .eq("id", editandoId)
    .select();

  data = response.data;
  error = response.error;
} else {
  const response = await supabase
    .from("libros")
    .insert([{
      titulo: libro.titulo,
      isbn: libro.isbn,
      precio: parseFloat(libro.precio) || 0,
      autor_id: libro.autor_id || null,
      resumen: libro.resumen,
      portada_url: libro.portada_url || null,
    }])
    .select();

  data = response.data;
  error = response.error;
}
    if (error) { setLoadingLibro(false); return alert(traducirError(error.message)); }

    if (data?.[0]) {
      await supabase.from("inventario").upsert(
        { libro_id: data[0].id, stock_actual: parseInt(libro.stock) || 0 },
        { onConflict: "libro_id" }
      );
    }

    setLoadingLibro(false);
    alert("Libro creado!");
    setLibro({ titulo: "", isbn: "", precio: "", autor_id: "", resumen: "", stock: 0 });
  };

  const eliminarLibro = async (id) => {
  const confirmar = confirm("¿Eliminar este libro?");

  if (!confirmar) return;

  const { error } = await supabase
    .from("libros")
    .delete()
    .eq("id", id);

  if (error) {
    return toast.error(traducirError(error.message));
  }

  toast.success("Libro eliminado");

  cargarLibrosAdmin();
};

const editarLibro = (libroActual) => {
  setLibro({
    titulo: libroActual.titulo || "",
    isbn: libroActual.isbn || "",
    precio: libroActual.precio || "",
    autor_id: libroActual.autor_id || "",
    resumen: libroActual.resumen || "",
    portada_url: libroActual.portada_url || "",
    stock: libroActual.stock_actual || 0,
  });

  setEditandoId(libroActual.id);

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
};

  if (checking) return <p style={{ color: "#94a3b8", marginTop: "2rem" }}>Verificando permisos...</p>;

  if (!isAdmin) {
    return (
      <div className="admin-page">
        <h1>Panel de Administración</h1>
        <div className="admin-card" style={{ textAlign: "center", padding: "3rem" }}>
          <p style={{ color: "#94a3b8", fontSize: "1.1rem" }}>
            No tienes permisos de administrador.
          </p>
          <p style={{ color: "#94a3b8", marginTop: "0.5rem" }}>
            Solo usuarios con rol de administrador pueden acceder a esta sección.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="admin-header">
  <div>
    <p className="eyebrow">Zona administrativa</p>
    <h1>Panel de Administración</h1>
    <p className="muted">
      Gestiona libros, autores e inventario de la librería.
    </p>
  </div>
</div>

      <div className="admin-card">
        <h3 className="section-title">Agregar Nuevo Libro</h3>
        <form onSubmit={guardarLibro}>
          <div className="form-group"><label>Título</label>
            <input value={libro.titulo} onChange={(e) => setLibro({ ...libro, titulo: e.target.value })} required />
          </div>
          <div className="form-group"><label>ISBN</label>
            <input value={libro.isbn} onChange={(e) => setLibro({ ...libro, isbn: e.target.value })} required />
          </div>
          <div style={{ display: "flex", gap: "1rem" }}>
            <div className="form-group" style={{ flex: 1 }}><label>Precio</label>
              <input type="number" step="0.01" min="0" value={libro.precio}
                onChange={(e) => setLibro({ ...libro, precio: e.target.value })} required />
            </div>
            <div className="form-group" style={{ flex: 1 }}><label>Stock</label>
              <input type="number" min="0" value={libro.stock}
                onChange={(e) => setLibro({ ...libro, stock: e.target.value })} />
            </div>
          </div>
          <div className="form-group"><label>Autor</label>
            <select value={libro.autor_id} onChange={(e) => setLibro({ ...libro, autor_id: e.target.value })} required>
              <option value="">Seleccionar autor</option>
              {autores.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
          </div>
          <div className="form-group">
  <label>URL de portada</label>
  <input
    placeholder="https://..."
    value={libro.portada_url}
    onChange={(e) =>
      setLibro({ ...libro, portada_url: e.target.value })
    }
  />
</div>
          <div className="form-group"><label>Resumen</label>
            <textarea value={libro.resumen} onChange={(e) => setLibro({ ...libro, resumen: e.target.value })} />
          </div>
          <button type="submit" disabled={loadingLibro}
            style={{ background: "var(--success)", color: "white", width: "100%", opacity: loadingLibro ? 0.6 : 1 }}>
            {loadingLibro
  ? editandoId ? "Guardando..." : "Publicando..."
  : editandoId ? "Guardar Cambios" : "Publicar Libro"}
          </button>
        </form>
      </div>

      <div className="admin-card">
        <h3 className="section-title">Registrar Autor</h3>
        <form onSubmit={guardarAutor}>
          <div className="form-group"><label>Nombre del Autor</label>
            <input value={autorNombre} onChange={(e) => setAutorNombre(e.target.value)} required />
          </div>
          <button type="submit" disabled={loadingAutor}
            style={{ background: "var(--primary)", color: "white", width: "100%", opacity: loadingAutor ? 0.6 : 1 }}>
            {loadingAutor ? "Guardando..." : "Guardar Autor"}
          </button>
        </form>
      </div>
      <div className="admin-card">
  <h3 className="section-title">Gestionar Libros</h3>

  <div className="admin-books">
    {libros.map((l) => (
      <div key={l.id} className="admin-book-item">
        <div className="admin-book-info">
          {l.portada_url && (
            <img src={l.portada_url} alt={l.titulo} />
          )}

          <div>
            <strong>{l.titulo}</strong>
            <small>{l.isbn}</small>
          </div>
        </div>

        <button
  className="edit-btn"
  onClick={() => editarLibro(l)}
>
  Editar
</button>

        <button
          className="delete-btn"
          onClick={() => eliminarLibro(l.id)}
        >
          Eliminar
        </button>
      </div>
    ))}
  </div>
</div>
    </>
  );
}

