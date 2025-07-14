import chalk from 'chalk';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { CoreBot } from '../core/CoreBot';
import { Globals } from '../core/library/globals/Globals';
import { LogService } from '../core/services/LogService';
import { CommandRegistry } from './controllers/CommandRegistry';
import { ErrorController } from './controllers/ErrorController';
import { EventController } from './controllers/EventController';
import { InteractionController } from './controllers/InteractionController';
import { EmojiInjector } from './injectors/EmojiInjector';

export class Bot {
  private logger = new LogService('Bot');
  private isInitialized = false;

  private readonly _client: Client;
  private interactions: InteractionController;
  private events: EventController;
  public errors: ErrorController;
  private commands: CommandRegistry;
  private emojiInjector: EmojiInjector;

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
    this.errors = new ErrorController(core);

    this.commands = new CommandRegistry(this._client);
    this.emojiInjector = new EmojiInjector(this._client);
  }

  public async start(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    this.isInitialized = true;

    await this.login();

    await this.interactions.init();
    await this.events.init();
    await this.errors.init();

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
