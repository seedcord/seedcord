import { resolve } from 'node:path';

import { Seedcord } from '@seedcord/http';

import { BOT_ALIAS_LOADED } from '#lib/markers';

console.log(BOT_ALIAS_LOADED);

export default new Seedcord({
    bot: {
        interactions: { path: resolve(import.meta.dirname, './handlers') },
        commands: { path: null }
    },
    subscribers: { path: resolve(import.meta.dirname, './subscribers') },
    port: 0
});
