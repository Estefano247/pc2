import { useAuthContext } from "../contexts/AuthContext";

export default function AuthBar({ onLoginClick }) {
  const { user, logout } = useAuthContext();

  return (
    <div className="auth-bar">
      <span>{user ? `Sesión: ${user.email}` : "No has iniciado sesión"}</span>
      {user ? (
        <button onClick={logout}>Cerrar Sesión</button>
      ) : (
        <button onClick={onLoginClick}>Iniciar Sesión</button>
      )}
    </div>
  );
}
