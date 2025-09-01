import 'reflect-metadata';

import { resolve } from 'node:path';

import { Mongo } from '@seedcord/plugins';
import { GatewayIntentBits, Partials } from 'discord.js';
import { Envapt, Envapter } from 'envapt';
import { Seedcord, StartupPhase } from 'seedcord';

Envapter.envPaths = resolve(import.meta.dirname, '../../../.env');

export class Vars extends Envapter {
  // Mongo Plugin
  @Envapt('MONGO_URI', { fallback: 'mongodb://localhost:27017/' })
  public static readonly mongoUri: string;

  @Envapt('DB_NAME', { fallback: 'seedcord' })
  public static readonly dbName: string;
}

export const Emojis = {
  success: 'checkmark',
  error: 'cross',
  loading: 'ritual_loader_1',
  heart: 'red_heart'
};

async function main(): Promise<void> {
  const seedcord = new Seedcord({
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
        path: resolve(import.meta.dirname, './handlers')
      },
      commands: {
        path: resolve(import.meta.dirname, './components/commands')
      },
      events: {
        path: resolve(import.meta.dirname, './events')
      },
      emojis: Emojis
    },
    effects: {
      path: resolve(import.meta.dirname, './effects')
    }
  }).attach('db', Mongo, StartupPhase.Configuration, {
    dir: resolve(import.meta.dirname, './services'),
    uri: Vars.mongoUri,
    name: Vars.dbName
  });

  await seedcord.start();
}

declare module 'seedcord' {
  interface Core {
    db: Mongo;
  }
}

await main().catch(() => process.exit(1));
