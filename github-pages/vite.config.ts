import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  root: path.resolve(__dirname),
  base: "/carlossilvia-forever/",
  publicDir: path.resolve(__dirname, "../public"),
  plugins: [react()],
  build: { outDir: path.resolve(__dirname, "dist"), emptyOutDir: true },
});
