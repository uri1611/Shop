import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Todo lo que empiece con /api se reenvía al backend.
    // Así el frontend llama a "/api/..." sin preocuparse por CORS.
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
});
