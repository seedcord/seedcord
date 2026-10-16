import { once } from 'node:events';
import { appendFile, writeFile } from 'node:fs/promises';
import { request as httpRequest } from 'node:http';
import { createServer as createNetServer } from 'node:net';
import { join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { writeSigningEnv } from '#tests/commands/build/edgeBot';
import { FAKE_TOKEN } from '#tests/commands/build/smoke';

import {
    captureLogs,
    edgeProject,
    editFile,
    messagesOf,
    startedRuntime,
    WAVE_INTERACTION,
    waveHandler,
    writeDevVars
} from './edgeDevRuntime';

import type { DevEvent } from '#commands/dev/runtime/events';
import type { IncomingMessage } from 'node:http';
import type { AddressInfo } from 'node:net';

describe('EdgeDevRuntime endpoint', () => {
    describe('on one started bot', () => {
        const events: DevEvent[] = [];
        const eventsBeforeBot: DevEvent[] = [];
        let port = 0;

        beforeAll(async () => {
            await using cleanup = new AsyncDisposableStack();
            const project = cleanup.use(await edgeProject());
            const started = cleanup.use(await startedRuntime(project.projectDir, (event) => events.push(event)));
            eventsBeforeBot.push(...events);
            await started.runtime.startBot(started.instance);
            port = started.port();
            const owned = cleanup.move();
            return () => owned.disposeAsync();
        }, 120_000);

        it('reports the port the system picked for port 0 once the worker has started', async () => {
            const unsigned = await fetch(`http://localhost:${port}/`, { method: 'POST', body: '{}' });

            expect(port).toBeGreaterThan(0);
            expect(eventsBeforeBot).not.toContainEqual({ type: 'server-listening', port });
            // the bot answers an unsigned interaction with 401
            expect(unsigned.status).toBe(401);
        });

        it('answers a POST that arrives through a tunnel hostname', async () => {
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
        });

        it.each(['/interactions', '/?probe=1', '/src/bot.ts'])('passes a POST to %s on to the bot', async (path) => {
            const unsigned = await fetch(`http://localhost:${port}${path}`, { method: 'POST', body: '{}' });

            expect(unsigned.status).toBe(401);
        });
    });

    it('throws PortInUse with the seedcord config when something already listens on port', async () => {
        await using holder = createNetServer().listen(0, '127.0.0.1');
        await once(holder, 'listening');
        // justified: address() is AddressInfo once a TCP server is listening
        const { port } = holder.address() as AddressInfo;
        await using project = await edgeProject();

        await expect(startedRuntime(project.projectDir, undefined, port)).rejects.toMatchObject({
            code: SeedcordErrorCode.PortInUse,
            message: expect.stringContaining('seedcord.config.ts') as string
        });
    }, 120_000);

    it('runs the saved version of a handler in the worker', async () => {
        await using project = await edgeProject();
        const { projectDir } = project;
        const { publicKey, sign } = await writeSigningEnv(projectDir);
        await writeDevVars(projectDir, { DISCORD_BOT_TOKEN: FAKE_TOKEN, DISCORD_PUBLIC_KEY: publicKey });
        const handler = join(projectDir, 'src/handlers/Wave.ts');
        await writeFile(handler, waveHandler('waved v1'));
        const logs = captureLogs();
        await using started = await startedRuntime(projectDir);
        const { runtime, instance } = started;
        await runtime.startBot(instance);
        const wave = async (): Promise<void> => {
            const body = WAVE_INTERACTION;
            await fetch(`http://localhost:${started.port()}/`, { method: 'POST', body, headers: await sign(body) });
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

    it('asks for a restart when a file bot.ts imports is saved', async () => {
        await using project = await edgeProject();
        const { projectDir } = project;
        const greeting = join(projectDir, 'src/greeting.ts');
        await writeFile(greeting, "export const greeting = 'before';\n");
        await editFile(join(projectDir, 'src/bot.ts'), (text) => `import './greeting';\n${text}`);
        const events: DevEvent[] = [];
        await using started = await startedRuntime(projectDir, (event) => events.push(event));
        const { runtime, instance } = started;
        await runtime.startBot(instance);

        await writeFile(greeting, "export const greeting = 'after';\n");

        await vi.waitFor(() => {
            expect(events).toContainEqual({ type: 'restart-required' });
        });
    }, 120_000);

    it.each(['.dev.vars', '.env', 'wrangler.jsonc'])(
        'reports a restart is required when %s changes, and keeps the bot answering',
        async (file) => {
            await using project = await edgeProject();
            const { projectDir } = project;
            const events: DevEvent[] = [];
            await using started = await startedRuntime(projectDir, (event) => events.push(event));
            const { runtime, instance } = started;
            await runtime.startBot(instance);

            await appendFile(join(projectDir, file), file === 'wrangler.jsonc' ? '\n' : 'EXTRA=1\n');

            await vi.waitFor(() => {
                expect(events).toContainEqual({ type: 'restart-required' });
            });
            const unsigned = await fetch(`http://localhost:${started.port()}/`, { method: 'POST', body: '{}' });
            expect(unsigned.status).toBe(401);
        },
        120_000
    );
});
