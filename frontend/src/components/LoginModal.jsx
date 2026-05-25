import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { normalizeError } from "../lib/supabaseHelpers";
import toast from "react-hot-toast";

export default function LoginModal({ onClose }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const isLogin = mode === "login";

  useEffect(() => {
    inputRef.current?.focus();
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim()) return toast.error("Ingresa tu correo");
    if (!password.trim()) return toast.error("Ingresa tu contraseña");

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        toast.success("Inicio de sesión exitoso");
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        toast.success("Registro exitoso. Revisa tu correo para confirmar.");
        setMode("login");
      }
    } catch (err) {
      toast.error(normalizeError(err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={isLogin ? "Inicio de sesión" : "Registro"}
    >
      <div className="modal-card login-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Cerrar modal">
          ✕
        </button>

        <div className="login-icon">📚</div>

        <p className="eyebrow">{isLogin ? "Bienvenido" : "Nuevo usuario"}</p>
        <h2>{isLogin ? "Iniciar sesión" : "Crear cuenta"}</h2>
        <p className="muted login-subtitle">
          {isLogin
            ? "Accede para comprar libros, revisar tus órdenes y administrar la librería."
            : "Regístrate para comenzar a comprar libros."}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="loginEmail">Correo electrónico</label>
            <input
              id="loginEmail"
              type="email"
              ref={inputRef}
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="loginPassword">Contraseña</label>
            <input
              id="loginPassword"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <button type="submit" disabled={loading} className="login-btn">
            {loading ? "Procesando..." : (isLogin ? "Ingresar" : "Crear cuenta")}
          </button>
        </form>

        <div className="login-help">
          {isLogin ? (
            <>
              ¿No tienes cuenta?{" "}
              <button
                onClick={() => setMode("register")}
                style={{ background: "none", color: "var(--primary)", padding: 0, fontWeight: 600, textDecoration: "underline" }}
              >
                Regístrate
              </button>
            </>
          ) : (
            <>
              ¿Ya tienes cuenta?{" "}
              <button
                onClick={() => setMode("login")}
                style={{ background: "none", color: "var(--primary)", padding: 0, fontWeight: 600, textDecoration: "underline" }}
              >
                Inicia sesión
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
