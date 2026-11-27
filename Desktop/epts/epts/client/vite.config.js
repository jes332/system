import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Requests to /api are passed on to the Node server
export default defineConfig({
  plugins: [react()],
  server: { proxy: { "/api": "http://localhost:3001" } },
});
