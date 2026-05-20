import { useState, useEffect } from "react";
import { useAuth } from "./hooks/useAuth";
import NavSidebar from "./components/NavSidebar";
import AuthBar from "./components/AuthBar";
import LoginModal from "./components/LoginModal";
import Tienda from "./components/Tienda";
import MisOrdenes from "./components/MisOrdenes";
import AdminPanel from "./components/AdminPanel";
import CarritoSidebar from "./components/CarritoSidebar";

const CART_KEY = "libreria_cart";

function loadCart() {
  try {
    const saved = localStorage.getItem(CART_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export default function App() {
  const { user, loading, login, logout } = useAuth();
  const [view, setView] = useState("tienda");
  const [showLogin, setShowLogin] = useState(false);
  const [cart, setCart] = useState(loadCart);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (!loading && !user) setShowLogin(true);
  }, [user, loading]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <p style={{ color: "#94a3b8" }}>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="layout">
      <NavSidebar user={user} view={view} onNavigate={setView} onLogout={logout} />

      <AuthBar user={user} onLoginClick={() => setShowLogin(true)} onLogout={logout} />

      <div className={`main-area ${!user ? "no-cart" : ""}`}>
        <div className={`view ${view === "tienda" ? "active" : ""}`}>
          <Tienda user={user} cart={cart} setCart={setCart} />
        </div>
        <div className={`view ${view === "mis-ordenes" ? "active" : ""}`}>
          <MisOrdenes user={user} />
        </div>
        <div className={`view ${view === "admin" ? "active" : ""}`}>
          <AdminPanel user={user} />
        </div>
      </div>

      {user && (
        <CarritoSidebar cart={cart} setCart={setCart} user={user} />
      )}

      {showLogin && !user && (
        <LoginModal
          onLogin={login}
          onClose={() => setShowLogin(false)}
        />
      )}
    </div>
  );
}
