/// <reference types="vitest/config" />
import fs from "node:fs";
import path from "path";
import { defineConfig, loadEnv } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from "@tailwindcss/vite";

const rootPackage = JSON.parse(
  fs.readFileSync(path.resolve(import.meta.dirname, "../package.json"), "utf8"),
) as { version: string };

const envDir = path.resolve(import.meta.dirname, "..");

const MIN_PORT = 1;
const MAX_PORT = 65535;

function resolveWebPort(raw: string | undefined): number | undefined {
  if (raw === undefined || raw === "") return undefined;
  const port = Number(raw);
  if (!Number.isInteger(port) || port < MIN_PORT || port > MAX_PORT) {
    throw new Error(
      `VITE_WEB_PORT must be an integer between ${MIN_PORT} and ${MAX_PORT} (received "${raw}")`,
    );
  }
  return port;
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, envDir);
  const webPort = resolveWebPort(env.VITE_WEB_PORT);

  return {
    define: {
      __APP_VERSION__: JSON.stringify(rootPackage.version),
    },
    plugins: [
      react(),
      tailwindcss(),
      babel({ presets: [reactCompilerPreset()] })
    ],
    envDir,
    server: {
      host: true,
      port: webPort,
    },
    preview: {
      host: true,
      port: webPort,
    },
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
      },
    },
    test: {
      include: ["src/tests/**/*.test.{ts,tsx}"],
    },
  };
})
