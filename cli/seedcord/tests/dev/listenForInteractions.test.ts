import { LoggerChannelRegistry } from '@seedcord/logger';
import { describe, expect, it, onTestFinished } from 'vitest';

import { listenForInteractions } from '#commands/dev/runtime/listenForInteractions';

import type { LogRecord } from '@seedcord/types';
import type { Connect } from 'vite';

// justified: a Connect app is a request handler, the endpoint calls nothing else on it
function middlewares(handle: (url: string | undefined, next: (error?: unknown) => void) => void): Connect.Server {
    return ((request: { url?: string }, _response: unknown, next: (error?: unknown) => void) =>
        handle(request.url, next)) as unknown as Connect.Server;
}

async function listening(app: Connect.Server): Promise<string> {
    const { server, port } = await listenForInteractions(app, 0, 'wrangler.jsonc');
    onTestFinished(() => {
        server.close();
    });
    return `http://localhost:${String(port)}`;
}

describe('listenForInteractions', () => {
    it('hands every POST to the worker as /', async () => {
        const seen: (string | undefined)[] = [];
        const url = await listening(
            middlewares((path, next) => {
                seen.push(path);
                next();
            })
        );

        await fetch(`${url}/interactions?probe=1`, { method: 'POST', body: '{}' });

        expect(seen).toEqual(['/']);
    });

    it('answers a GET with 405 and never reaches the worker', async () => {
        const seen: (string | undefined)[] = [];
        const url = await listening(middlewares((path) => seen.push(path)));

        const response = await fetch(`${url}/src/bot.ts`);

        expect(response.status).toBe(405);
        expect(seen).toEqual([]);
    });

    it('answers 500 and logs the error a middleware passes on', async () => {
        const records: LogRecord[] = [];
        const sink = LoggerChannelRegistry.instance.installSink({ kind: 'capture', onLog: (r) => records.push(r) });
        onTestFinished(() => sink.dispose());
        const url = await listening(middlewares((_path, next) => next(new Error('worker crashed'))));

        const response = await fetch(url, { method: 'POST', body: '{}' });

        expect(response.status).toBe(500);
        const failure = records.find((record) => record.level === 'error');
        expect(failure?.args?.[0]).toBeInstanceOf(Error);
    });
});
