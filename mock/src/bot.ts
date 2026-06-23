import 'reflect-metadata';

import { resolve } from 'node:path';

import { Mongo } from '@seedcord/plugins';
import { GatewayIntentBits, Partials } from 'discord.js';
import { Envapt, Envapter } from 'envapt';
import { Seedcord, StartupPhase } from 'seedcord';

Envapter.baseDir = resolve(import.meta.dirname, '..');

export class Vars extends Envapter {
    // Mongo Plugin
    @Envapt('MONGO_URI', { fallback: 'mongodb://localhost:27017/' })
    public static readonly mongoUri: string;

    @Envapt('DB_NAME', { fallback: 'seedcord' })
    public static readonly dbName: string;
}

export const seedcord = new Seedcord({
    bot: {
        clientOptions: {
            intents: [
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildPresences,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildWebhooks
            ],
            partials: [Partials.GuildMember, Partials.User]
        },
        interactions: {
            path: resolve(import.meta.dirname, './handlers'),
            middlewares: resolve(import.meta.dirname, './handlers/middlewares')
        },
        commands: {
            path: resolve(import.meta.dirname, './commands')
        },
        events: {
            path: resolve(import.meta.dirname, './events'),
            middlewares: resolve(import.meta.dirname, './events/middlewares')
        },
        emojis: {
            Confirm: 'confirmation_check',
            Cancel: 'confirmation_cross'
        }
    },
    subscribers: {
        path: null
    },
    botColor: '#fe565a'
}).attach('db', Mongo, StartupPhase.Configuration, {
    dir: resolve(import.meta.dirname, './services'),
    uri: Vars.mongoUri,
    name: Vars.dbName
});

declare module 'seedcord' {
    interface Core {
        db: Mongo;
    }
}

export default seedcord;
