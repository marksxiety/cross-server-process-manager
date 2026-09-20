import path from 'node:path';
import dotenv from 'dotenv';

// Loads the shared root .env so the server and the UI read one file.
// From both server/src/config (tsx) and server/dist/config (node dist),
// ../../../.env resolves to the repo root. server/.env stays as a fallback.
dotenv.config({
    path: [
        path.resolve(__dirname, '../../../.env'),
        path.resolve(__dirname, '../../.env'),
        path.resolve(process.cwd(), '../.env'),
        path.resolve(process.cwd(), '.env'),
    ],
});

export {};
