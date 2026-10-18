import { resolve } from 'node:path';

import { Seedcord } from '@seedcord/http';
import { Envapter } from 'envapt';

import { BOT_ALIAS_LOADED } from '#lib/markers';

console.log(BOT_ALIAS_LOADED);
console.log(`fixture:env ${Envapter.get('FIXTURE_ENV', 'unset')}`);

export default new Seedcord({
    bot: {
        interactions: { path: resolve(import.meta.dirname, './handlers') },
        commands: { path: null }
    },
    subscribers: { path: resolve(import.meta.dirname, './subscribers') },
    port: 0
});
