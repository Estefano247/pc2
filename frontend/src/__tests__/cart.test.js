import { describe, it, expect, beforeEach } from "vitest";

const CART_KEY = "libreria_cart";

function loadCart() {
  try {
    const saved = localStorage.getItem(CART_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function addToCart(cart, item) {
  const exist = cart.find((c) => c.id === item.id);
  return exist
    ? cart.map((c) => (c.id === item.id ? { ...c, cantidad: c.cantidad + 1 } : c))
    : [...cart, { ...item, cantidad: 1 }];
}

function removeFromCart(cart, id) {
  return cart.filter((c) => c.id !== id);
}

function calcTotal(cart) {
  return cart.reduce((s, i) => s + i.precio * i.cantidad, 0);
}

describe("Cart logic", () => {
  beforeEach(() => localStorage.clear());

  it("starts empty", () => {
    expect(loadCart()).toEqual([]);
  });

  it("adds item to cart", () => {
    const cart = addToCart([], { id: "1", titulo: "Libro A", precio: 10 });
    expect(cart).toHaveLength(1);
    expect(cart[0].cantidad).toBe(1);
  });

  it("increments quantity for existing item", () => {
    const cart = addToCart([{ id: "1", titulo: "Libro A", precio: 10, cantidad: 1 }], { id: "1", titulo: "Libro A", precio: 10 });
    expect(cart).toHaveLength(1);
    expect(cart[0].cantidad).toBe(2);
  });

  it("removes item from cart", () => {
    const cart = removeFromCart([{ id: "1", titulo: "Libro A", precio: 10, cantidad: 1 }], "1");
    expect(cart).toHaveLength(0);
  });

  it("calculates total correctly", () => {
    const cart = [
      { id: "1", titulo: "A", precio: 10, cantidad: 2 },
      { id: "2", titulo: "B", precio: 5, cantidad: 3 },
    ];
    expect(calcTotal(cart)).toBe(35);
  });

  it("persists and loads from localStorage", () => {
    const items = [{ id: "1", titulo: "A", precio: 10, cantidad: 1 }];
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    expect(loadCart()).toEqual(items);
  });

  it("handles corrupted localStorage", () => {
    localStorage.setItem(CART_KEY, "not-json");
    expect(loadCart()).toEqual([]);
  });
});
