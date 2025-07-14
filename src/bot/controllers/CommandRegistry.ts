import chalk from 'chalk';
import { Client, SlashCommandBuilder } from 'discord.js';
import * as path from 'path';
import { traverseDirectory } from '../../core/library/Helpers';
import { LogService } from '../../core/services/LogService';
import { CommandMeta, CommandMetadataKey } from '../decorators/CommandRegisterable';
import { BuilderComponent } from '../interfaces/Components';

type CommandCtor = new () => BuilderComponent<'command'>;

export class CommandRegistry {
  private logger = new LogService('Commands');
  private isInitialised = false;

  public readonly globalCommands: SlashCommandBuilder[] = [];
  public readonly guildCommands = new Map<string, SlashCommandBuilder[]>();

  public constructor(private readonly client: Client) {}

  public async init(): Promise<void> {
    if (this.isInitialised) return;
    this.isInitialised = true;

    const commandsDir = path.resolve(__dirname, '../components/commands');
    this.logger.info(chalk.bold(commandsDir));

    await this.loadCommands(commandsDir);

    this.logger.info(
      `${chalk.bold.green('Loaded')}: ${chalk.magenta.bold(
        this.globalCommands.length
      )} global, ${chalk.magenta.bold(this.guildCommands.size)} guild groups`
    );
  }

  private async loadCommands(dir: string): Promise<void> {
    await traverseDirectory(dir, (_full, rel, mod) => {
      for (const exported of Object.values(mod) as unknown[]) {
        if (this.isCommandClass(exported)) {
          this.registerCommand(exported, rel);
        }
      }
    });
  }

  private isCommandClass(obj: unknown): obj is CommandCtor {
    if (typeof obj !== 'function') return false;
    return obj.prototype instanceof BuilderComponent && Reflect.hasMetadata(CommandMetadataKey, obj);
  }

  private registerCommand(Ctor: CommandCtor, rel: string): void {
    const meta = Reflect.getMetadata(CommandMetadataKey, Ctor) as CommandMeta | undefined;

    if (!meta) return;

    const instance = new Ctor();
    const comp = instance.component;

    if (meta.scope === 'global') {
      this.globalCommands.push(comp);
    } else {
      for (const g of meta.guilds) {
        const arr = this.guildCommands.get(g) ?? [];
        arr.push(comp);
        this.guildCommands.set(g, arr);
      }
    }

    this.logger.info(`${chalk.italic('Registered')} ${chalk.bold.yellow(Ctor.name)} from ${chalk.gray(rel)}`);
  }

  public async setCommands(): Promise<void> {
    if (this.globalCommands.length > 0) {
      await this.client.application?.commands.set(this.globalCommands);
      const tag = this.globalCommands.length === 1 ? 'command' : 'commands';
      this.logger.info(
        `${chalk.bold.green('Configured')} ${chalk.magenta.bold(this.globalCommands.length)} global ${tag}`
      );
      this.logger.info(` - ${this.globalCommands.map((command) => chalk.bold.cyan(command.name)).join(', ')}`);
    }

    for (const [guildId, commands] of this.guildCommands.entries()) {
      const guild = this.client.guilds.cache.get(guildId);
      if (!guild) {
        this.logger.warn(`Guild with ID ${guildId} not found, skipping command registration.`);
        continue;
      }

      await guild.commands.set(commands);
      const tag = commands.length === 1 ? 'command' : 'commands';
      this.logger.info(
        `${chalk.bold.green('Configured')} ${chalk.magenta.bold(commands.length)} ${tag} for guild ${chalk.bold.yellow(guild.name)}`
      );
      this.logger.info(` - ${commands.map((command) => chalk.bold.cyan(command.name)).join(', ')}`);
    }
  }
}
