import { once } from 'node:events';
import { appendFile, writeFile } from 'node:fs/promises';
import { request as httpRequest } from 'node:http';
import { createServer as createNetServer } from 'node:net';
import { join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { bindings, exports } from 'cf/config';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { writeCloudflareConfig, writeSigningEnv } from '#tests/commands/build/edgeBot';
import { FAKE_TOKEN } from '#tests/commands/build/smoke';
import { vitePluginsOf } from '#tests/vitePluginsOf';

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
import type { Plugin } from 'vite';

const WAVE_WITH_WORD = `import { SlashHandler, SlashRoute } from '@seedcord/http';

import { word } from '../word';

@SlashRoute('wave')
export class WaveHandler extends SlashHandler<'wave'> {
    public execute(): Promise<void> {
        console.log(word);
        return Promise.resolve();
    }
}
`;

const COUNTER_CLASS = `import { DurableObject } from 'cloudflare:workers';

export class Counter extends DurableObject {
    hello(): string {
        return 'hi';
    }
}
`;

const WAVE_CALLING_COUNTER = `import { SlashHandler, SlashRoute } from '@seedcord/http';
import { env } from 'cloudflare:workers';

interface CounterEnv {
    COUNTER: { getByName(name: string): { hello(): Promise<string> } };
}

@SlashRoute('wave')
export class WaveHandler extends SlashHandler<'wave'> {
    public async execute(): Promise<void> {
        const counter = (env as unknown as CounterEnv).COUNTER.getByName('one');
        console.log(\`counter says \${await counter.hello()}\`);
    }
}
`;

const BROKEN_WORD = 'word.ts is broken';

const throwsCircularOnBrokenWord: Plugin = {
    name: 'throws-circular-on-broken-word',
    transform(code, id) {
        if (!id.endsWith('/word.ts') || !code.includes('broken')) return undefined;
        const error = new Error(BROKEN_WORD);
        Reflect.set(error, 'self', error);
        throw error;
    }
};

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

        await expect(startedRuntime(project.projectDir, undefined, { devPort: port })).rejects.toMatchObject({
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

    // cloudflare/workers-sdk#16339
    it('logs the error a plugin throws with a circular field when a handler reload fails', async () => {
        await using project = await edgeProject();
        const { projectDir } = project;
        const word = join(projectDir, 'src/word.ts');
        await writeFile(word, "export const word = 'fine';\n");
        await writeFile(join(projectDir, 'src/handlers/Wave.ts'), WAVE_WITH_WORD);
        const logs = captureLogs();
        await using started = await startedRuntime(projectDir, undefined, {
            vitePlugins: vitePluginsOf(() => [throwsCircularOnBrokenWord])
        });
        await started.runtime.startBot(started.instance);

        await writeFile(word, "export const word = 'broken';\n");

        await vi.waitFor(
            () => {
                const failed = logs.find((record) => record.message.startsWith('Failed to reload'));
                expect(failed?.args?.[0]).toMatchObject({ message: expect.stringContaining(BROKEN_WORD) as string });
            },
            { timeout: 20_000, interval: 250 }
        );
    }, 120_000);

    it('asks for a restart when a file that bot.ts imports is saved, and keeps the bot answering', async () => {
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
        const unsigned = await fetch(`http://localhost:${started.port()}/`, { method: 'POST', body: '{}' });
        expect(unsigned.status).toBe(401);
    }, 120_000);

    it('reloads a handler saved after a file that bot.ts imports', async () => {
        await using project = await edgeProject();
        const { projectDir } = project;
        const { publicKey, sign } = await writeSigningEnv(projectDir);
        await writeDevVars(projectDir, { DISCORD_BOT_TOKEN: FAKE_TOKEN, DISCORD_PUBLIC_KEY: publicKey });
        const greeting = join(projectDir, 'src/greeting.ts');
        const wave = join(projectDir, 'src/handlers/Wave.ts');
        await writeFile(greeting, "export const greeting = 'before';\n");
        await writeFile(wave, waveHandler('waved before'));
        await editFile(join(projectDir, 'src/bot.ts'), (text) => `import './greeting';\n${text}`);
        const logs = captureLogs();
        const events: DevEvent[] = [];
        await using started = await startedRuntime(projectDir, (event) => events.push(event));
        await started.runtime.startBot(started.instance);
        await writeFile(greeting, "export const greeting = 'after';\n");
        await vi.waitFor(() => {
            expect(events).toContainEqual({ type: 'restart-required' });
        });

        await writeFile(wave, waveHandler('waved after'));

        let interaction = 0;
        await vi.waitFor(
            async () => {
                interaction++;
                const body = JSON.stringify({ ...JSON.parse(WAVE_INTERACTION), id: String(interaction) });
                await fetch(`http://localhost:${started.port()}/`, { method: 'POST', body, headers: await sign(body) });
                expect(messagesOf(logs)).toContain('waved after');
            },
            { timeout: 20_000, interval: 500 }
        );
    }, 120_000);

    it('keeps the bot answering after bot.ts itself is saved', async () => {
        await using project = await edgeProject();
        const { projectDir } = project;
        const events: DevEvent[] = [];
        await using started = await startedRuntime(projectDir, (event) => events.push(event));
        const { runtime, instance } = started;
        await runtime.startBot(instance);

        await appendFile(join(projectDir, 'src/bot.ts'), '\n// saved again\n');

        await vi.waitFor(() => {
            expect(events).toContainEqual({ type: 'restart-required' });
        });
        const unsigned = await fetch(`http://localhost:${started.port()}/`, { method: 'POST', body: '{}' });
        expect(unsigned.status).toBe(401);
    }, 120_000);

    it('keeps a durable object from bot.ts answering after a file that bot.ts imports is saved', async () => {
        await using project = await edgeProject();
        const { projectDir } = project;
        const { publicKey, sign } = await writeSigningEnv(projectDir);
        await writeDevVars(projectDir, { DISCORD_BOT_TOKEN: FAKE_TOKEN, DISCORD_PUBLIC_KEY: publicKey });
        const greeting = join(projectDir, 'src/greeting.ts');
        await writeFile(greeting, "export const greeting = 'before';\n");
        await appendFile(join(projectDir, 'src/bot.ts'), `\nimport './greeting';\n${COUNTER_CLASS}`);
        await writeCloudflareConfig(projectDir, {
            env: { COUNTER: bindings.durableObject({ worker: 'edge-bot', exportName: 'Counter' }) },
            exports: { Counter: exports.durableObject({ storage: 'sqlite' }) }
        });
        await writeFile(join(projectDir, 'src/handlers/Wave.ts'), WAVE_CALLING_COUNTER);
        const logs = captureLogs();
        const events: DevEvent[] = [];
        await using started = await startedRuntime(projectDir, (event) => events.push(event));
        await started.runtime.startBot(started.instance);
        // the replay guard rejects a body it already saw with the same timestamp
        const wave = async (id: string): Promise<void> => {
            const body = JSON.stringify({ ...JSON.parse(WAVE_INTERACTION), id });
            await fetch(`http://localhost:${started.port()}/`, { method: 'POST', body, headers: await sign(body) });
        };
        const counterReplies = (): number => messagesOf(logs).filter((message) => message === 'counter says hi').length;
        await wave('1');
        await vi.waitFor(() => expect(counterReplies()).toBe(1));

        await writeFile(greeting, "export const greeting = 'after';\n");
        await vi.waitFor(() => {
            expect(events).toContainEqual({ type: 'restart-required' });
        });
        await wave('2');

        await vi.waitFor(() => expect(counterReplies()).toBe(2), { timeout: 10_000 });
    }, 120_000);

    describe('on one started bot in mode staging', () => {
        const events: DevEvent[] = [];
        let projectDir: string;
        let port = 0;

        beforeAll(async () => {
            await using cleanup = new AsyncDisposableStack();
            ({ projectDir } = cleanup.use(await edgeProject()));
            const started = cleanup.use(
                await startedRuntime(projectDir, (event) => events.push(event), { viteMode: 'staging' })
            );
            await started.runtime.startBot(started.instance);
            port = started.port();
            const owned = cleanup.move();
            return () => owned.disposeAsync();
        }, 120_000);

        it.each(['.dev.vars', '.env', '.env.staging', 'cloudflare.config.ts'])(
            'reports a restart is required when %s changes, and keeps the bot answering',
            async (file) => {
                events.length = 0;

                await appendFile(join(projectDir, file), file === 'cloudflare.config.ts' ? '\n' : 'EXTRA=1\n');

                await vi.waitFor(() => {
                    expect(events).toContainEqual({ type: 'restart-required' });
                });
                const unsigned = await fetch(`http://localhost:${port}/`, { method: 'POST', body: '{}' });
                expect(unsigned.status).toBe(401);
            }
        );
    });
});
