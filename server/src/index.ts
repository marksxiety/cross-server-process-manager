import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import './config/env';
import { health } from './controllers/healthController';
import { index as servers, register, update, remove } from './controllers/serverController';
import { index as templates, create as createTemplate, update as updateTemplate, remove as removeTemplate } from './controllers/templateController';
import { fail } from './utils/response';

const app = express();

const MIN_PORT = 1;
const MAX_PORT = 65535;

const rawPort = process.env.SERVER_PORT;
const port = Number(rawPort);
if (!rawPort || !Number.isInteger(port) || port < MIN_PORT || port > MAX_PORT) {
    console.error(
        `XPM server failed to start: SERVER_PORT is not set or invalid (received "${rawPort ?? ''}"). ` +
            'Set SERVER_PORT in .env (e.g. SERVER_PORT=5638).'
    );
    process.exit(1);
}

app.use(cors());
app.use(express.json());

app.get('/', health);
app.get('/servers', servers);
app.post('/register', register);
app.put('/servers/:id', update);
app.delete('/servers/:id', remove);
app.get('/templates', templates);
app.post('/templates', createTemplate);
app.put('/templates/:id', updateTemplate);
app.delete('/templates/:id', removeTemplate);

app.use((req: Request, res: Response) => {
    fail(res, 404, `Route ${req.method} ${req.originalUrl} not found`, 'NOT_FOUND');
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    fail(res, 500, 'Internal server error', 'INTERNAL_SERVER_ERROR');
});

const server = app.listen(port, () => {
    // Windows can emit the bind error after the listen callback, so confirm the
    // server is still listening before announcing success.
    setImmediate(() => {
        if (!server.listening) return;
        console.log(`XPM server listening on http://localhost:${port}`);
    });
});

// Surfaces listen failures (e.g. a stale process holding the port) on stderr
// instead of an unhandled error event.
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
