import { GatewayIntentBits } from 'discord.js';
import { resolve } from 'node:path';
import { Seedcord } from 'seedcord';

async function main() {
  const seed = new Seedcord({
    bot: {
      clientOptions: {
        intents: [
          GatewayIntentBits.MessageContent,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMembers,
          GatewayIntentBits.GuildWebhooks,
        ],
      },
      interactions: {
        path: resolve(import.meta.dirname, './handlers'),
      },
      commands: {
        path: resolve(import.meta.dirname, './commands'),
      },
      events: {
        path: resolve(import.meta.dirname, './events'),
      },
    },
    hooks: {
      path: resolve(import.meta.dirname, './hooks'),
    },
  });

  await seed.start();
}

main();
