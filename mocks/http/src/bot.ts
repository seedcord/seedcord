import { Seedcord, UnstorageDriver, WinstonConsoleSink, WinstonFileSink } from '@seedcord/http';
import { I18n } from '@seedcord/plugin-i18n';
import { Kysely } from '@seedcord/plugin-kysely';
import { LinkedRoles, RecordType } from '@seedcord/plugin-linked-roles';
import { OAuth } from '@seedcord/plugin-oauth';
import Database from 'better-sqlite3';
import { Converters, Envapter } from 'envapt';
import { SqliteDialect } from 'kysely';
import { createStorage } from 'unstorage';
import fsDriver from 'unstorage/drivers/fs';

import { PingCounter } from './plugins/PingCounter';
import { Uptime } from './plugins/Uptime';

const withDatabase = new Seedcord({
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

export const seedcord = withDatabase.attach(
    'linkedRoles',
    LinkedRoles.with({
        records: {
            rolls: {
                type: RecordType.IntegerGreaterThanOrEqual,
                name: 'Rolls',
                description: 'Dice rolled with /roll'
            }
        },
        keepTokens: true,
        values: async ({ user }) => {
            // reads `withDatabase` because typescript can't type `seedcord` inside its own declaration
            const rolls = await withDatabase.db.services.rolls.countFor(user.id);
            if (rolls === 0) return { refuse: 'Use /roll once, then open the link again.' };
            return { platformUsername: user.username, metadata: { rolls } };
        }
    })
);

export default seedcord;
