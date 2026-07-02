import type { Config } from '@seedcord/types';

// Banner only reads bot.interactions.path, bot.events.path, and subscribers.path. The rest of Config is
// irrelevant to the preview. Dev-only harness fixture, so a minimal stub is cast in.
// eslint-disable-next-line no-restricted-syntax -- dev-only fixture stub cast to the full Config type
export const FIXTURE_CONFIG = {
    bot: {
        interactions: { path: 'src/interactions' },
        events: { path: 'src/events' }
    },
    subscribers: { path: 'src/subscribers' }
} as unknown as Config;
