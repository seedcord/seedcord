import { resolve } from 'node:path';

import { Seedcord } from '@seedcord/http';
import { Envapter } from 'envapt';

import { PingCounter } from './plugins/PingCounter';
import { Uptime } from './plugins/Uptime';

Envapter.baseDir = resolve(import.meta.dirname, '..');

export const seedcord = new Seedcord({
    bot: {
        interactions: {
            path: './handlers',
            middlewares: './handlers/middlewares'
        },
        commands: {
            path: './commands'
        }
    },
    subscribers: {
        path: null
    },
    botColor: '#fe565a',
    port: 6967
})
    .attach('stats.uptime', Uptime)
    .attach('stats.pings', PingCounter);

export default seedcord;
