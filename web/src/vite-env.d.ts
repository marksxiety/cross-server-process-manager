/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

interface ImportMetaEnv {
    readonly VITE_PROTOCOL: string;
    readonly VITE_HOST: string;
    readonly VITE_PORT: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
