import { createServer } from 'node:net';

import { onTestFinished } from 'vitest';

// vite's default hmr websocket port
const VITE_HMR_PORT = 24_678;

// a dev server in another test worker may already hold it
export async function holdViteHmrPort(): Promise<void> {
    const holder = createServer();
    await new Promise<void>((resolve) => {
        holder.once('error', () => resolve());
        holder.listen(VITE_HMR_PORT, () => resolve());
    });
    onTestFinished(() => new Promise<void>((resolve) => holder.close(() => resolve())));
}
