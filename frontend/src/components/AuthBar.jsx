export default function AuthBar({ user, onLoginClick, onLogout }) {
  return (
    <div className="auth-bar">
      <span>{user ? `Sesión: ${user.email}` : "No has iniciado sesión"}</span>
    </div>
  );
}
