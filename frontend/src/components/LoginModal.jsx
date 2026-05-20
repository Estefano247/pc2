import { useState, useEffect, useRef } from "react";

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
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await onLogin(email, password);
    } catch (err) {
      setError(userError(err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}
      role="dialog" aria-modal="true" aria-label="Inicio de sesión">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>Iniciar Sesión</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="loginEmail">Email</label>
            <input id="loginEmail" type="email" ref={inputRef}
              value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label htmlFor="loginPassword">Contraseña</label>
            <input id="loginPassword" type="password"
              value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>
          {error && <p role="alert" style={{ color: "var(--danger)", marginBottom: "0.5rem", fontSize: "0.9rem" }}>{error}</p>}
          <button type="submit" disabled={loading}
            style={{ background: "var(--primary)", color: "white", width: "100%", padding: "0.8rem", opacity: loading ? 0.6 : 1 }}>
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
        <p style={{ marginTop: "1rem", fontSize: "0.85rem", color: "gray" }}>
          ¿No tienes cuenta? Créala en el panel de Supabase Auth.
        </p>
      </div>
    </div>
  );
}
