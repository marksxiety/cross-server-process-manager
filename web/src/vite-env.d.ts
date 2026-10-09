/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

interface ImportMetaEnv {
    readonly VITE_SERVER_PROTOCOL: string;
    readonly VITE_SERVER_HOST: string;
    readonly VITE_SERVER_PORT: string;
    readonly VITE_AGENT_AUTH_TOKEN: string;
    readonly VITE_USE_FIXTURES: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
