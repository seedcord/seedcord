import { resolve } from 'node:path';

import { Seedcord } from '@seedcord/http';

import { PingCounter } from './plugins/PingCounter';

export default new Seedcord({
    bot: {
        interactions: {
            path: resolve(import.meta.dirname, './handlers')
        },
        commands: {
            path: resolve(import.meta.dirname, './commands')
        }
    },
    subscribers: {
        path: null
    },
    botColor: '#fe565a'
}).attach('pings', PingCounter);
