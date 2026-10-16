import { sep } from 'node:path';

import { SlashCommandBuilder } from '@discordjs/builders';
import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { Logger } from '@seedcord/logger';
import { formatFilePath } from '@seedcord/utils';
import { pluralize } from '@seedcord/utils/internal';
import { traverseDirectory } from '@seedcord/utils/node';
import { resolveFolder } from '@seedcord/utils/node/internal';
import { Envapter } from 'envapt';

import { getDevChannel } from '#hmr/devChannel';
import { HmrModuleHandler } from '#hmr/HmrModuleHandler';
import { CommandInjector } from '#src/commands/CommandInjector';
import { contextMenuLeaves } from '#src/commands/contextMenuLeaves';
import { resolveDeployTarget } from '#src/commands/deployTarget';
import { isCommandClass } from '#src/commands/isCommandClass';
import { putCommands } from '#src/commands/putCommands';
import { readCommands } from '#src/commands/readCommands';
import { scopeHashes, splitByHash } from '#src/commands/scopeHashes';
import { slashRouteLeaves } from '#src/commands/slashRouteLeaves';
import { CommandMetadataKey } from '#src/metadataKeys';
import { PublishDefault } from '#subscribers/publishDefault';

import type { CommandMeta } from '#decorators/Command';
import type { CoreBase } from '#interfaces/CoreBase';
import type { ContextMenuLeaves } from '#src/commands/contextMenuLeaves';
import type { DeployTarget } from '#src/commands/deployTarget';
import type { CommandCtor } from '#src/commands/isCommandClass';
import type { CommandBody, CommandScopes, DeployedScope } from '#src/commands/putCommands';
import type { CommandBuilder, DeployResult } from '#src/commands/types';
import type { Initializeable } from '#src/plugin/Plugin';
import type { AllSubscriptions } from '#subscribers/types/Subscriptions';
import type { HmrAware, HmrUpdateEvent } from '@seedcord/types';
import type { DeployedHashes } from '@seedcord/types/internal';
import type { APIApplicationCommand } from 'discord-api-types/v10';

type CommandArtifact = DeployTarget & { name: string };

// gateway's and http's InteractionDispatcher both fit this
interface RouteWarnings {
    warnUnhandledRoutes(leaves: Iterable<string>): void;
    warnUnhandledContextMenuRoutes(leaves: ContextMenuLeaves): void;
}

interface DeployOptions {
    routes?: RouteWarnings | undefined;
    check?: (commands: CommandBuilder[]) => void;
    // seedcord dev passes what it deployed last time
    deployed?: DeployedHashes | undefined;
}

// discord's global command bucket allows 2 PUTs a minute
// 75s covers a full wait plus the request itself
export const COMMAND_DEPLOY_TIMEOUT_MS = 75_000;

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
    private deployed?: DeployedHashes | undefined;

    private readonly dir: string;
    private readonly configuredGuilds: readonly string[];

    public constructor(private readonly core: CoreBase) {
        const { commands } = core.config.bot;
        if (!commands.path) {
            throw new SeedcordError(SeedcordErrorCode.CoreControllerPathMissing, ['CommandRegistry', 'commands']);
        }
        this.dir = commands.path;
        this.configuredGuilds = commands.guilds ?? [];

        if (!Envapter.isDevelopment && !Envapter.isTest) return;
        this.hmrHandler = new HmrModuleHandler<CommandCtor, void, CommandArtifact | undefined>({
            handlersDir: this.dir,
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
        if (event.file.startsWith(resolveFolder(this.dir) + sep)) {
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
        for await (const { fullPath, relativePath, imported } of traverseDirectory(dir)) {
            for (const exported of Object.values(imported)) {
                if (!isCommandClass(exported)) continue;
                this.registerCommand(exported, relativePath);
                this.hmrHandler?.trackHandler(fullPath, exported);
            }
        }
    }

    private registerCommand(Ctor: CommandCtor, rel: string): void {
        const meta = Reflect.getMetadata(CommandMetadataKey, Ctor) as CommandMeta | undefined;

        if (!meta) return;

        const instance = new Ctor();
        const comp = instance.component;
        const kind = comp instanceof SlashCommandBuilder ? 'slash command' : 'context menu';

        const target = resolveDeployTarget(meta, this.configuredGuilds, Ctor.name);

        if (target.scope === 'global') {
            this.globalCommands.push(comp);
        } else {
            for (const g of target.guilds) {
                const arr = this.guildCommands.get(g) ?? [];
                arr.push(comp);
                this.guildCommands.set(g, arr);
            }
        }

        this.ctorToCommand.set(Ctor, { name: comp.name, ...target });

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
            for (const g of info.guilds) {
                const arr = this.guildCommands.get(g);
                if (!arr) continue;
                const idx = arr.findIndex((c) => c.name === info.name);
                if (idx !== -1) arr.splice(idx, 1);
            }
        }
        this.ctorToCommand.delete(ctor);
    }

    /** @internal */
    public async deploy(signal: AbortSignal, { routes, check, deployed }: DeployOptions): Promise<void> {
        await this.init();
        check?.(this.allCommands());
        this.deployed = deployed;
        await this.setCommands(signal);
        routes?.warnUnhandledRoutes(this.routeLeaves());
        routes?.warnUnhandledContextMenuRoutes(this.contextMenuLeaves());
    }

    /** @internal */
    public async setCommands(signal?: AbortSignal): Promise<DeployResult> {
        const scopes = this.scopes();
        const hashes = await scopeHashes(scopes);
        // read here because gateway assigns core.rest after this registry is constructed
        const { rest, applicationId } = this.core;
        const last = this.deployed?.applicationId === applicationId ? this.deployed : undefined;
        const { changed, unchanged } = splitByHash(scopes, hashes, last);
        this.reportUnchanged(unchanged);

        const [put, read] = await Promise.all([
            putCommands(changed, {
                rest,
                applicationId,
                logger: this.logger,
                signal,
                onDeployed: (where, commands) => this.reportDeployed(where, commands)
            }),
            readCommands(
                { global: unchanged.global !== undefined, guildIds: unchanged.guilds.keys() },
                { rest, applicationId, signal }
            )
        ]);
        const result = mergeResults(put, read);
        this.deployed = { applicationId, ...hashes };

        this.injector.inject(result, this.allCommands());
        this.core.bus[PublishDefault]('commandsDeployed', deployedPayload(result));
        return result;
    }

    private scopes(): CommandScopes {
        return {
            // a guild-only start keeps the global commands another deploy put there
            global: this.globalCommands.length > 0 ? this.globalCommands.map((c) => c.toJSON()) : undefined,
            guilds: new Map(
                [...this.guildCommands].map(([guildId, commands]) => [guildId, commands.map((c) => c.toJSON())])
            )
        };
    }

    private reportUnchanged({ global, guilds }: CommandScopes): void {
        const scopes = [...(global ? ['global'] : []), ...[...guilds.keys()].map((id) => paint.sky.bold(id))];
        if (scopes.length === 0) return;
        const list = new Intl.ListFormat('en', { type: 'conjunction' }).format(scopes);
        this.logger.info(`Skipped deploying ${list}. Their commands match the last deploy.`);
    }

    private reportDeployed(where: DeployedScope, commands: readonly CommandBody[]): void {
        const { utils } = this.logger;
        const count = paint.iris.bold(commands.length);
        const tag = pluralize(commands.length, 'command');
        const title =
            where.scope === 'global'
                ? `Deployed ${count} global ${tag}`
                : `Deployed ${count} ${tag} to ${paint.sky.bold(where.guildId)}`;

        utils.block(title, utils.wrap(commands.map((command) => command.name)), 'info');
    }

    private allCommands(): CommandBuilder[] {
        return [...this.globalCommands, ...this.guildCommands.values()].flat();
    }

    private routeLeaves(): Set<string> {
        return slashRouteLeaves(this.allCommands());
    }

    private contextMenuLeaves(): ContextMenuLeaves {
        return contextMenuLeaves(this.allCommands().map((command) => command.toJSON()));
    }
}

function mergeResults(put: DeployResult, read: DeployResult): DeployResult {
    return {
        global: new Map([...put.global, ...read.global]),
        guilds: new Map([...put.guilds, ...read.guilds])
    };
}

function deployedPayload(result: DeployResult): AllSubscriptions['commandsDeployed'] {
    const guilds: Record<string, APIApplicationCommand[]> = {};
    for (const [guildId, deployed] of result.guilds) guilds[guildId] = [...deployed.values()];

    return { global: [...result.global.values()], guilds };
}
