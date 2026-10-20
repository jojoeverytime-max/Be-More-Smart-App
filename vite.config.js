import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  envPrefix: ["VITE_", "AUTH0_"],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        configure(proxy) {
          proxy.on("proxyReq", (proxyRequest) => {
            proxyRequest.removeHeader("origin");
          });
        },
      },
    },
  },
});
