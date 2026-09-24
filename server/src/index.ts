import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import './config/env';
import { health } from './controllers/healthController';
import { index as servers, register, update, remove } from './controllers/serverController';
import { index as templates } from './controllers/templateController';
import { fail } from './utils/response';

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(cors());
app.use(express.json());

app.get('/', health);
app.get('/servers', servers);
app.post('/register', register);
app.put('/servers/:id', update);
app.delete('/servers/:id', remove);
app.get('/templates', templates);

app.use((req: Request, res: Response) => {
    fail(res, 404, `Route ${req.method} ${req.originalUrl} not found`, 'NOT_FOUND');
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    fail(res, 500, 'Internal server error', 'INTERNAL_SERVER_ERROR');
});

app.listen(port, () => {
    console.log(`XPM server listening on http://localhost:${port}`);
});
