import { InteractionKind } from '@seedcord/core';
import { LoggerChannelRegistry } from '@seedcord/logger';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { SlashHandler } from '#handlers/interaction/SlashHandler';

import { capturingCtx, readyEngine, routedHandler, signedRequest, slashPayload, type BotClasses } from './harness';

import type { LogRecord, LogSinkHandle } from '@seedcord/types';

class Ban extends SlashHandler<never> {
    async execute(): Promise<void> {
        await this.reply('done');
    }
}

function banClasses(): BotClasses {
    return routedHandler(InteractionKind.Slash, 'ban', Ban);
}

let records: LogRecord[] = [];
let capture: LogSinkHandle;

beforeEach(() => {
    records = [];
    // a test run defaults to the info floor and records nothing at debug
    LoggerChannelRegistry.instance.configure({ level: 'debug', sinks: [] });
    capture = LoggerChannelRegistry.instance.installSink({
        kind: 'capture',
        onLog: (record) => records.push(record)
    });
});

afterEach(() => {
    capture.dispose();
    LoggerChannelRegistry.instance.configure({});
});

function dispatcherLines(): string[] {
    return records.filter((r) => r.channel === 'interactions').map((r) => r.message);
}

describe('dispatch logging', () => {
    it('names the route and the handler that ran', async () => {
        using engine = await readyEngine(banClasses());
        const { signer, handle } = engine;
        const ctx = capturingCtx();

        await handle(await signedRequest(signer, slashPayload('ban')), ctx);
        await ctx.settled();

        const line = dispatcherLines().find((message) => message.includes('Processing'));
        expect(line).toContain('slash:ban');
        expect(line).toContain('Ban');
    });

    it('logs once per dispatched interaction', async () => {
        using engine = await readyEngine(banClasses());
        const { signer, handle } = engine;
        const ctx = capturingCtx();

        await handle(await signedRequest(signer, slashPayload('ban')), ctx);
        await ctx.settled();

        expect(dispatcherLines().filter((message) => message.includes('Processing'))).toHaveLength(1);
    });
});
