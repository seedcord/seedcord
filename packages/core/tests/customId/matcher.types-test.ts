import { CustomId } from '#customId/CustomId';

import type { Config, CustomIdMatcher } from '@seedcord/types';

const id = new CustomId('approve');

const matcher: CustomIdMatcher = id;
void matcher;

const config = {
    bot: {
        interactions: { path: 'x', ignoreCustomIds: [id] },
        commands: { path: null }
    },
    subscribers: { path: null }
} satisfies Config;
void config;

const bad = {
    bot: {
        // @ts-expect-error a raw string is no longer a valid ignoreCustomIds entry
        interactions: { path: 'x', ignoreCustomIds: ['raw-string'] },
        commands: { path: null }
    },
    subscribers: { path: null }
} satisfies Config;
void bad;
