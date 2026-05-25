import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";

const CART_KEY = "libreria_cart";
export const CartContext = createContext(null);

function loadCart() {
  try {
    const saved = localStorage.getItem(CART_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [cart, setCart] = useState(loadCart);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart]);

  const addToCart = useCallback((libro, cantidad = 1) => {
    setCart((prev) => {
      const exist = prev.find((c) => c.id === libro.id);
      if (exist) {
        return prev.map((c) =>
          c.id === libro.id ? { ...c, cantidad: c.cantidad + cantidad } : c
        );
      }
      return [
        ...prev,
        {
          id: libro.id,
          titulo: libro.titulo,
          precio: Number(libro.precio),
          cantidad,
        },
      ];
    });
  }, []);

  const removeItem = useCallback((index) => {
    setCart((prev) => prev.filter((_, idx) => idx !== index));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const total = useMemo(() => cart.reduce((s, i) => s + Number(i.precio) * i.cantidad, 0), [cart]);
  const cantidadTotal = useMemo(() => cart.reduce((s, i) => s + i.cantidad, 0), [cart]);

  return (
    <CartContext.Provider value={{ cart, setCart, addToCart, removeItem, clearCart, total, cantidadTotal }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
