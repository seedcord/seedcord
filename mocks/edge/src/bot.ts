import { Seedcord } from '@seedcord/http';

import { PingCounter } from './plugins/PingCounter';

export default new Seedcord({
    bot: {
        interactions: {
            path: './handlers'
        },
        commands: {
            path: './commands'
        }
    },
    subscribers: {
        path: null
    },
    botColor: '#fe565a'
}).attach('pings', PingCounter);
