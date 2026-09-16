export interface RegisteredServer {
    server: string;
    protocol: "http" | "https";
    host: string;
    port: number;
}