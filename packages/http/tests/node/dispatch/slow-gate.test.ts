import 'reflect-metadata';

import { defineGate } from '@seedcord/core';
import { GatedMetadataKey } from '@seedcord/core/internal';
import { Logger } from '@seedcord/logger';
import { Envapter, PortableSource } from 'envapt';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

import { SlashHandler } from '@handlers/interaction/SlashHandler';

import { FROM, capturingCtx, emptyManifest, signedRequest, slashPayload } from './harness';
import { createSigner } from '../../helpers/ed25519';
import { nullPathConfig, VALID_TOKEN } from '../../helpers/fixtures';

import type { Gate, GateContextBase } from '@seedcord/core';
import type { EngineContext } from '@src/createSeedcord';

const rest = vi.hoisted(() => {
    interface FakeRestInstance {
        post: ReturnType<typeof vi.fn>;
        patch: ReturnType<typeof vi.fn>;
    }
    const instances: FakeRestInstance[] = [];
    class FakeRest {
        public post = vi.fn().mockResolvedValue({ resource: { message: { id: 'm-1' } } });
        public patch = vi.fn().mockResolvedValue({ id: 'm-1' });

        public constructor() {
            instances.push(this);
        }

        public setToken(): this {
            return this;
        }
    }
    return { instances, FakeRest };
});

vi.mock('@discordjs/rest', async (importOriginal) => ({
    ...(await importOriginal<object>()),
    REST: rest.FakeRest
}));

type Engine = (request: Request, ctx?: EngineContext) => Promise<Response>;

function guarded(gates: Gate<GateContextBase>[]): ReturnType<typeof emptyManifest> {
    class Guarded extends SlashHandler<never> {
        async execute(): Promise<void> {
            await this.reply('ran');
        }
    }
    Reflect.defineMetadata(GatedMetadataKey, gates, Guarded);
    return {
        ...emptyManifest(),
        commandRoutes: [
            { name: 'guarded', type: 1, exportName: 'Guarded', from: FROM, load: () => Promise.resolve({ Guarded }) }
        ]
    };
}

// createSeedcord reads the public key and token off the environment at build time, so bind them per engine,
// with ENVIRONMENT=production for the prod case
async function engineFor(
    manifest: ReturnType<typeof emptyManifest>,
    production: boolean
): Promise<{ handle: Engine; signer: Awaited<ReturnType<typeof createSigner>> }> {
    const signer = await createSigner();
    const source: Record<string, string> = { DISCORD_PUBLIC_KEY: signer.publicKeyHex, DISCORD_BOT_TOKEN: VALID_TOKEN };
    if (production) source.ENVIRONMENT = 'production';
    Envapter.useSource(new PortableSource(source));
    const { createSeedcord } = await import('@src/createSeedcord');
    return { handle: createSeedcord(nullPathConfig, manifest), signer };
}

// queue the performance.now readings core's timedCheck takes, start then end per gate
function stubClock(readings: number[]): void {
    let i = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => readings[Math.min(i++, readings.length - 1)] ?? 0);
}

type WarnSpy = MockInstance<Logger['warn']>;

function slowWarnCount(warn: WarnSpy, gateName: string): number {
    return warn.mock.calls.filter(([msg]) => msg.includes(gateName)).length;
}

beforeEach(() => {
    rest.instances.length = 0;
});

afterEach(() => {
    vi.restoreAllMocks();
    Envapter.useSource(new PortableSource({}));
});

describe('slow-gate dev warning', () => {
    it('warns once when a gate check runs past the 750ms threshold', async () => {
        const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
        const slow = defineGate('slowgate', () => {
            /* the stubbed clock reports the elapsed time, no real wait */
        });
        const { handle, signer } = await engineFor(guarded([slow]), false);
        const request = await signedRequest(signer, slashPayload('guarded'));
        const ctx = capturingCtx();

        stubClock([0, 800]);
        await handle(request, ctx);
        await ctx.settled();

        expect(slowWarnCount(warn, 'slowgate')).toBe(1);
    });

    it('warns once when several gate checks sum past the threshold together', async () => {
        const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
        const first = defineGate('firstgate', () => {
            /* the stubbed clock reports the elapsed time */
        });
        const second = defineGate('secondgate', () => {
            /* the stubbed clock reports the elapsed time */
        });
        const { handle, signer } = await engineFor(guarded([first, second]), false);
        const request = await signedRequest(signer, slashPayload('guarded'));
        const ctx = capturingCtx();

        // 400ms per gate, 800ms combined
        stubClock([0, 400, 400, 800]);
        await handle(request, ctx);
        await ctx.settled();

        expect(slowWarnCount(warn, 'firstgate')).toBe(1);
        expect(slowWarnCount(warn, 'secondgate')).toBe(1);
    });

    it('does not warn when a gate check runs under the threshold', async () => {
        const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
        const fast = defineGate('fastgate', () => undefined);
        const { handle, signer } = await engineFor(guarded([fast]), false);
        const request = await signedRequest(signer, slashPayload('guarded'));
        const ctx = capturingCtx();

        stubClock([0, 10]);
        await handle(request, ctx);
        await ctx.settled();

        expect(slowWarnCount(warn, 'fastgate')).toBe(0);
    });

    it('never warns in production, even for a slow gate', async () => {
        const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
        const slow = defineGate('slowgate', () => undefined);
        const { handle, signer } = await engineFor(guarded([slow]), true);
        const request = await signedRequest(signer, slashPayload('guarded'));
        const ctx = capturingCtx();

        stubClock([0, 800]);
        await handle(request, ctx);
        await ctx.settled();

        expect(slowWarnCount(warn, 'slowgate')).toBe(0);
    });
});
