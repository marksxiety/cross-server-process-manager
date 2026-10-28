import type { Request } from 'express';

const IPV4_MAPPED_PREFIX = '::ffff:';

/** Normalizes the Express client IP; strips the IPv4-mapped IPv6 prefix. */
export function clientIp(req: Request): string | null {
    const ip = req.ip ?? req.socket?.remoteAddress;
    if (!ip) return null;
    return ip.startsWith(IPV4_MAPPED_PREFIX) ? ip.slice(IPV4_MAPPED_PREFIX.length) : ip;
}
