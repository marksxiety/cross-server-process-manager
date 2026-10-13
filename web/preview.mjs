import { preview } from "vite";

const port = Number(process.env.VITE_WEB_PORT || 3000);

await preview({
  preview: {
    port,
    host: true,
    strictPort: true,
  },
});
