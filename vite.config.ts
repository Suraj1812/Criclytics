import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (contains(id, "node_modules/hls.js")) {
            return "hls";
          }

          if (contains(id, "node_modules/react-router")) {
            return "router";
          }

          if (contains(id, "node_modules/@tanstack/react-query")) {
            return "query";
          }

          if (contains(id, "node_modules/framer-motion")) {
            return "motion";
          }

          if (contains(id, "node_modules/lucide-react")) {
            return "icons";
          }

          if (contains(id, "node_modules/@radix-ui") || contains(id, "node_modules/class-variance-authority")) {
            return "ui";
          }

          if (contains(id, "node_modules/react") || contains(id, "node_modules/react-dom") || contains(id, "node_modules/scheduler")) {
            return "react-vendor";
          }
        }
      }
    }
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname
    }
  },
  server: {
    port: 5173,
    proxy: {
      "/health": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true
      },
      "/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true
      }
    }
  }
});

function contains(value: string, search: string) {
  return value.indexOf(search) >= 0;
}
