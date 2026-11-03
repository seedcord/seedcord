import { Seedcord, UnstorageDriver } from '@seedcord/http';
import { createDatabase } from 'db0';
import cloudflareD1 from 'db0/connectors/cloudflare-d1';
import { createStorage } from 'unstorage';
import db0Driver from 'unstorage/drivers/db0';

import { PingCounter } from './plugins/PingCounter';

const database = createDatabase(cloudflareD1({ bindingName: 'DB' }));

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
    botColor: '#fe565a',
    kv: new UnstorageDriver(
        createStorage({
            driver: db0Driver({ database })
        })
    )
}).attach('pings', PingCounter);
