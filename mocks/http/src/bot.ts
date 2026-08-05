import 'reflect-metadata';

import { resolve } from 'node:path';

import { Seedcord } from '@seedcord/http';
import { Envapter } from 'envapt';

Envapter.baseDir = resolve(import.meta.dirname, '..');

export const seedcord = new Seedcord({
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
    botColor: '#fe565a',
    port: 6967
});

export default seedcord;
