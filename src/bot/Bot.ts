import chalk from 'chalk';
import { Client, GatewayIntentBits, Partials } from 'discord.js';

import { CommandRegistry } from './controllers/CommandRegistry';
import { EventController } from './controllers/EventController';
import { InteractionController } from './controllers/InteractionController';
import { EmojiInjector } from './injectors/EmojiInjector';
import { Globals } from '../core/library/globals/Globals';
import { ShutdownPhase } from '../core/services/CoordinatedShutdown';
import { Logger } from '../core/services/Logger';

import type { CoreBot } from '../core/CoreBot';

export class Bot {
  private readonly logger = new Logger('Bot');
  private isInitialized = false;

  private readonly _client: Client;
  private readonly interactions: InteractionController;
  private readonly events: EventController;
  private readonly commands: CommandRegistry;
  private readonly emojiInjector: EmojiInjector;

  constructor(protected core: CoreBot) {
    this._client = new Client({
      intents: [
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildWebhooks
      ],
      partials: [Partials.GuildMember, Partials.User]
    });

    this.interactions = new InteractionController(core);
    this.events = new EventController(core);

    this.commands = new CommandRegistry(this._client);
    this.emojiInjector = new EmojiInjector(this._client);

    this.core.shutdown.addTask(ShutdownPhase.DiscordCleanup, 'stop-bot', async () => await this.stop());
  }

  public async start(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    this.isInitialized = true;

    await this.login();

    await this.interactions.init();
    await this.events.init();

    await this.commands.init();
    await this.commands.setCommands();

    await this.emojiInjector.init();
  }

  public async stop(): Promise<void> {
    this._client.removeAllListeners();

    await this.logout();
  }

  private async login(): Promise<Bot> {
    await this._client.login(Globals.botToken);
    this.logger.info(`Logged in as ${chalk.bold.magenta(this._client.user?.username)}!`);
    return this;
  }

  private async logout(): Promise<void> {
    await this._client.destroy();
    this.logger.info(chalk.bold.red('Logged out of Discord!'));
  }

  public get client(): Client {
    return this._client;
  }
}
