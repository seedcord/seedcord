import { SeedcordErrorCode } from '@seedcord/errors';
import { afterEach, describe, expect, it } from 'vitest';

import { createCore } from '#src/dispatch/dispatchInteraction';
import { Seedcord } from '#src/node/Seedcord';
import { VALID_TOKEN } from '#tests/helpers/fixtures';

import type { HttpConfig, HttpEdgeConfig } from '#src/interfaces/Config';

function config(restOptions?: { timeout: number }): Pick<HttpConfig, 'bot' | 'subscribers'> {
    return {
        bot: { interactions: { path: null }, commands: { path: null }, ...(restOptions && { restOptions }) },
        subscribers: { path: null }
    };
}

describe('bot.restOptions', () => {
    afterEach(() => {
        // @ts-expect-error singleton reset between tests
        Seedcord.reset();
    });

    it('passes only the configured options to the REST client on node', () => {
        expect(new Seedcord(config({ timeout: 1234 })).rest.options).toEqual({ timeout: 1234 });
    });

    it('reaches the REST client on edge, which starts with both sweepers off', () => {
        const { options } = createCore(config({ timeout: 1234 }), VALID_TOKEN).rest;

        expect(options).toMatchObject({ timeout: 1234, hashSweepInterval: 0, handlerSweepInterval: 0 });
    });

    it('throws on edge when a sweeper interval gets past the types', () => {
        const base = config();
        // plain JS, or a cast, can still hand the edge path a sweeper interval
        const restOptions = { handlerSweepInterval: 60_000 } as NonNullable<HttpEdgeConfig['bot']['restOptions']>;

        expect(() => createCore({ ...base, bot: { ...base.bot, restOptions } }, VALID_TOKEN)).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.ConfigEdgeRestSweeper })
        );
    });
});
