import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      // Avoid CORS/host mismatch by proxying API requests through the Vite dev server.
      "/graph": "http://localhost:4000",
      "/query": "http://localhost:4000"
    }
  }
});

