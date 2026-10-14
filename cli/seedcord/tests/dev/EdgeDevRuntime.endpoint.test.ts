import { once } from 'node:events';
import { appendFile, writeFile } from 'node:fs/promises';
import { request as httpRequest } from 'node:http';
import { createServer as createNetServer } from 'node:net';
import { join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it, vi } from 'vitest';

import { writeSigningEnv } from '#tests/commands/build/edgeBot';
import { FAKE_TOKEN } from '#tests/commands/build/smoke';

import {
    captureLogs,
    edgeProject,
    messagesOf,
    startedRuntime,
    WAVE_INTERACTION,
    waveHandler,
    writeDevVars
} from './edgeDevRuntime';

import type { DevEvent } from '#commands/dev/runtime/events';
import type { IncomingMessage } from 'node:http';

describe('EdgeDevRuntime endpoint', () => {
    it("reports the wrangler config's dev.port once the worker has started", async () => {
        const { projectDir, port } = await edgeProject();
        const events: DevEvent[] = [];
        const { runtime, instance } = await startedRuntime(projectDir, (event) => events.push(event));
        expect(events).not.toContainEqual({ type: 'server-listening', port });
        await runtime.startBot(instance);

        const unsigned = await fetch(`http://localhost:${port}/`, { method: 'POST', body: '{}' });

        expect(events).toContainEqual({ type: 'server-listening', port });
        // the bot answers an unsigned interaction with 401
        expect(unsigned.status).toBe(401);
    }, 120_000);

    it('answers a POST that arrives through a tunnel hostname', async () => {
        const { projectDir, port } = await edgeProject();
        const { runtime, instance } = await startedRuntime(projectDir);
        await runtime.startBot(instance);

        const request = httpRequest({
            port,
            method: 'POST',
            path: '/',
            headers: { host: 'quick-name.trycloudflare.com' }
        }).end('{}');
        // justified: a ClientRequest emits 'response' with one IncomingMessage
        const [response] = (await once(request, 'response')) as [IncomingMessage];
        response.resume();

        expect(response.statusCode).toBe(401);
    }, 120_000);

    it.each(['/interactions', '/?probe=1', '/src/bot.ts'])(
        'passes a POST to %s on to the bot',
        async (path) => {
            const { projectDir, port } = await edgeProject();
            const { runtime, instance } = await startedRuntime(projectDir);
            await runtime.startBot(instance);

            const unsigned = await fetch(`http://localhost:${port}${path}`, { method: 'POST', body: '{}' });

            expect(unsigned.status).toBe(401);
            expect(await unsigned.text()).not.toContain('Seedcord');
        },
        120_000
    );

    it('throws CliEdgeDevPortInUse when something already listens on dev.port', async () => {
        const { projectDir, port } = await edgeProject();
        await using holder = createNetServer().listen(port);
        await once(holder, 'listening');

        await expect(startedRuntime(projectDir)).rejects.toHaveProperty('code', SeedcordErrorCode.CliEdgeDevPortInUse);
    }, 120_000);

    it("answers a GET with 405 and keeps the bot's source off it", async () => {
        const { projectDir, port } = await edgeProject();
        await startedRuntime(projectDir);

        const source = await fetch(`http://localhost:${port}/src/bot.ts`);

        expect(source.status).toBe(405);
        expect(await source.text()).not.toContain('Seedcord');
    }, 120_000);

    it('runs the saved version of a handler in the worker', async () => {
        const { projectDir, port } = await edgeProject();
        const { publicKey, sign } = await writeSigningEnv(projectDir);
        await writeDevVars(projectDir, { DISCORD_BOT_TOKEN: FAKE_TOKEN, DISCORD_PUBLIC_KEY: publicKey });
        const handler = join(projectDir, 'src/handlers/Wave.ts');
        await writeFile(handler, waveHandler('waved v1'));
        const logs = captureLogs();
        const { runtime, instance } = await startedRuntime(projectDir);
        await runtime.startBot(instance);
        const wave = async (): Promise<void> => {
            const body = WAVE_INTERACTION;
            await fetch(`http://localhost:${port}/`, { method: 'POST', body, headers: await sign(body) });
        };

        await writeFile(handler, waveHandler('waved v2'));

        await vi.waitFor(
            async () => {
                await wave();
                expect(messagesOf(logs)).toContainEqual(expect.stringContaining('waved v2'));
            },
            { timeout: 20_000, interval: 500 }
        );
    }, 120_000);

    it.each(['.dev.vars', '.env', 'wrangler.jsonc'])(
        'reports a restart is required when %s changes, and keeps the bot answering',
        async (file) => {
            const { projectDir, port } = await edgeProject();
            const events: DevEvent[] = [];
            const { runtime, instance } = await startedRuntime(projectDir, (event) => events.push(event));
            await runtime.startBot(instance);

            await appendFile(join(projectDir, file), file === 'wrangler.jsonc' ? '\n' : 'EXTRA=1\n');

            await vi.waitFor(() => {
                expect(events).toContainEqual({ type: 'restart-required' });
            });
            const unsigned = await fetch(`http://localhost:${port}/`, { method: 'POST', body: '{}' });
            expect(unsigned.status).toBe(401);
        },
        120_000
    );
});
