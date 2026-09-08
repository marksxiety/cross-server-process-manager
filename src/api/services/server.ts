import servers from "@/data/servers.json";
import type { ApiResponse } from "@/types";

export interface ServerEntry {
  id: string;
  name: string;
  ip_address: string;
  url: string;
}

function getHostname(url: string) {
  return new URL(url).hostname;
}

export async function fetchServerList(): Promise<ApiResponse<ServerEntry[]>> {
  // TODO: servers.json is a placeholder — replace with external endpoint if database/backend is implemeted
  return {
    success: true,
    message: "ok",
    info: servers.map((server) => {
      const ip_address = getHostname(server.url);
      return { id: ip_address, name: server.server, ip_address, url: server.url };
    }),
    status: 200,
  };
}