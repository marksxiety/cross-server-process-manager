import path from 'node:path';
import dotenv from 'dotenv';

// Loads the shared root .env so the server and the UI read one file.
// The candidate list covers tsx source runs, compiled dist runs, and commands
// invoked from either the repo root or the server workspace.
dotenv.config({
    path: [
        path.resolve(process.cwd(), '../.env'),
        path.resolve(process.cwd(), '.env'),
        path.resolve(process.cwd(), 'server/.env'),
        path.resolve(__dirname, '../../.env'),
        path.resolve(__dirname, '../../../.env'),
        path.resolve(__dirname, '../.env'),
    ],
    // The root .env is the source of truth. Without this, PM2/OS values already
    // present in process.env win and a normal PM2 restart keeps stale settings.
    override: true,
});

export {};
