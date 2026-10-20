import { SlashCommandBuilder } from '@discordjs/builders';
import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { Logger } from '@seedcord/logger';
import { formatFilePath, importFiles } from '@seedcord/utils';
import { botFolder } from '@seedcord/utils/internal';
import { Envapter } from 'envapt';

import { getDevChannel } from '#hmr/devChannel';
import { HmrModuleHandler } from '#hmr/HmrModuleHandler';
import { CommandInjector } from '#src/commands/CommandInjector';
import { contextMenuLeaves } from '#src/commands/contextMenuLeaves';
import { DeployReporter } from '#src/commands/DeployReporter';
import { resolveDeployTarget } from '#src/commands/deployTarget';
import { isCommandClass } from '#src/commands/isCommandClass';
import { LastDeploy } from '#src/commands/LastDeploy';
import { planDeploy } from '#src/commands/planDeploy';
import { putCommands } from '#src/commands/putCommands';
import { readCommands } from '#src/commands/readCommands';
import { GLOBAL_ID, scopeIdsOf } from '#src/commands/scopes';
import { slashRouteLeaves } from '#src/commands/slashRouteLeaves';
import { CommandMetadataKey } from '#src/metadataKeys';
import { PublishDefault } from '#subscribers/publishDefault';

import type { CommandMeta } from '#decorators/Command';
import type { CoreBase } from '#interfaces/CoreBase';
import type { ContextMenuLeaves } from '#src/commands/contextMenuLeaves';
import type { DeployTarget } from '#src/commands/deployTarget';
import type { CommandCtor } from '#src/commands/isCommandClass';
import type { CommandBody, CommandScopes } from '#src/commands/putCommands';
import type { ScopeId } from '#src/commands/scopes';
import type { CommandBuilder, DeployResult } from '#src/commands/types';
import type { Initializeable } from '#src/plugin/Plugin';
import type { AllSubscriptions } from '#subscribers/types/Subscriptions';
import type { HmrAware, HmrUpdateEvent } from '@seedcord/types';
import type { APIApplicationCommand } from 'discord-api-types/v10';

type CommandArtifact = DeployTarget & { name: string };

// gateway's and http's InteractionDispatcher both fit this
interface RouteWarnings {
    warnUnhandledRoutes(leaves: Iterable<string>): void;
    warnUnhandledContextMenuRoutes(leaves: ContextMenuLeaves): void;
}

interface DeployHooks {
    routes?: RouteWarnings | undefined;
    check?: (commands: CommandBuilder[]) => void;
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

    public readonly scopedCommands = new Map<ScopeId, CommandBuilder[]>();

    private readonly ctorToCommand = new Map<CommandCtor, CommandArtifact>();

    // batched during bulk load. A reload reports on the hmr channel instead
    private loading = false;
    private readonly loadedCommands: { name: string; from: string; kind: 'slash command' | 'context menu' }[] = [];

    private readonly hmrHandler?: HmrModuleHandler<CommandCtor, void, CommandArtifact | undefined>;
    private readonly pendingEvents = new Map<string, HmrUpdateEvent>();
    private readonly injector = new CommandInjector();
    private readonly lastDeploy = new LastDeploy();
    private readonly reporter = new DeployReporter(this.logger);

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
            {
                global: this.scopedCommands.get(GLOBAL_ID)?.length ?? 0,
                'guild groups': [...this.scopedCommands.keys()].filter((scope) => scope !== GLOBAL_ID).length
            },
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
        if (botFolder(this.dir).holds(event.file)) {
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
        for await (const { fullPath, relativePath, imported } of importFiles(dir)) {
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

        for (const scope of scopeIdsOf(target)) {
            const inScope = this.scopedCommands.get(scope);
            if (inScope) inScope.push(comp);
            else this.scopedCommands.set(scope, [comp]);
        }

        this.ctorToCommand.set(Ctor, { name: comp.name, ...target });

        if (this.loading) {
            this.loadedCommands.push({ name: comp.name, from: formatFilePath(rel), kind });
        }
    }

    private unregisterCommand(ctor: CommandCtor, artifacts?: CommandArtifact): void {
        const info = artifacts ?? this.ctorToCommand.get(ctor);
        if (!info) return;

        for (const scope of scopeIdsOf(info)) {
            const inScope = this.scopedCommands.get(scope) ?? [];
            const idx = inScope.findIndex((c) => c.name === info.name);
            if (idx !== -1) inScope.splice(idx, 1);
        }
        this.ctorToCommand.delete(ctor);
    }

    /** @internal */
    public async deploy(signal: AbortSignal, { routes, check }: DeployHooks): Promise<void> {
        await this.init();
        check?.(this.allCommands());
        await this.setCommands(signal);
        routes?.warnUnhandledRoutes(this.routeLeaves());
        routes?.warnUnhandledContextMenuRoutes(this.contextMenuLeaves());
    }

    /** @internal */
    public async setCommands(signal?: AbortSignal): Promise<DeployResult> {
        // read here because gateway assigns core.rest after this registry is constructed
        const { rest, applicationId } = this.core;
        const last = await this.lastDeploy.read(applicationId, signal);
        const plan = await planDeploy(this.commandBodies(), last?.scopes, (unchanged) =>
            readCommands(unchanged, { rest, applicationId, signal })
        );
        await this.reporter.readGuildNames(rest, [...plan.toPut.keys(), ...plan.skipped], signal);
        if (plan.toPut.size > 0) this.lastDeploy.save({ applicationId, scopes: plan.skippedHashes });
        const put = await putCommands(plan.toPut, {
            rest,
            applicationId,
            logger: this.logger,
            signal,
            onDeployed: (scope: ScopeId, commands: readonly CommandBody[]) => this.reporter.deployed(scope, commands)
        });

        this.reporter.skipped(plan.skipped);
        const result: DeployResult = new Map([...plan.onDiscord, ...put]);
        this.lastDeploy.save({ applicationId, scopes: plan.hashes });

        this.injector.inject(result, this.allCommands());
        this.core.bus[PublishDefault]('commandsDeployed', deployedPayload(result));
        return result;
    }

    private commandBodies(): CommandScopes {
        // a guild-only start keeps the global commands another deploy put there
        const deployable = this.scopedCommands
            .entries()
            .filter(([scope, commands]) => scope !== GLOBAL_ID || commands.length > 0);
        return new Map(deployable.map(([scope, commands]) => [scope, commands.map((c) => c.toJSON())]));
    }

    private allCommands(): CommandBuilder[] {
        return [...this.scopedCommands.values()].flat();
    }

    private routeLeaves(): Set<string> {
        return slashRouteLeaves(this.allCommands());
    }

    private contextMenuLeaves(): ContextMenuLeaves {
        return contextMenuLeaves(this.allCommands().map((command) => command.toJSON()));
    }
}

function deployedPayload(result: DeployResult): AllSubscriptions['commandsDeployed'] {
    const guilds: Record<string, APIApplicationCommand[]> = {};
    for (const [scope, deployed] of result) {
        if (scope !== GLOBAL_ID) guilds[scope] = [...deployed.values()];
    }
    return { global: [...(result.get(GLOBAL_ID)?.values() ?? [])], guilds };
}
