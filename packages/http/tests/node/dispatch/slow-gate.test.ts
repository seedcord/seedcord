import 'reflect-metadata';

import { defineGate, InteractionKind } from '@seedcord/core';
import { GatedMetadataKey } from '@seedcord/core/internal';
import { Logger } from '@seedcord/logger';
import { Envapter, PortableSource } from 'envapt';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

import { SlashHandler } from '#handlers/interaction/SlashHandler';
import { restClients } from '#tests/helpers/restClients';

import { capturingCtx, readyEngine, routedHandler, signedRequest, slashPayload, type BotClasses } from './harness';

import type { Gate, GateContextBase } from '@seedcord/core';

function guarded(gates: Gate<GateContextBase>[]): BotClasses {
    class Guarded extends SlashHandler<never> {
        async execute(): Promise<void> {
            await this.reply('ran');
        }
    }
    Reflect.defineMetadata(GatedMetadataKey, gates, Guarded);
    return routedHandler(InteractionKind.Slash, 'guarded', Guarded);
}

function engineFor(classes: BotClasses, production: boolean): ReturnType<typeof readyEngine> {
    return readyEngine(classes, production ? { env: { ENVIRONMENT: 'production' } } : {});
}

// this clock moves only when a gate body advances it
function fakeClock(): (ms: number) => void {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    return (ms) => {
        now += ms;
    };
}

type WarnSpy = MockInstance<Logger['warn']>;

function slowWarnCount(warn: WarnSpy, gateName: string): number {
    return warn.mock.calls.filter(([msg]) => msg.includes(gateName)).length;
}

beforeEach(() => {
    restClients().length = 0;
});

afterEach(() => {
    vi.restoreAllMocks();
    Envapter.useSource(new PortableSource({}));
});

describe('slow-gate dev warning', () => {
    it('warns once when a gate check runs past the 750ms threshold', async () => {
        const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
        const advance = fakeClock();
        const slow = defineGate('slowgate', () => advance(800));
        using engine = await engineFor(guarded([slow]), false);
        const { handle, signer } = engine;
        const request = await signedRequest(signer, slashPayload('guarded'));
        const ctx = capturingCtx();

        await handle(request, ctx);
        await ctx.settled();

        expect(slowWarnCount(warn, 'slowgate')).toBe(1);
    });

    it('warns once when several gate checks sum past the threshold together', async () => {
        const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
        const advance = fakeClock();
        const first = defineGate('firstgate', () => advance(400));
        const second = defineGate('secondgate', () => advance(400));
        using engine = await engineFor(guarded([first, second]), false);
        const { handle, signer } = engine;
        const request = await signedRequest(signer, slashPayload('guarded'));
        const ctx = capturingCtx();

        await handle(request, ctx);
        await ctx.settled();

        expect(slowWarnCount(warn, 'firstgate')).toBe(1);
        expect(slowWarnCount(warn, 'secondgate')).toBe(1);
    });

    it('does not warn when a gate check runs under the threshold', async () => {
        const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
        const advance = fakeClock();
        const fast = defineGate('fastgate', () => advance(10));
        using engine = await engineFor(guarded([fast]), false);
        const { handle, signer } = engine;
        const request = await signedRequest(signer, slashPayload('guarded'));
        const ctx = capturingCtx();

        await handle(request, ctx);
        await ctx.settled();

        expect(slowWarnCount(warn, 'fastgate')).toBe(0);
    });

    it('never warns in production, even for a slow gate', async () => {
        const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
        const advance = fakeClock();
        const slow = defineGate('slowgate', () => advance(800));
        using engine = await engineFor(guarded([slow]), true);
        const { handle, signer } = engine;
        const request = await signedRequest(signer, slashPayload('guarded'));
        const ctx = capturingCtx();

        await handle(request, ctx);
        await ctx.settled();

        expect(slowWarnCount(warn, 'slowgate')).toBe(0);
    });
});
