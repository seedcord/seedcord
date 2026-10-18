import { resolve } from 'node:path';

import { Seedcord } from '@seedcord/http';
import { Envapter } from 'envapt';

Envapter.baseDir = resolve(import.meta.dirname, '../own-env');
console.log(`fixture:env ${Envapter.get('FIXTURE_ENV', 'unset')}`);

export default new Seedcord({
    bot: {
        interactions: { path: './handlers' },
        commands: { path: null }
    },
    subscribers: { path: null },
    port: 0
});
