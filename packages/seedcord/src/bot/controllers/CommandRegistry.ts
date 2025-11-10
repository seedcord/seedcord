import { Logger } from '@seedcord/services';
import { traverseDirectory } from '@seedcord/utils';
import chalk from 'chalk';
import { Collection, SlashCommandBuilder } from 'discord.js';

import { CommandMetadataKey } from '@bDecorators/Command';
import { BuilderComponent } from '@interfaces/Components';

import type { CommandMeta } from '@bDecorators/Command';
import type { Core } from '@interfaces/Core';
import type { Initializeable } from '@interfaces/Plugin';
import type { ContextMenuCommandBuilder } from 'discord.js';

type CommandCtor = new () => BuilderComponent<'command' | 'context_menu'>;

/**
 * Manages Discord application command registration and deployment.
 *
 * Scans command directories, builds command structures, and handles both
 * global and guild-specific command deployment to Discord's API.
 *
 * @internal
 */
export class CommandRegistry implements Initializeable {
    private readonly logger = new Logger('Commands');
    private isInitialised = false;

    public readonly globalCommands: (SlashCommandBuilder | ContextMenuCommandBuilder)[] = [];
    public readonly guildCommands = new Collection<string, (SlashCommandBuilder | ContextMenuCommandBuilder)[]>();

    public constructor(private readonly core: Core) {}

    public async init(): Promise<void> {
        if (this.isInitialised) return;
        this.isInitialised = true;

        this.logger.info(chalk.bold(this.core.config.bot.commands.path));

        await this.loadCommands(this.core.config.bot.commands.path);

        this.logger.info(
            `${chalk.bold.green('Loaded')}: ${chalk.magenta.bold(
                this.globalCommands.length
            )} global, ${chalk.magenta.bold(this.guildCommands.size)} guild groups`
        );
    }

    private async loadCommands(dir: string): Promise<void> {
        await traverseDirectory(
            dir,
            (_full, rel, mod) => {
                for (const exported of Object.values(mod))
                    if (this.isCommandClass(exported)) this.registerCommand(exported, rel);
            },
            this.logger
        );
    }

    private isCommandClass(obj: unknown): obj is CommandCtor {
        if (typeof obj !== 'function') return false;
        return obj.prototype instanceof BuilderComponent && Reflect.hasMetadata(CommandMetadataKey, obj);
    }

    private registerCommand(ctor: CommandCtor, rel: string): void {
        const meta = Reflect.getMetadata(CommandMetadataKey, ctor) as CommandMeta | undefined;

        if (!meta) return;

        const instance = new ctor();
        const comp = instance.component;

        const commandType = comp instanceof SlashCommandBuilder ? 'slash command' : 'context menu command';

        if (meta.scope === 'global') {
            this.globalCommands.push(comp);
            this.logger.info(`${chalk.italic('Registered')} ${chalk.bold.yellow(ctor.name)} from ${chalk.gray(rel)}`);
            this.logger.info(`→ Global ${commandType}: ${chalk.bold.cyan(comp.name)}`);
        } else {
            for (const g of meta.guilds) {
                const arr = this.guildCommands.get(g) ?? [];
                arr.push(comp);
                this.guildCommands.set(g, arr);
            }
            this.logger.info(`${chalk.italic('Registered')} ${chalk.bold.yellow(ctor.name)} from ${chalk.gray(rel)}`);
            this.logger.info(
                `→ Guild ${commandType}: ${chalk.bold.cyan(comp.name)} for ${chalk.magenta.bold(meta.guilds.length)} guild(s)`
            );
        }
    }

    public async setCommands(): Promise<void> {
        if (this.globalCommands.length > 0) {
            await this.core.bot.client.application?.commands.set(this.globalCommands);
            const tag = this.globalCommands.length === 1 ? 'command' : 'commands';
            this.logger.info(
                `${chalk.bold.green('Configured')} ${chalk.magenta.bold(this.globalCommands.length)} global ${tag}`
            );
            this.logger.info(`→ ${this.globalCommands.map((command) => chalk.bold.cyan(command.name)).join(', ')}`);
        }

        for (const [guildId, commands] of this.guildCommands.entries()) {
            const guild = this.core.bot.client.guilds.cache.get(guildId);
            if (!guild) {
                this.logger.warn(`Guild with ID ${guildId} not found, skipping command registration.`);
                continue;
            }

            await guild.commands.set(commands);
            const tag = commands.length === 1 ? 'command' : 'commands';
            this.logger.info(
                `${chalk.bold.green('Configured')} ${chalk.magenta.bold(commands.length)} ${tag} for guild ${chalk.bold.yellow(guild.name)}`
            );
            this.logger.info(`→ ${commands.map((command) => chalk.bold.cyan(command.name)).join(', ')}`);
        }
    }
}
