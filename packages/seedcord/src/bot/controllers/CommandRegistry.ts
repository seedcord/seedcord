import { resolve } from 'node:path';

import { Logger, SeedcordErrorCode } from '@seedcord/services';
import { SeedcordError } from '@seedcord/services/internal';
import { formatFilePath, traverseDirectory } from '@seedcord/utils';
import chalk from 'chalk';
import { Collection, SlashCommandBuilder } from 'discord.js';
import { Envapter } from 'envapt';

import { CommandMetadataKey } from '@bDecorators/Command';
import { slashRouteLeaves } from '@bUtilities/miscellaneous/slashRouteLeaves';
import { HmrModuleHandler } from '@hmr/HmrModuleHandler';
import { BuilderComponent } from '@interfaces/Components';

import type { CommandMeta } from '@bDecorators/Command';
import type { Core } from '@interfaces/Core';
import type { Initializeable } from '@interfaces/Plugin';
import type { HmrAware, HmrUpdateEvent } from '@seedcord/types/internal';
import type { ContextMenuCommandBuilder } from 'discord.js';

type CommandCtor = new () => BuilderComponent<'command' | 'context_menu'>;

interface CommandArtifact {
    name: string;
    scope: 'global' | 'guild';
    guilds?: string[];
}

/**
 * Manages Discord application command registration and deployment.
 *
 * Scans command directories, builds command structures, and registers both global and guild-scoped commands
 * to Discord's API.
 *
 * @internal
 */
export class CommandRegistry implements Initializeable, HmrAware {
    public readonly name = 'Commands';
    private readonly logger = new Logger('Commands');
    private isInitialised = false;

    public readonly globalCommands: (SlashCommandBuilder | ContextMenuCommandBuilder)[] = [];
    public readonly guildCommands = new Collection<string, (SlashCommandBuilder | ContextMenuCommandBuilder)[]>();

    private readonly ctorToCommand = new Map<CommandCtor, CommandArtifact>();
    private readonly hmrHandler?: HmrModuleHandler<CommandCtor, void, CommandArtifact | undefined>;
    private readonly pendingEvents = new Map<string, HmrUpdateEvent>();

    public constructor(private readonly core: Core) {
        const commandsDir = this.core.config.bot.commands.path;
        if (!commandsDir) {
            throw new SeedcordError(SeedcordErrorCode.CoreControllerPathMissing, ['CommandRegistry', 'commands']);
        }

        if (!Envapter.isDevelopment) return; // HMR only in development
        this.hmrHandler = new HmrModuleHandler<CommandCtor, void, CommandArtifact | undefined>({
            handlersDir: commandsDir,
            isHandler: this.isCommandClass.bind(this),
            registerHandler: this.registerCommand.bind(this),
            unregisterHandler: this.unregisterCommand.bind(this),
            getArtifacts: this.getArtifacts.bind(this),
            logger: this.logger,
            name: 'Commands'
        });
    }

    private getArtifacts(ctor: CommandCtor): CommandArtifact | undefined {
        return this.ctorToCommand.get(ctor);
    }

    public async init(): Promise<void> {
        if (this.isInitialised) return;
        this.isInitialised = true;

        const commandsDir = this.core.config.bot.commands.path;
        if (!commandsDir) return;

        this.logger.info(chalk.bold(commandsDir));

        await this.loadCommands(commandsDir);

        this.logger.utils.summary('Loaded commands', {
            global: this.globalCommands.length,
            'guild groups': this.guildCommands.size
        });

        if (import.meta.hot) {
            import.meta.hot.on('seedcord:refresh-commands', (data) => {
                void this.refresh(data.shouldRefresh);
            });
        }
    }

    public async refresh(shouldRefresh = true): Promise<void> {
        if (!shouldRefresh) {
            this.logger.info(chalk.italic('Command refresh cancelled.'));
            this.pendingEvents.clear();
            return;
        }

        this.logger.info(chalk.italic('Refreshing commands...'));
        for (const event of this.pendingEvents.values()) {
            await this.hmrHandler?.handle(event);
        }
        this.pendingEvents.clear();
        await this.setCommands();
    }

    /** @internal */
    public async onHmr(event: HmrUpdateEvent): Promise<void> {
        const commandsDir = this.core.config.bot.commands.path;
        if (commandsDir && event.file.startsWith(resolve(process.cwd(), commandsDir))) {
            this.pendingEvents.delete(event.file);
            this.pendingEvents.set(event.file, event);
            if (import.meta.hot) {
                import.meta.hot.send('seedcord:commands-update-prompt', {
                    files: Array.from(this.pendingEvents.keys()).map((f) => formatFilePath(f))
                });
            }
        } else {
            await this.hmrHandler?.handle(event);
        }
    }

    private async loadCommands(dir: string): Promise<void> {
        await traverseDirectory(
            dir,
            (fullPath, rel, mod) => {
                for (const exported of Object.values(mod))
                    if (this.isCommandClass(exported)) {
                        this.registerCommand(exported, rel);
                        this.hmrHandler?.trackHandler(fullPath, exported);
                    }
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
            this.logger.utils.registration(ctor.name, rel);
            this.logger.utils.item(`Global ${commandType}: ${chalk.bold.cyan(comp.name)}`);
        } else {
            for (const g of meta.guilds) {
                const arr = this.guildCommands.get(g) ?? [];
                arr.push(comp);
                this.guildCommands.set(g, arr);
            }
            this.logger.utils.registration(ctor.name, rel);
            this.logger.utils.item(
                `Guild ${commandType}: ${chalk.bold.cyan(comp.name)} for ${chalk.magenta.bold(meta.guilds.length)} guild(s)`
            );
        }
        this.ctorToCommand.set(ctor, {
            name: comp.name,
            scope: meta.scope,
            ...(meta.scope === 'guild' ? { guilds: meta.guilds } : {})
        });
    }

    private unregisterCommand(ctor: CommandCtor, artifacts?: CommandArtifact): void {
        const info = artifacts ?? this.ctorToCommand.get(ctor);
        if (!info) return;

        if (info.scope === 'global') {
            const idx = this.globalCommands.findIndex((c) => c.name === info.name);
            if (idx !== -1) this.globalCommands.splice(idx, 1);
        } else {
            for (const g of info.guilds ?? []) {
                const arr = this.guildCommands.get(g);
                if (arr) {
                    const idx = arr.findIndex((c) => c.name === info.name);
                    if (idx !== -1) arr.splice(idx, 1);
                }
            }
        }
        this.ctorToCommand.delete(ctor);
    }

    public async setCommands(): Promise<void> {
        if (this.globalCommands.length > 0) {
            await this.core.bot.client.application?.commands.set(this.globalCommands);
            const tag = this.globalCommands.length === 1 ? 'command' : 'commands';
            this.logger.utils.summary('Configured global', {
                [tag]: this.globalCommands.length
            });
            this.logger.utils.item(`${this.globalCommands.map((command) => chalk.bold.cyan(command.name)).join(', ')}`);
        }

        for (const [guildId, commands] of this.guildCommands.entries()) {
            const guild = this.core.bot.client.guilds.cache.get(guildId);
            if (!guild) {
                this.logger.warn(`Guild with ID ${guildId} not found, skipping command registration.`);
                continue;
            }

            await guild.commands.set(commands);
            const tag = commands.length === 1 ? 'command' : 'commands';
            this.logger.utils.summary(`Configured commands for ${chalk.bold.yellow(guild.name)}`, {
                [tag]: commands.length
            });
            this.logger.utils.item(`${commands.map((command) => chalk.bold.cyan(command.name)).join(', ')}`);
        }
    }

    /** The deduplicated slash route keys across every global and guild command. @internal */
    public routeLeaves(): Set<string> {
        return slashRouteLeaves([...this.globalCommands, ...this.guildCommands.values()].flat());
    }
}
