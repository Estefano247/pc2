import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", height: "100vh", fontFamily: "sans-serif",
          color: "#1e293b", padding: "2rem", textAlign: "center"
        }}>
          <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Algo salió mal</h1>
          <p style={{ color: "#64748b", marginBottom: "1.5rem" }}>
            Ocurrió un error inesperado. Recarga la página o intenta de nuevo.
          </p>
          <button onClick={() => window.location.reload()}
            style={{
              background: "#3b82f6", color: "white", border: "none",
              borderRadius: "0.5rem", padding: "0.75rem 1.5rem", cursor: "pointer"
            }}>
            Recargar página
          </button>
          {import.meta.env.DEV && (
            <pre style={{ marginTop: "2rem", fontSize: "0.8rem", color: "#94a3b8", maxWidth: "100%", overflow: "auto" }}>
              {this.state.error?.stack}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
