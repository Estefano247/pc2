import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createClient } from "@supabase/supabase-js";
import { AuthContext } from "../contexts/AuthContext";
import { CartContext } from "../contexts/CartContext";
import ErrorBoundary from "../components/ErrorBoundary";
import NavSidebar from "../components/NavSidebar";
import AuthBar from "../components/AuthBar";

function AuthWrapper(user) {
  const Wrapper = ({ children }) => (
    <AuthContext.Provider value={{ user, loading: false, login: vi.fn(), logout: vi.fn() }}>
      <CartContext.Provider value={{ cart: [], addToCart: vi.fn(), removeItem: vi.fn(), clearCart: vi.fn(), total: 0, cantidadTotal: 0 }}>
        {children}
      </CartContext.Provider>
    </AuthContext.Provider>
  );
  Wrapper.displayName = "AuthWrapper";
  return Wrapper;
}

describe("Supabase client", () => {
  it("creates a client without crashing", () => {
    const supabase = createClient("https://test.supabase.co", "test-key");
    expect(supabase).toBeDefined();
    expect(supabase.from).toBeInstanceOf(Function);
    expect(supabase.auth).toBeDefined();
    expect(supabase.rpc).toBeInstanceOf(Function);
  });
});

describe("ErrorBoundary", () => {
  it("renders children when no error", () => {
    render(
      <ErrorBoundary>
        <p>Hola mundo</p>
      </ErrorBoundary>
    );
    expect(screen.getByText("Hola mundo")).toBeInTheDocument();
  });

  it("renders fallback on error", () => {
    const Bomb = () => { throw new Error("fail"); };
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );
    expect(screen.getByText("Algo salió mal")).toBeInTheDocument();
    expect(screen.getByText("Recargar página")).toBeInTheDocument();
    spy.mockRestore();
  });
});

describe("NavSidebar", () => {
  it("renders navigation links", () => {
    render(<NavSidebar view="tienda" onNavigate={() => {}} />, { wrapper: AuthWrapper(null) });
    expect(screen.getByText("Tienda")).toBeInTheDocument();
    expect(screen.getByText("Mis Órdenes")).toBeInTheDocument();
    expect(screen.getByText("Panel Admin")).toBeInTheDocument();
  });

  it("shows logout when user is logged in", () => {
    render(<NavSidebar view="tienda" onNavigate={() => {}} />, { wrapper: AuthWrapper({ id: "1" }) });
    expect(screen.getByText("Cerrar Sesión")).toBeInTheDocument();
  });
});

describe("AuthBar", () => {
  it("shows login text when no user", () => {
    render(<AuthBar onLoginClick={() => {}} />, { wrapper: AuthWrapper(null) });
    expect(screen.getByText("No has iniciado sesión")).toBeInTheDocument();
    expect(screen.getByText("Iniciar Sesión")).toBeInTheDocument();
  });

  it("shows email when user logged in", () => {
    render(<AuthBar onLoginClick={() => {}} />, { wrapper: AuthWrapper({ email: "test@test.com" }) });
    expect(screen.getByText(/test@test.com/)).toBeInTheDocument();
    expect(screen.getByText("Cerrar Sesión")).toBeInTheDocument();
  });
});
