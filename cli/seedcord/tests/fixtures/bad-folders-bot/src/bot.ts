import { resolve } from 'node:path';

import { Seedcord } from '@seedcord/http';

export default new Seedcord({
    bot: {
        interactions: { path: resolve(import.meta.dirname, '../handlers') },
        commands: { path: './src/commands' }
    },
    subscribers: { path: null }
});
