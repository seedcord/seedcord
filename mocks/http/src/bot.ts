import { resolve } from 'node:path';

import { Seedcord } from '@seedcord/http';
import { Envapter } from 'envapt';

import {
    CodedThrow,
    LongStackThrow,
    NestedAggregateThrow,
    PlainThrow,
    StringThrow,
    ThrowWithCause
} from './plugins/failingDisposers';

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
})
    .attach('plain', PlainThrow)
    .attach('cause', ThrowWithCause)
    .attach('coded', CodedThrow)
    .attach('string', StringThrow)
    .attach('nested', NestedAggregateThrow)
    .attach('longstack', LongStackThrow);

export default seedcord;
