import { LoggerChannelRegistry } from '@seedcord/logger';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SlashHandler } from '#handlers/interaction/SlashHandler';

import { FROM, capturingCtx, emptyManifest, readyEngine, signedRequest, slashPayload } from './harness';

import type { LogRecord } from '@seedcord/types';

const rest = vi.hoisted(() => {
    class FakeRest {
        public post = vi.fn().mockResolvedValue({ resource: { message: { id: 'm-1' } } });
        public patch = vi.fn().mockResolvedValue({ id: 'm-1' });

        public setToken(): this {
            return this;
        }
    }
    return { FakeRest };
});

// the factory must not import project modules, vitest loads factory imports in a mock-bypass
// context that would cache the engine graph unmocked
vi.mock('@discordjs/rest', async (importOriginal) => ({
    ...(await importOriginal<object>()),
    REST: rest.FakeRest
}));

class Ban extends SlashHandler<never> {
    async execute(): Promise<void> {
        await this.reply('done');
    }
}

function banManifest(): ReturnType<typeof emptyManifest> {
    return {
        ...emptyManifest(),
        commandRoutes: [{ name: 'ban', type: 1, exportName: 'Ban', from: FROM, load: () => Promise.resolve({ Ban }) }]
    };
}

let records: LogRecord[] = [];
let dispose: () => void;

beforeEach(() => {
    records = [];
    // a test run defaults to the info floor, which drops the debug record before any sink sees it
    LoggerChannelRegistry.instance.configure({ level: 'debug', sinks: [] });
    const handle = LoggerChannelRegistry.instance.installSink({
        kind: 'capture',
        onLog: (record) => records.push(record)
    });
    dispose = () => handle.dispose();
});

afterEach(() => {
    LoggerChannelRegistry.instance.configure({});
});

function dispatcherLines(): string[] {
    return records.filter((r) => r.channel === 'interactions').map((r) => r.message);
}

describe('dispatch logging', () => {
    it('names the route and the handler that ran', async () => {
        const { signer, handle } = await readyEngine(banManifest());
        const ctx = capturingCtx();

        await handle(await signedRequest(signer, slashPayload('ban')), ctx);
        await ctx.settled();
        dispose();

        const line = dispatcherLines().find((message) => message.includes('Processing'));
        expect(line).toContain('slash:ban');
        expect(line).toContain('Ban');
    });

    it('logs once per dispatched interaction', async () => {
        const { signer, handle } = await readyEngine(banManifest());
        const ctx = capturingCtx();

        await handle(await signedRequest(signer, slashPayload('ban')), ctx);
        await ctx.settled();
        dispose();

        expect(dispatcherLines().filter((message) => message.includes('Processing'))).toHaveLength(1);
    });

    it('stays quiet when the route fails to load its handler', async () => {
        const manifest = {
            ...emptyManifest(),
            commandRoutes: [
                {
                    name: 'ban',
                    type: 1,
                    exportName: 'Ban',
                    from: FROM,
                    load: () => Promise.reject(new Error('boom'))
                }
            ]
        };
        const { signer, handle } = await readyEngine(manifest);
        const ctx = capturingCtx();

        await handle(await signedRequest(signer, slashPayload('ban')), ctx);
        dispose();

        expect(dispatcherLines().filter((message) => message.includes('Processing'))).toHaveLength(0);
    });
});
