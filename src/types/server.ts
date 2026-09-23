export interface ServerInput {
    server: string
    protocol: 'http' | 'https'
    host: string
    port: number
    is_active: boolean
}

export interface RegisteredServer extends ServerInput {
    id: number
}
