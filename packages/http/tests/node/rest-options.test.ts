import { afterEach, describe, expect, it } from 'vitest';

import { createCore } from '#src/dispatch/dispatchInteraction';
import { Seedcord } from '#src/node/Seedcord';
import { VALID_TOKEN } from '#tests/helpers/fixtures';

import type { HttpConfig } from '#src/interfaces/Config';

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

    it('reaches the REST client on node, which keeps the default sweepers', () => {
        expect(new Seedcord(config({ timeout: 1234 })).rest.options).toEqual({ timeout: 1234 });
    });

    it('reaches the REST client on edge, which starts with both sweepers off', () => {
        const { options } = createCore({ ...config({ timeout: 1234 }), runtime: 'edge' }, VALID_TOKEN).rest;

        expect(options).toMatchObject({ timeout: 1234, hashSweepInterval: 0, handlerSweepInterval: 0 });
    });
});
