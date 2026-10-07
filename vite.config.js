import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  envPrefix: ["VITE_", "AUTH0_"],
  server: {
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});
