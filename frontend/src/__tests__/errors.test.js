import { describe, it, expect } from "vitest";

const ERROR_MSGS = {
  "stock_insuficiente": "Stock insuficiente para completar la compra",
  "Stock insuficiente": "Stock insuficiente para completar la compra",
  "Carrito vac": "El carrito está vacío",
  "Dirección de envío requerida": "Dirección de envío requerida",
};

function userError(msg) {
  const loginErrors = {
    "Invalid login credentials": "Email o contraseña incorrectos",
    "Email not confirmed": "Debes confirmar tu email antes de iniciar sesión",
    "rate_limit": "Demasiados intentos. Espera unos minutos.",
  };
  if (!msg) return "Error del servidor";
  for (const [key, val] of Object.entries(loginErrors)) {
    if (msg.includes(key)) return val;
  }
  for (const [key, val] of Object.entries(ERROR_MSGS)) {
    if (msg.includes(key)) return val;
  }
  return "Error al procesar la operación. Intenta de nuevo.";
}

describe("Error translation - login", () => {
  it("translates invalid credentials", () => {
    expect(userError("Invalid login credentials")).toBe("Email o contraseña incorrectos");
  });

  it("translates rate limit", () => {
    expect(userError("rate_limit exceeded, try again")).toBe("Demasiados intentos. Espera unos minutos.");
  });
});

describe("Error translation - checkout", () => {
  it("translates stock error with underscore", () => {
    expect(userError("stock_insuficiente")).toBe("Stock insuficiente para completar la compra");
  });

  it("translates stock error with Spanish text", () => {
    expect(userError("Stock insuficiente para el libro")).toBe("Stock insuficiente para completar la compra");
  });

  it("translates empty cart", () => {
    expect(userError("Carrito vacío")).toBe("El carrito está vacío");
  });
});

describe("Error translation - fallback", () => {
  it("returns generic for unknown errors", () => {
    expect(userError("something unexpected")).toBe("Error al procesar la operación. Intenta de nuevo.");
  });

  it("handles null message", () => {
    expect(userError(null)).toBe("Error del servidor");
  });

  it("handles empty string", () => {
    expect(userError("")).toBe("Error del servidor");
  });
});
