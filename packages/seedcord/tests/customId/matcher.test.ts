import { describe, expect, it } from 'vitest';

import { CustomId } from '@customId/index';

import type { Config, CustomIdMatcher } from '@seedcord/types';

// each typed assignment fails the typecheck if the structural contract it guards breaks.

describe('CustomIdMatcher', () => {
    it('a CustomId structurally satisfies CustomIdMatcher', () => {
        const id = new CustomId('approve');
        const matcher: CustomIdMatcher = id;
        expect(typeof matcher.owns).toBe('function');
    });

    it('ignoreCustomIds accepts CustomId matchers and rejects raw strings', () => {
        const id = new CustomId('approve');

        const config = {
            bot: {
                interactions: { path: 'x', ignoreCustomIds: [id] },
                events: { path: null },
                commands: { path: null },
                clientOptions: { intents: [] }
            },
            subscribers: { path: null }
        } satisfies Config;

        expect(config.bot.interactions.ignoreCustomIds).toHaveLength(1);

        const bad = {
            bot: {
                // @ts-expect-error a raw string is no longer a valid ignoreCustomIds entry
                interactions: { path: 'x', ignoreCustomIds: ['raw-string'] },
                events: { path: null },
                commands: { path: null },
                clientOptions: { intents: [] }
            },
            subscribers: { path: null }
        } satisfies Config;
        expect(bad.bot.interactions).toBeDefined();
    });
});
