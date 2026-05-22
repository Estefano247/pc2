export default function NavSidebar({ user, view, onNavigate, onLogout }) {
  return (
    <nav className="nav-side">
      <h2>LibreríaApp</h2>
      <button className={`nav-link ${view === "tienda" ? "active" : ""}`}
        onClick={() => onNavigate("tienda")}>Tienda</button>
      <button className={`nav-link ${view === "mis-ordenes" ? "active" : ""}`}
        onClick={() => onNavigate("mis-ordenes")}>Mis Órdenes</button>
      <button className={`nav-link ${view === "admin" ? "active" : ""}`}
        onClick={() => onNavigate("admin")}>Panel Admin</button>
      {user && (
        <button className="nav-link logout" onClick={onLogout}>Cerrar Sesión</button>
      )}
    </nav>
  );
}
