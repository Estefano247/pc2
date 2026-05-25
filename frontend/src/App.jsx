import { lazy, Suspense, useState, useEffect } from "react";
import { useAuthContext } from "./contexts/AuthContext";
import NavSidebar from "./components/NavSidebar";
import AuthBar from "./components/AuthBar";
import LoginModal from "./components/LoginModal";
import Tienda from "./components/Tienda";
import CarritoSidebar from "./components/CarritoSidebar";
import { Toaster } from "react-hot-toast";

const MisOrdenes = lazy(() => import("./components/MisOrdenes"));
const AdminPanel = lazy(() => import("./components/AdminPanel"));

function LazyFallback() {
  return <div className="loading-card" style={{ marginTop: "2rem" }}>Cargando...</div>;
}

export default function App() {
  const { user, loading } = useAuthContext();
  const [view, setView] = useState("tienda");
  const [showLogin, setShowLogin] = useState(false);

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
      <Toaster position="top-right" />
      <NavSidebar view={view} onNavigate={setView} />
      <AuthBar onLoginClick={() => setShowLogin(true)} />
      <div className={`main-area ${!user ? "no-cart" : ""}`}>
        <div className={`view ${view === "tienda" ? "active" : ""}`}>
          <Tienda />
        </div>
        <Suspense fallback={<LazyFallback />}>
          <div className={`view ${view === "mis-ordenes" ? "active" : ""}`}>
            <MisOrdenes />
          </div>
          <div className={`view ${view === "admin" ? "active" : ""}`}>
            <AdminPanel />
          </div>
        </Suspense>
      </div>
      {user && <CarritoSidebar />}
      {showLogin && !user && (
        <LoginModal onClose={() => setShowLogin(false)} />
      )}
    </div>
  );
}
