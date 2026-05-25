import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase for integration-style tests
vi.mock("../lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      then: vi.fn((cb) => cb({ data: [], error: null })),
    }),
    rpc: vi.fn(),
  },
}));

import { normalizeError } from "../lib/supabaseHelpers";

import { CartProvider, useCart } from "../contexts/CartContext";
import { renderHook, act } from "@testing-library/react";

describe("normalizeError - edge cases", () => {
  it("handles Error object", () => {
    expect(normalizeError(new Error("stock_insuficiente"))).toBe(
      "Stock insuficiente para completar la compra"
    );
  });

  it("handles object with description", () => {
    expect(normalizeError({ description: "Invalid login credentials" })).toBe(
      "Email o contraseña incorrectos"
    );
  });

  it("handles permission errors", () => {
    expect(normalizeError("permission denied for table autores")).toBe(
      "No tienes permisos para esta acción"
    );
    expect(normalizeError("42501: permission denied")).toBe(
      "No tienes permisos para esta acción"
    );
  });
});

describe("CartContext - integración", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  it("starts with empty cart", () => {
    const { result } = renderHook(() => useCart(), {
      wrapper: ({ children }) => <CartProvider>{children}</CartProvider>,
    });
    expect(result.current.cart).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.cantidadTotal).toBe(0);
  });

  it("adds item to cart", () => {
    const { result } = renderHook(() => useCart(), {
      wrapper: ({ children }) => <CartProvider>{children}</CartProvider>,
    });

    act(() => {
      result.current.addToCart({ id: "1", titulo: "Libro A", precio: 10 });
    });

    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].titulo).toBe("Libro A");
    expect(result.current.cart[0].cantidad).toBe(1);
    expect(result.current.total).toBe(10);
    expect(result.current.cantidadTotal).toBe(1);
  });

  it("increments quantity for existing item", () => {
    const { result } = renderHook(() => useCart(), {
      wrapper: ({ children }) => <CartProvider>{children}</CartProvider>,
    });

    act(() => {
      result.current.addToCart({ id: "1", titulo: "Libro A", precio: 10 });
    });
    act(() => {
      result.current.addToCart({ id: "1", titulo: "Libro A", precio: 10 });
    });

    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].cantidad).toBe(2);
    expect(result.current.total).toBe(20);
  });

  it("adds different items", () => {
    const { result } = renderHook(() => useCart(), {
      wrapper: ({ children }) => <CartProvider>{children}</CartProvider>,
    });

    act(() => {
      result.current.addToCart({ id: "1", titulo: "A", precio: 10 });
      result.current.addToCart({ id: "2", titulo: "B", precio: 5 });
    });

    expect(result.current.cart).toHaveLength(2);
    expect(result.current.total).toBe(15);
    expect(result.current.cantidadTotal).toBe(2);
  });

  it("removes item by index", () => {
    const { result } = renderHook(() => useCart(), {
      wrapper: ({ children }) => <CartProvider>{children}</CartProvider>,
    });

    act(() => {
      result.current.addToCart({ id: "1", titulo: "A", precio: 10 });
      result.current.addToCart({ id: "2", titulo: "B", precio: 5 });
    });

    act(() => {
      result.current.removeItem(0);
    });

    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].id).toBe("2");
    expect(result.current.total).toBe(5);
  });

  it("clears cart", () => {
    const { result } = renderHook(() => useCart(), {
      wrapper: ({ children }) => <CartProvider>{children}</CartProvider>,
    });

    act(() => {
      result.current.addToCart({ id: "1", titulo: "A", precio: 10 });
    });
    act(() => {
      result.current.clearCart();
    });

    expect(result.current.cart).toEqual([]);
    expect(result.current.total).toBe(0);
  });
});
