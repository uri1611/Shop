import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Lo que empiece con /api o /uploads se reenvía al backend.
    // Así el frontend usa rutas relativas sin preocuparse por CORS.
    proxy: {
      "/api": "http://localhost:3000",
      "/uploads": "http://localhost:3000",
    },
  },
});
