import { Seedcord, WinstonConsoleSink, WinstonFileSink } from '@seedcord/http';
import { I18n } from '@seedcord/plugin-i18n';
import { Kysely } from '@seedcord/plugin-kysely';
import Database from 'better-sqlite3';
import { Converters, Envapter } from 'envapt';
import { SqliteDialect } from 'kysely';

import { PingCounter } from './plugins/PingCounter';
import { Uptime } from './plugins/Uptime';

export const seedcord = new Seedcord({
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
    port: 6967,
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
        dir: './services',
        dialect: () => new SqliteDialect({ database: new Database(':memory:') }),
        migrations: { dir: './migrations' }
    })
    .attach('i18n', I18n, { path: './locales' });

export default seedcord;
