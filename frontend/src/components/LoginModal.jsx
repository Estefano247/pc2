import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";

function userError(msg) {
  if (!msg) return "Error del servidor";
  if (msg.includes("Invalid login credentials")) return "Email o contraseña incorrectos";
  if (msg.includes("Email not confirmed")) return "Debes confirmar tu email antes de iniciar sesión";
  if (msg.includes("rate_limit")) return "Demasiados intentos. Espera unos minutos.";
  return "Error al iniciar sesión. Intenta de nuevo.";
}

export default function LoginModal({ onLogin, onClose }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

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
      await onLogin(email.trim(), password);
      toast.success("Inicio de sesión exitoso");
    } catch (err) {
      toast.error(userError(err.message));
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
      aria-label="Inicio de sesión"
    >
      <div className="modal-card login-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Cerrar modal">
          ✕
        </button>

        <div className="login-icon">📚</div>

        <p className="eyebrow">Bienvenido</p>
        <h2>Iniciar sesión</h2>
        <p className="muted login-subtitle">
          Accede para comprar libros, revisar tus órdenes y administrar la librería.
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
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <div className="login-help">
          ¿No tienes cuenta? Créala desde Supabase Auth.
        </div>
      </div>
    </div>
  );
}