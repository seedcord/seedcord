import { resolve } from 'node:path';

import { SlashCommandBuilder } from '@discordjs/builders';
import { BuilderComponent } from '@seedcord/core';
import { HmrModuleHandler } from '@seedcord/core/hmr';
import { CommandMetadataKey, getDevChannel } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { Logger, paint } from '@seedcord/logger';
import { formatFilePath } from '@seedcord/utils';
import { traverseDirectory } from '@seedcord/utils/node';
import chalk from 'chalk';
import { Collection } from 'discord.js';
import { Envapter } from 'envapt';

import { contextMenuLeaves } from '@bUtilities/miscellaneous/contextMenuLeaves';
import { slashRouteLeaves } from '@bUtilities/miscellaneous/slashRouteLeaves';

import type { ContextMenuLeaves } from '@bUtilities/miscellaneous/contextMenuLeaves';
import type { ContextMenuCommandBuilder } from '@discordjs/builders';
import type { Core } from '@interfaces/Core';
import type { Initializeable } from '@interfaces/Plugin';
import type { CommandMeta } from '@seedcord/core/internal';
import type { HmrAware, HmrUpdateEvent } from '@seedcord/types';
import type { ApplicationCommand, Snowflake } from 'discord.js';

type CommandCtor = new () => BuilderComponent<'command' | 'context_menu'>;

/** The command collections Discord returns from each scope's deploy, keyed by command id. */
export interface DeployResult {
    global: Collection<Snowflake, ApplicationCommand>;
    guilds: Collection<Snowflake, Collection<Snowflake, ApplicationCommand>>;
}

interface CommandArtifact {
    name: string;
    scope: 'global' | 'guild';
    guilds?: string[];
}

/**
 * Manages Discord application command registration and deployment.
 *
 * Scans command directories, builds command structures, and registers both global and guild-scoped commands
 * to Discord's API. Accessed via `core.bot.commands`. Do not construct it directly.
 */
export class CommandRegistry implements Initializeable, HmrAware {
    public readonly name = 'Commands';
    private readonly logger = new Logger('Commands');
    private isInitialised = false;

    public readonly globalCommands: (SlashCommandBuilder | ContextMenuCommandBuilder)[] = [];
    public readonly guildCommands = new Collection<string, (SlashCommandBuilder | ContextMenuCommandBuilder)[]>();

    private readonly ctorToCommand = new Map<CommandCtor, CommandArtifact>();

    // batched during bulk load, hmr registrations log inline
    private loading = false;
    private readonly loadedCommands: { name: string; from: string; kind: 'slash command' | 'context menu' }[] = [];

    private readonly hmrHandler?: HmrModuleHandler<CommandCtor, void, CommandArtifact | undefined>;
    private readonly pendingEvents = new Map<string, HmrUpdateEvent>();

    public constructor(
        private readonly core: Core,
        private readonly onDeployed?: (result: DeployResult) => void
    ) {
        const commandsDir = this.core.config.bot.commands.path;
        if (!commandsDir) {
            throw new SeedcordError(SeedcordErrorCode.CoreControllerPathMissing, ['CommandRegistry', 'commands']);
        }

        if (!Envapter.isDevelopment && !Envapter.isTest) return;
        this.hmrHandler = new HmrModuleHandler<CommandCtor, void, CommandArtifact | undefined>({
            handlersDir: commandsDir,
            isHandler: this.isCommandClass.bind(this),
            registerHandler: this.registerCommand.bind(this),
            unregisterHandler: this.unregisterCommand.bind(this),
            getArtifacts: this.getArtifacts.bind(this),
            logger: this.logger
        });
    }

    private getArtifacts(ctor: CommandCtor): CommandArtifact | undefined {
        return this.ctorToCommand.get(ctor);
    }

    /** @internal */
    public async init(): Promise<void> {
        if (this.isInitialised) return;
        this.isInitialised = true;

        const commandsDir = this.core.config.bot.commands.path;
        if (!commandsDir) return;

        this.loading = true;
        this.loadedCommands.length = 0;
        try {
            await this.loadCommands(commandsDir);
        } finally {
            this.loading = false;
        }

        this.reportLoad();

        getDevChannel()?.on('seedcord:refresh-commands', (data) => {
            void this.refresh(data.shouldRefresh);
        });
    }

    private reportLoad(): void {
        const { utils } = this.logger;

        utils.summary('Loaded commands', {
            global: this.globalCommands.length,
            'guild groups': this.guildCommands.size
        });

        let slash = 0;
        let menu = 0;
        for (const command of this.loadedCommands) {
            if (command.kind === 'slash command') slash++;
            else menu++;
        }

        utils.block('Loaded commands', [
            ...utils.entries(this.loadedCommands),
            ...utils.counts({ 'slash commands': slash, 'context menus': menu })
        ]);
    }

    /** @internal */
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
            getDevChannel()?.send('seedcord:commands-update-prompt', {
                files: [...this.pendingEvents.keys()].map((f) => formatFilePath(f))
            });
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
        const kind = comp instanceof SlashCommandBuilder ? 'slash command' : 'context menu';

        if (meta.scope === 'global') {
            this.globalCommands.push(comp);
        } else {
            for (const g of meta.guilds) {
                const arr = this.guildCommands.get(g) ?? [];
                arr.push(comp);
                this.guildCommands.set(g, arr);
            }
        }

        this.ctorToCommand.set(ctor, {
            name: comp.name,
            scope: meta.scope,
            ...(meta.scope === 'guild' && { guilds: meta.guilds })
        });

        if (this.loading) {
            this.loadedCommands.push({ name: comp.name, from: formatFilePath(rel), kind });
            return;
        }

        this.logger.utils.registration(comp.name, rel, `${meta.scope} ${kind}`);
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

    /** @internal */
    public async setCommands(): Promise<DeployResult> {
        const result: DeployResult = { global: new Collection(), guilds: new Collection() };

        if (this.globalCommands.length > 0) {
            const deployed = await this.core.bot.client.application?.commands.set(this.globalCommands);
            if (deployed) result.global = deployed;
            const tag = this.globalCommands.length === 1 ? 'command' : 'commands';
            this.logger.utils.block(
                `Deployed ${this.globalCommands.length} global ${tag}`,
                this.logger.utils.wrap(this.globalCommands.map((command) => command.name)),
                'info'
            );
        }

        for (const [guildId, commands] of this.guildCommands.entries()) {
            const guild = this.core.bot.client.guilds.cache.get(guildId);
            if (!guild) {
                this.logger.warn(`Guild with ID ${guildId} not found, skipping command registration.`);
                continue;
            }

            const deployed = await guild.commands.set(commands);
            result.guilds.set(guildId, deployed);
            const tag = commands.length === 1 ? 'command' : 'commands';
            this.logger.utils.block(
                `Deployed ${commands.length} ${tag} to ${paint.amber.bold(guild.name)}`,
                this.logger.utils.wrap(commands.map((command) => command.name)),
                'info'
            );
        }

        this.onDeployed?.(result);
        return result;
    }

    /** The deduplicated slash route keys across every global and guild command. @internal */
    public routeLeaves(): Set<string> {
        return slashRouteLeaves([...this.globalCommands, ...this.guildCommands.values()].flat());
    }

    /** The registered context-menu command names, split by kind, across every global and guild command. @internal */
    public contextMenuLeaves(): ContextMenuLeaves {
        return contextMenuLeaves([...this.globalCommands, ...this.guildCommands.values()].flat());
    }
}
