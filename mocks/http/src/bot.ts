import { Seedcord, UnstorageDriver, WinstonConsoleSink, WinstonFileSink } from '@seedcord/http';
import { I18n } from '@seedcord/plugin-i18n';
import { Kysely } from '@seedcord/plugin-kysely';
import { OAuth } from '@seedcord/plugin-oauth';
import Database from 'better-sqlite3';
import { Converters, Envapter } from 'envapt';
import { SqliteDialect } from 'kysely';
import { createStorage } from 'unstorage';
import fsDriver from 'unstorage/drivers/fs';

import { PingCounter } from './plugins/PingCounter';
import { Uptime } from './plugins/Uptime';

export const seedcord = new Seedcord({
    kv: new UnstorageDriver(createStorage({ driver: fsDriver({ base: './.kv' }) })),
    bot: {
        interactions: {
            path: './handlers',
            middlewares: './handlers/middlewares'
        },
        commands: {
            path: './commands',
            guilds: Envapter.getAs('TEST_GUILD_IDS', Converters.array(), [])
        }
    },
    subscribers: {
        path: null
    },
    botColor: '#fe565a',
    server: { url: 'http://localhost:6967', port: 6967 },
    logger: {
        sinks: [
            new WinstonConsoleSink({ format: 'json' }),
            new WinstonFileSink({ filename: 'http-mock-{timestamp}.log' })
        ]
    }
})
    .attach('stats.uptime', Uptime)
    .attach('stats.pings', PingCounter)
    .attach('db', Kysely, {
        path: './services',
        dialect: () => new SqliteDialect({ database: new Database(':memory:') }),
        migrations: { path: './migrations' }
    })
    .attach('i18n', I18n, { path: './locales' })
    .attach('oauth', OAuth.with({ scopes: ['guilds'] }));

export default seedcord;
