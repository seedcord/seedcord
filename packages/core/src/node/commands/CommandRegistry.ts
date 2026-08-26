import { resolve } from 'node:path';

import { SlashCommandBuilder } from '@discordjs/builders';
import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { Logger } from '@seedcord/logger';
import { formatFilePath } from '@seedcord/utils';
import { traverseDirectory } from '@seedcord/utils/node';
import { Routes } from 'discord-api-types/v10';
import { Envapter } from 'envapt';

import { getDevChannel } from '#hmr/devChannel';
import { HmrModuleHandler } from '#hmr/HmrModuleHandler';
import { CommandInjector } from '#src/commands/CommandInjector';
import { contextMenuLeaves } from '#src/commands/contextMenuLeaves';
import { isCommandClass } from '#src/commands/isCommandClass';
import { slashRouteLeaves } from '#src/commands/slashRouteLeaves';
import { CommandMetadataKey } from '#src/metadataKeys';
import { PublishDefault } from '#subscribers/publishDefault';

import type { CommandMeta } from '#decorators/Command';
import type { CoreBase } from '#interfaces/CoreBase';
import type { ContextMenuLeaves } from '#src/commands/contextMenuLeaves';
import type { CommandCtor } from '#src/commands/isCommandClass';
import type { CommandBuilder, DeployResult } from '#src/commands/types';
import type { Initializeable } from '#src/plugin/Plugin';
import type { AllSubscriptions } from '#subscribers/types/Subscriptions';
import type { HmrAware, HmrUpdateEvent } from '@seedcord/types';
import type { APIApplicationCommand } from 'discord-api-types/v10';

interface CommandArtifact {
    name: string;
    scope: 'global' | 'guild';
    guilds?: string[];
}

function indexById(commands: readonly APIApplicationCommand[]): Map<string, APIApplicationCommand> {
    return new Map(commands.map((command) => [command.id, command]));
}

/**
 * Scans the command directory, builds each command, and PUTs the global and guild scopes to Discord.
 *
 * @internal
 */
export class CommandRegistry implements Initializeable, HmrAware {
    private readonly logger = new Logger('Commands', { channel: 'commands' });
    private isInitialised = false;

    public readonly globalCommands: CommandBuilder[] = [];
    public readonly guildCommands = new Map<string, CommandBuilder[]>();

    private readonly ctorToCommand = new Map<CommandCtor, CommandArtifact>();

    // batched during bulk load. A reload reports on the hmr channel instead
    private loading = false;
    private readonly loadedCommands: { name: string; from: string; kind: 'slash command' | 'context menu' }[] = [];

    private readonly hmrHandler?: HmrModuleHandler<CommandCtor, void, CommandArtifact | undefined>;
    private readonly pendingEvents = new Map<string, HmrUpdateEvent>();
    private readonly injector = new CommandInjector();

    private readonly dir: string;

    public constructor(private readonly core: CoreBase) {
        const dir = core.config.bot.commands.path;
        if (!dir) {
            throw new SeedcordError(SeedcordErrorCode.CoreControllerPathMissing, ['CommandRegistry', 'commands']);
        }
        this.dir = dir;

        if (!Envapter.isDevelopment && !Envapter.isTest) return;
        this.hmrHandler = new HmrModuleHandler<CommandCtor, void, CommandArtifact | undefined>({
            handlersDir: dir,
            isHandler: isCommandClass,
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

        this.loading = true;
        this.loadedCommands.length = 0;
        try {
            await this.loadCommands(this.dir);
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

        utils.summary(
            'Loaded commands',
            { global: this.globalCommands.length, 'guild groups': this.guildCommands.size },
            'debug'
        );

        let slash = 0;
        let menu = 0;
        for (const command of this.loadedCommands) {
            if (command.kind === 'slash command') slash++;
            else menu++;
        }

        utils.block(
            'Loaded commands',
            [
                ...utils.entries(this.loadedCommands),
                ...utils.counts({ 'slash commands': slash, 'context menus': menu })
            ],
            'debug'
        );
    }

    /** @internal */
    public async refresh(shouldRefresh = true): Promise<void> {
        if (!shouldRefresh) {
            this.logger.debug(paint.italic('Command refresh cancelled.'));
            this.pendingEvents.clear();
            return;
        }

        this.logger.debug(paint.italic('Refreshing commands...'));
        for (const event of this.pendingEvents.values()) {
            await this.hmrHandler?.handle(event);
        }
        this.pendingEvents.clear();
        await this.setCommands();
    }

    /** @internal */
    public async onHmr(event: HmrUpdateEvent): Promise<void> {
        if (event.file.startsWith(resolve(process.cwd(), this.dir))) {
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
        await traverseDirectory(dir, (fullPath, rel, mod) => {
            for (const exported of Object.values(mod))
                if (isCommandClass(exported)) {
                    this.registerCommand(exported, rel);
                    this.hmrHandler?.trackHandler(fullPath, exported);
                }
        });
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
        }
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
        const result: DeployResult = { global: new Map(), guilds: new Map() };
        const appId = this.core.applicationId;

        if (this.globalCommands.length > 0) {
            const deployed = await this.put(Routes.applicationCommands(appId), this.globalCommands);
            result.global = indexById(deployed);
            const tag = this.globalCommands.length === 1 ? 'command' : 'commands';
            this.logger.utils.block(
                `Deployed ${this.globalCommands.length} global ${tag}`,
                this.logger.utils.wrap(this.globalCommands.map((command) => command.name)),
                'info'
            );
        }

        for (const [guildId, commands] of this.guildCommands.entries()) {
            const deployed = await this.put(Routes.applicationGuildCommands(appId, guildId), commands);
            result.guilds.set(guildId, indexById(deployed));
            const tag = commands.length === 1 ? 'command' : 'commands';
            this.logger.utils.block(
                `Deployed ${paint.iris.bold(commands.length)} ${tag} to ${paint.sky.bold(guildId)}`,
                this.logger.utils.wrap(commands.map((command) => command.name)),
                'info'
            );
        }

        this.injector.inject(result, this.allCommands());
        this.core.bus[PublishDefault]('commandsDeployed', deployedPayload(result));
        return result;
    }

    private async put(route: `/${string}`, commands: readonly CommandBuilder[]): Promise<APIApplicationCommand[]> {
        const body = commands.map((command) => command.toJSON());
        // read here because gateway assigns core.rest after this registry is constructed
        const { rest } = this.core;
        // justified: the bulk-overwrite routes return the deployed command array
        return (await rest.put(route, { body })) as APIApplicationCommand[];
    }

    /** Every registered builder, global first. A guild command in N guilds appears once per guild. @internal */
    public allCommands(): CommandBuilder[] {
        return [...this.globalCommands, ...this.guildCommands.values()].flat();
    }

    /** @internal */
    public routeLeaves(): Set<string> {
        return slashRouteLeaves(this.allCommands());
    }

    /** @internal */
    public contextMenuLeaves(): ContextMenuLeaves {
        return contextMenuLeaves(this.allCommands());
    }
}

function deployedPayload(result: DeployResult): AllSubscriptions['commandsDeployed'] {
    const guilds: Record<string, APIApplicationCommand[]> = {};
    for (const [guildId, deployed] of result.guilds) guilds[guildId] = [...deployed.values()];

    return { global: [...result.global.values()], guilds };
}
