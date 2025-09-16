import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5183, strictPort: true },
  preview: { host: true, port: 5185, strictPort: true }
});
