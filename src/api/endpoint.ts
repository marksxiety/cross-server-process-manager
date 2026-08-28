const PM2_BASE_PATH = "/pm2"

export const ENDPOINTS = {
    list: `${PM2_BASE_PATH}/list`,
    health: `${PM2_BASE_PATH}/health`,
    describe: (id: number) => `${PM2_BASE_PATH}/describe/${id}`,
    start: `${PM2_BASE_PATH}/start`,
    stop: (id: number) => `${PM2_BASE_PATH}/stop/${id}`,
    restart: (id: number) => `${PM2_BASE_PATH}/restart/${id}`,
    reload: (id: number) => `${PM2_BASE_PATH}/reload/${id}`,
    delete: (id: number) => `${PM2_BASE_PATH}/delete/${id}`,
    flush: (id?: number) =>
        id !== undefined ? `${PM2_BASE_PATH}/flush/${id}` : `${PM2_BASE_PATH}/flush`,
    logs: (id: number) => `${PM2_BASE_PATH}/logs/${id}`,
} as const

export function buildEndpointUrl(baseUrl: string, path: string): string {
    return `${baseUrl.replace(/\/+$/, "")}${path}`
}
