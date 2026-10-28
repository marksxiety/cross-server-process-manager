export function registryTarget() {
  return {
    protocol: import.meta.env.VITE_SERVER_PROTOCOL as 'http' | 'https',
    host: import.meta.env.VITE_SERVER_HOST,
    port: Number(import.meta.env.VITE_SERVER_PORT),
  }
}
