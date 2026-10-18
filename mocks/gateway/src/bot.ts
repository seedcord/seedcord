import { Seedcord } from '@seedcord/gateway';
import { Mongoose } from '@seedcord/plugin-mongoose';
import { GatewayIntentBits, Partials } from 'discord.js';
import { Converters, Envapter } from 'envapt';
import { Envapt } from 'envapt/legacy';

export class Vars extends Envapter {
    @Envapt('MONGO_URI', { fallback: 'mongodb://localhost:27017/' })
    public static readonly mongoUri: string;

    @Envapt('DB_NAME', { fallback: 'seedcord' })
    public static readonly dbName: string;

    @Envapt('COMMAND_GUILD_IDS', { converter: Converters.array(), fallback: [] })
    public static readonly commandGuilds: string[];
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
            path: './handlers',
            middlewares: './handlers/middlewares'
        },
        commands: {
            path: './commands',
            guilds: Vars.commandGuilds
        },
        events: {
            path: './events',
            middlewares: './events/middlewares'
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
}).attach('db', Mongoose, {
    dir: './services',
    uri: Vars.mongoUri,
    name: Vars.dbName
});

export default seedcord;
