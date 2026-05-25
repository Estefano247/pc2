import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: { outDir: "dist" },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/setupTests.js",
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      thresholds: {
        lines: 50,
        functions: 50,
        branches: 40,
        statements: 50,
      },
      include: ["src/**/*.{js,jsx}"],
      exclude: ["src/**/*.test.{js,jsx}", "src/setupTests.js", "src/main.jsx"],
    },
  },
});
