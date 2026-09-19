export interface RegisteredServer {
    server: string
    protocol: 'http' | 'https'
    host: string
    port: number
    is_active: boolean
}

export type RegisterServer = RegisteredServer