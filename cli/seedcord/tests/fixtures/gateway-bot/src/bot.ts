import { resolve } from 'node:path';

import { Seedcord } from '@seedcord/gateway';

export default new Seedcord({
    bot: {
        clientOptions: { intents: [] },
        interactions: { path: resolve(import.meta.dirname, './handlers') },
        commands: { path: null },
        events: { path: resolve(import.meta.dirname, './events') }
    },
    subscribers: { path: null },
    healthCheck: false
});
