/// <reference types="vitest/config" />
import fs from "node:fs";
import path from "path";
import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from "@tailwindcss/vite";

const rootPackage = JSON.parse(
  fs.readFileSync(path.resolve(import.meta.dirname, "../package.json"), "utf8"),
) as { version: string };

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(rootPackage.version),
  },
  plugins: [
    react(),
    tailwindcss(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  envDir: path.resolve(import.meta.dirname, ".."),
  server: {
    host: true,
  },
  preview: {
    host: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    include: ["src/tests/**/*.test.{ts,tsx}"],
  },
})
