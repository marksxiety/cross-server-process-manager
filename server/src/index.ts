import '../config/env';
import db from './Persistence/Connection';
import { ensureAdminAccount } from './Services/AdminBootstrapService';

const MIN_PORT = 1;
const MAX_PORT = 65535;

function resolvePort(): number {
    const rawPort = process.env.SERVER_PORT;
    const port = Number(rawPort);
    if (!rawPort || !Number.isInteger(port) || port < MIN_PORT || port > MAX_PORT) {
        throw new Error(
            `SERVER_PORT is not set or invalid (received "${rawPort ?? ''}"). ` +
                'Set SERVER_PORT in .env (e.g. SERVER_PORT=5638).'
        );
    }
    return port;
}

async function main(): Promise<void> {
    const port = resolvePort();

    await ensureAdminAccount();

    const { createApp } = await import('./bootstrap/app.js');
    const app = createApp();
    const server = app.listen(port, () => {
        setImmediate(() => {
            if (!server.listening) return;
            console.log(`XPM server listening on http://localhost:${port}`);
        });
    });

    server.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE') {
            console.error(
                `XPM server failed to start: port ${port} is already in use. ` +
                    'Stop the process holding it and retry.'
            );
        } else {
            console.error('XPM server failed to start:', error);
        }
        process.exit(1);
    });
}

main().catch(async (error: unknown) => {
    console.error(
        'XPM server failed to start:',
        error instanceof Error ? error.message : error
    );
    await db.close().catch(() => undefined);
    process.exit(1);
});
