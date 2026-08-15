/* eslint-disable max-lines -- one handler method per interaction type keeps the router in one file */
import { DispatchContext } from '@seedcord/core';
import { HmrModuleHandler } from '@seedcord/core/hmr';
import {
    InteractionMetadataKey,
    InteractionRouteKeys,
    InteractionRoutes,
    asError,
    outcomeFor,
    queuedMsFor,
    reportDispatch,
    MiddlewareMetadataKey,
    prefixOf,
    PublishDefault,
    routeIdOf,
    runHandlerGates,
    slowGateMonitor,
    areRoutes
} from '@seedcord/core/internal';
import { settleWithin } from '@seedcord/core/node/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { Logger, paint } from '@seedcord/logger';
import { formatFilePath, hasKeys } from '@seedcord/utils';
import { traverseDirectory } from '@seedcord/utils/node';
import chalk from 'chalk';
import { Events } from 'discord.js';
import { Envapter } from 'envapt';

import { MiddlewareType } from '@bDecorators/Middlewares';
import { CONFIRM_DEF } from '@bot/confirm/reserved';
import { UnhandledAutocomplete, UnhandledRepliable } from '@bot/defaults';
import { interactionGateContext } from '@bot/gates/runGates';
import { handleInteractionFault } from '@bot/handleInteractionFault';
import { slashRouteOf } from '@bUtilities/miscellaneous/slashRouteOf';
import { AutocompleteHandler, InteractionMiddleware } from '@handlers/interaction';
import { InteractionHandler } from '@handlers/interaction/InteractionHandler';
import { RepliableHandler } from '@handlers/RepliableHandler';

import type { MiddlewareMetadata } from '@bDecorators/Middlewares';
import type { ReplySender } from '@bot/ReplySender';
import type { HandlerConstructor, InteractionMiddlewareConstructor } from '@handlers/constructors';
import type { Core } from '@interfaces/Core';
import type { DispatchOutcome, Initializeable } from '@seedcord/core';
import type { ContextMenuLeaves } from '@seedcord/core/internal';
import type { CustomIdMatcher, HmrAware, HmrUpdateEvent } from '@seedcord/types';
import type { Repliables, ValidInteractionTypes } from '@src/handlers/interactionTypes';
import type {
    AutocompleteInteraction,
    ButtonInteraction,
    ChannelSelectMenuInteraction,
    ChatInputCommandInteraction,
    Interaction,
    MentionableSelectMenuInteraction,
    MessageContextMenuCommandInteraction,
    ModalSubmitInteraction,
    RoleSelectMenuInteraction,
    StringSelectMenuInteraction,
    UserContextMenuCommandInteraction,
    UserSelectMenuInteraction
} from 'discord.js';

interface InteractionArtifact {
    routeType: InteractionRoutes;
    routes: string[];
}

interface RegisteredMiddleware {
    readonly ctor: InteractionMiddlewareConstructor;
    readonly priority: number;
}

interface DispatchedHandler {
    execute(): Promise<void>;
}

export class InteractionDispatcher implements Initializeable, HmrAware {
    private readonly logger = new Logger('Interactions', { channel: 'interactions' });
    private isInitialized = false;

    private readonly slashMap = new Map<string, HandlerConstructor>();
    private readonly buttonMap = new Map<string, HandlerConstructor>();
    private readonly modalMap = new Map<string, HandlerConstructor>();
    private readonly stringSelectMap = new Map<string, HandlerConstructor>();
    private readonly userSelectMap = new Map<string, HandlerConstructor>();
    private readonly roleSelectMap = new Map<string, HandlerConstructor>();
    private readonly channelSelectMap = new Map<string, HandlerConstructor>();
    private readonly mentionableSelectMap = new Map<string, HandlerConstructor>();
    private readonly messageContextMenuMap = new Map<string, HandlerConstructor>();
    private readonly userContextMenuMap = new Map<string, HandlerConstructor>();
    private readonly autocompleteMap = new Map<string, HandlerConstructor>();

    private readonly handlerFiles = new Map<HandlerConstructor, string>();

    private readonly keysToIgnore = new Set<CustomIdMatcher>();
    private readonly middlewares: RegisteredMiddleware[] = [];

    private readonly inFlight = new Set<Promise<void>>();
    private draining = false;

    // batched during bulk load. a reload reports on the hmr channel instead
    private loading = false;
    private readonly loadedHandlers: { name: string; from: string }[] = [];
    private readonly loadedMiddlewares: { name: string; from: string }[] = [];

    private readonly hmrHandler?: HmrModuleHandler<
        HandlerConstructor,
        InteractionMiddlewareConstructor,
        InteractionArtifact[]
    >;

    private readonly routeTypes: [InteractionRoutes, Map<string, HandlerConstructor>][] = [
        [InteractionRoutes.Slash, this.slashMap],
        [InteractionRoutes.Button, this.buttonMap],
        [InteractionRoutes.Modal, this.modalMap],
        [InteractionRoutes.StringMenu, this.stringSelectMap],
        [InteractionRoutes.UserMenu, this.userSelectMap],
        [InteractionRoutes.RoleMenu, this.roleSelectMap],
        [InteractionRoutes.ChannelMenu, this.channelSelectMap],
        [InteractionRoutes.MentionableMenu, this.mentionableSelectMap],
        [InteractionRoutes.MessageContextMenu, this.messageContextMenuMap],
        [InteractionRoutes.UserContextMenu, this.userContextMenuMap],
        [InteractionRoutes.Autocomplete, this.autocompleteMap]
    ];

    constructor(protected core: Core) {
        const ignoredKeysFromConfig = hasKeys(this.core.config.bot.interactions, ['ignoreCustomIds'])
            ? this.core.config.bot.interactions.ignoreCustomIds
            : undefined;
        if (ignoredKeysFromConfig) {
            for (const ignoredKey of ignoredKeysFromConfig) this.keysToIgnore.add(ignoredKey);
        }

        // the in-process getConfirmation() collector consumes these clicks, so the global router would double-ack them
        this.keysToIgnore.add(CONFIRM_DEF);

        const interactionsDir = this.core.config.bot.interactions.path;
        if (!interactionsDir) {
            throw new SeedcordError(SeedcordErrorCode.CoreControllerPathMissing, [
                'InteractionDispatcher',
                'interactions'
            ]);
        }

        if (!Envapter.isDevelopment && !Envapter.isTest) return;
        this.hmrHandler = new HmrModuleHandler({
            handlersDir: interactionsDir,
            ...(hasKeys(this.core.config.bot.interactions, ['middlewares']) &&
                this.core.config.bot.interactions.middlewares && {
                    middlewaresDir: this.core.config.bot.interactions.middlewares
                }),
            isHandler: this.isHandlerClass.bind(this),
            isMiddleware: this.isMiddlewareClass.bind(this),
            registerHandler: this.registerHandler.bind(this),
            registerMiddleware: this.registerMiddleware.bind(this),
            unregisterHandler: this.unregisterHandler.bind(this),
            unregisterMiddleware: this.unregisterMiddleware.bind(this),
            getArtifacts: this.getArtifacts.bind(this),
            logger: this.logger
        });
    }

    public warnUnhandledRoutes(commandLeaves: Iterable<string>): void {
        for (const route of commandLeaves) {
            if (!this.slashMap.has(route)) {
                this.logger.warn(
                    `Slash route ${paint.sky.bold(route)} has no registered ${chalk.bold('@SlashRoute')} handler.`
                );
            }
        }
    }

    public warnUnhandledContextMenuRoutes(leaves: ContextMenuLeaves): void {
        for (const name of leaves.user) {
            if (!this.userContextMenuMap.has(name)) {
                this.logger.warn(
                    `User context menu ${paint.sky.bold(name)} has no registered ${chalk.bold('@ContextMenuRoute')} handler.`
                );
            }
        }
        for (const name of leaves.message) {
            if (!this.messageContextMenuMap.has(name)) {
                this.logger.warn(
                    `Message context menu ${paint.sky.bold(name)} has no registered ${chalk.bold('@ContextMenuRoute')} handler.`
                );
            }
        }
    }

    private getArtifacts(handlerClass: HandlerConstructor): InteractionArtifact[] {
        const artifacts: InteractionArtifact[] = [];
        for (const [routeType] of this.routeTypes) {
            const meta: unknown = Reflect.getMetadata(InteractionRouteKeys[routeType], handlerClass);
            if (areRoutes(meta)) artifacts.push({ routeType, routes: meta });
        }
        return artifacts;
    }

    public async init(): Promise<void> {
        if (this.isInitialized) return;

        this.isInitialized = true;

        const handlersDir = this.core.config.bot.interactions.path;
        // the constructor already threw on this
        if (!handlersDir) return;

        const middlewareDir = hasKeys(this.core.config.bot.interactions, ['middlewares'])
            ? this.core.config.bot.interactions.middlewares
            : undefined;

        this.loading = true;
        this.loadedHandlers.length = 0;
        this.loadedMiddlewares.length = 0;
        try {
            if (middlewareDir) await this.loadMiddlewares(middlewareDir);
            await this.loadHandlers(handlersDir);
        } finally {
            this.loading = false;
        }

        this.attachToClient();
        this.reportLoad();
    }

    private reportLoad(): void {
        const { utils } = this.logger;

        utils.summary(
            'Loaded',
            { 'interaction handlers': this.loadedHandlers.length, middlewares: this.loadedMiddlewares.length },
            'debug'
        );

        if (this.loadedMiddlewares.length > 0) {
            utils.block('Loaded middlewares', utils.entries(this.loadedMiddlewares), 'debug');
        }

        utils.block(
            'Loaded interaction handlers',
            [
                ...utils.entries(this.loadedHandlers),
                ...utils.counts({
                    slash: this.slashMap.size,
                    buttons: this.buttonMap.size,
                    modals: this.modalMap.size,
                    'string selects': this.stringSelectMap.size,
                    'user selects': this.userSelectMap.size,
                    'role selects': this.roleSelectMap.size,
                    'channel selects': this.channelSelectMap.size,
                    'mentionable selects': this.mentionableSelectMap.size,
                    'message menus': this.messageContextMenuMap.size,
                    'user menus': this.userContextMenuMap.size,
                    autocomplete: this.autocompleteMap.size
                })
            ],
            'debug'
        );
    }

    private async loadHandlers(dir: string): Promise<void> {
        await traverseDirectory(dir, (fullPath, relativePath, imported) => {
            for (const val of Object.values(imported)) {
                if (!this.isHandlerClass(val)) continue;
                this.registerHandler(val, relativePath);
                this.hmrHandler?.trackHandler(fullPath, val);
            }
        });
    }

    private async loadMiddlewares(dir: string): Promise<void> {
        await traverseDirectory(dir, (fullPath, relativePath, imported) => {
            for (const val of Object.values(imported)) {
                if (!this.isMiddlewareClass(val)) continue;

                this.registerMiddleware(val, relativePath);
                this.hmrHandler?.trackMiddleware(fullPath, val);
            }
        });
    }

    private registerMiddleware(middlewareCtor: InteractionMiddlewareConstructor, relativePath: string): void {
        const metadata = Reflect.getMetadata(MiddlewareMetadataKey, middlewareCtor) as MiddlewareMetadata | undefined;
        if (metadata?.type !== MiddlewareType.Interaction) return;

        // same class re-registered (double import or an HMR re-scan) is idempotent, matching event middleware
        if (this.middlewares.some((entry) => entry.ctor === middlewareCtor)) return;

        if (this.middlewares.some((entry) => entry.ctor.name === middlewareCtor.name)) {
            throw new SeedcordError(SeedcordErrorCode.InteractionDuplicateMiddleware, [middlewareCtor.name]);
        }

        this.middlewares.push({ ctor: middlewareCtor, priority: metadata.priority });
        this.middlewares.sort((a, b) => a.priority - b.priority);

        if (this.loading) {
            this.loadedMiddlewares.push({
                name: `${middlewareCtor.name} (${metadata.priority})`,
                from: formatFilePath(relativePath)
            });
        }
    }

    private isHandlerClass(obj: unknown): obj is HandlerConstructor {
        if (typeof obj !== 'function') return false;
        return (
            (obj.prototype instanceof InteractionHandler && Reflect.hasMetadata(InteractionMetadataKey, obj)) ||
            (obj.prototype instanceof AutocompleteHandler && Reflect.hasMetadata(InteractionMetadataKey, obj))
        );
    }

    private isMiddlewareClass(obj: unknown): obj is InteractionMiddlewareConstructor {
        if (typeof obj !== 'function') return false;
        return obj.prototype instanceof InteractionMiddleware && Reflect.hasMetadata(MiddlewareMetadataKey, obj);
    }

    private registerHandler(handlerClass: HandlerConstructor, relativePath: string): void {
        const from = formatFilePath(relativePath);
        // a partial registration would orphan routes and break hmr rollback
        const writes: [Map<string, HandlerConstructor>, string][] = [];

        for (const [routeType, map] of this.routeTypes) {
            const meta: unknown = Reflect.getMetadata(InteractionRouteKeys[routeType], handlerClass);
            if (!areRoutes(meta)) continue;

            for (const route of meta) {
                const existing = map.get(route);
                // a different class on the same route would silently shadow (last write wins)
                if (existing && existing !== handlerClass) {
                    throw new SeedcordError(SeedcordErrorCode.InteractionDuplicateRoute, [
                        `${routeType}:${route}`,
                        // a stale hmr artifact list can leave a class in a route map after its entry here is gone
                        `${existing.name} (${this.handlerFiles.get(existing) ?? 'unknown file'})`,
                        `${handlerClass.name} (${from})`
                    ]);
                }
                writes.push([map, route]);
            }
        }

        if (writes.length === 0) return;
        for (const [map, route] of writes) map.set(route, handlerClass);
        this.handlerFiles.set(handlerClass, from);

        if (this.loading) this.loadedHandlers.push({ name: handlerClass.name, from });
    }

    public async onHmr(event: HmrUpdateEvent): Promise<void> {
        await this.hmrHandler?.handle(event);
    }

    private unregisterHandler(handlerClass: HandlerConstructor, artifacts?: InteractionArtifact[]): void {
        this.handlerFiles.delete(handlerClass);
        if (artifacts) {
            for (const { routeType, routes } of artifacts) {
                const map = this.routeTypes.find(([type]) => type === routeType)?.[1];
                if (map) {
                    routes.forEach((route) => map.delete(route));
                }
            }
            return;
        }

        for (const [routeType, map] of this.routeTypes) {
            const meta: unknown = Reflect.getMetadata(InteractionRouteKeys[routeType], handlerClass);
            if (!areRoutes(meta)) continue;

            const routes = meta;
            routes.forEach((route) => map.delete(route));
        }
    }

    private unregisterMiddleware(middlewareCtor: InteractionMiddlewareConstructor): void {
        const index = this.middlewares.findIndex((entry) => entry.ctor === middlewareCtor);
        if (index !== -1) {
            this.middlewares.splice(index, 1);
        }
    }

    private attachToClient(): void {
        this.core.bot.client.on(Events.InteractionCreate, (interaction) => {
            if (this.draining) return;
            this.core.bus[PublishDefault]('anyInteraction', { interaction });
            const run = this.handleInteraction(interaction).catch((caught: unknown) => {
                const error = asError(caught);
                this.logger.error(`[${paint.coral.bold('UNHANDLED ERROR AT ROOT')}] ${error.name}`, error.stack);
                this.core.bus[PublishDefault]('unhandledInteractionError', { error });
            });
            this.inFlight.add(run);
            void run.finally(() => this.inFlight.delete(run));
        });
    }

    public stopAccepting(): void {
        this.draining = true;
    }

    public drain(timeoutMs: number): Promise<void> {
        return settleWithin(Promise.allSettled(this.inFlight), timeoutMs);
    }

    private async handleCustomIdInteraction<TInteraction extends Interaction & { customId: string }>(
        interaction: TInteraction,
        kind: InteractionRoutes,
        getMap: () => Map<string, HandlerConstructor>
    ): Promise<void> {
        if ([...this.keysToIgnore].some((matcher) => matcher.owns(interaction.customId))) return;

        // route by the stable prefix (the routeKey minus its shape hash) so an older-shape wire still
        // reaches its handler, where reading this.params throws StaleCustomId and the boundary replies
        const prefix = prefixOf(interaction.customId);
        // no route matches an empty prefix. the unhandled default answers it like http does
        if (!prefix)
            this.logger.warn(`${paint.sky.bold(kind)} has invalid customId: ${paint.mute(interaction.customId)}`);

        await this.processInteraction(
            interaction,
            kind,
            () => prefix,
            (key) => getMap().get(key)
        );
    }

    private async processInteraction<TInteraction extends Interaction>(
        interaction: TInteraction,
        kind: InteractionRoutes,
        extractKey: (i: TInteraction) => string,
        getHandler: (key: string) => HandlerConstructor | undefined,
        fallback: HandlerConstructor = UnhandledRepliable
    ): Promise<void> {
        const key = extractKey(interaction);
        const startedAt = performance.now();
        // reading at publish time would count the handler run into the queue
        const queuedMs = queuedMsFor(interaction.id);
        const matched = getHandler(key);

        // an empty key means a customId seedcord never minted. a real routeKey outlives its 3-char hash
        let routeId = `${kind}:${key || 'unrouted'}`;
        // answering a refusal can throw into the catch and answer twice
        let reported = false;
        const report = (outcome: DispatchOutcome): void => {
            if (reported) return;
            reported = true;
            reportDispatch(this.core.bus, {
                routeId,
                interactionId: interaction.id,
                kind,
                outcome,
                startedAt,
                fallback: !matched,
                queuedMs
            });
        };

        // outside the try so the fault boundary keeps the handler's ack state
        let sender: ReplySender | undefined;
        try {
            if (!interaction.isAutocomplete()) await this.runMiddlewares(interaction as Repliables);

            const HandlerCtor = matched ?? fallback;
            const dispatch = new DispatchContext(routeIdOf(HandlerCtor) ?? routeId);
            routeId = dispatch.routeId ?? routeId;
            const handler = this.buildHandler(HandlerCtor, interaction as Repliables, dispatch, key, !matched);
            if (handler instanceof RepliableHandler) sender = handler.getSender();
            // @Gated rejects autocomplete at compile time, since it has no reply target. this is the backstop
            const refusal = interaction.isAutocomplete()
                ? null
                : await this.gateRefusal(HandlerCtor, interaction as Repliables, dispatch.routeId);
            if (refusal) {
                await this.answer(refusal.caught, interaction as ValidInteractionTypes, routeId, sender, report);
                return;
            }
            await handler.execute();
            report('handled');
        } catch (caught) {
            await this.answer(caught, interaction as ValidInteractionTypes, routeId, sender, report);
        }
    }

    private async answer(
        caught: unknown,
        interaction: ValidInteractionTypes,
        routeId: string,
        sender: ReplySender | undefined,
        report: (outcome: DispatchOutcome) => void
    ): Promise<void> {
        try {
            await handleInteractionFault(caught, interaction, this.core, routeId, sender);
        } finally {
            report(outcomeFor(caught));
        }
    }

    private buildHandler(
        HandlerCtor: HandlerConstructor,
        interaction: Repliables,
        dispatch: DispatchContext,
        key: string,
        isFallback: boolean
    ): DispatchedHandler {
        if (isFallback) {
            this.logger.warn(`No handler found for key ${paint.sky.bold(key)}. Falling back to ${HandlerCtor.name}.`);
        }
        this.logger.debug(`Processing ${paint.sky.bold(key)} with ${paint.mute(HandlerCtor.name)}`);
        // @ts-expect-error TS can't infer the type of interaction here
        return new HandlerCtor(interaction, this.core, dispatch);
    }

    private async runMiddlewares(interaction: Repliables): Promise<void> {
        for (const { ctor } of this.middlewares) {
            const middleware = new ctor(interaction, this.core);
            await middleware.execute();
        }
    }

    private async gateRefusal(
        HandlerCtor: HandlerConstructor,
        interaction: Repliables,
        routeId: string | null
    ): Promise<{ caught: unknown } | null> {
        const monitor = slowGateMonitor();
        try {
            await runHandlerGates(
                HandlerCtor,
                interactionGateContext(interaction, this.core),
                routeId ?? undefined,
                monitor?.observe
            );
            return null;
        } catch (caught) {
            return { caught };
        } finally {
            // a refusing gate spent budget too
            monitor?.report(routeId);
        }
    }

    private async handleInteraction(interaction: Interaction): Promise<void> {
        switch (true) {
            case interaction.isChatInputCommand(): {
                await this.handleSlashCommand(interaction);
                break;
            }
            case interaction.isButton(): {
                await this.handleButton(interaction);
                break;
            }
            case interaction.isModalSubmit(): {
                await this.handleModal(interaction);
                break;
            }
            case interaction.isStringSelectMenu(): {
                await this.handleStringSelectMenu(interaction);
                break;
            }
            case interaction.isUserSelectMenu(): {
                await this.handleUserSelectMenu(interaction);
                break;
            }
            case interaction.isRoleSelectMenu(): {
                await this.handleRoleSelectMenu(interaction);
                break;
            }
            case interaction.isChannelSelectMenu(): {
                await this.handleChannelSelectMenu(interaction);
                break;
            }
            case interaction.isMentionableSelectMenu(): {
                await this.handleMentionableSelectMenu(interaction);
                break;
            }
            case interaction.isMessageContextMenuCommand(): {
                await this.handleMessageContextMenu(interaction);
                break;
            }
            case interaction.isUserContextMenuCommand(): {
                await this.handleUserContextMenu(interaction);
                break;
            }
            case interaction.isAutocomplete(): {
                await this.handleAutocomplete(interaction);
                break;
            }
            default: {
                this.logger.warn(`Unhandled interaction type: ${interaction.type}`);
                break;
            }
        }
    }

    private async handleSlashCommand(interaction: ChatInputCommandInteraction): Promise<void> {
        const route = slashRouteOf(interaction);
        await this.processInteraction(
            interaction,
            InteractionRoutes.Slash,
            () => route,
            (key) => this.slashMap.get(key)
        );
    }

    private async handleButton(interaction: ButtonInteraction): Promise<void> {
        await this.handleCustomIdInteraction(interaction, InteractionRoutes.Button, () => this.buttonMap);
    }

    private async handleModal(interaction: ModalSubmitInteraction): Promise<void> {
        await this.handleCustomIdInteraction(interaction, InteractionRoutes.Modal, () => this.modalMap);
    }

    private async handleStringSelectMenu(interaction: StringSelectMenuInteraction): Promise<void> {
        await this.handleCustomIdInteraction(interaction, InteractionRoutes.StringMenu, () => this.stringSelectMap);
    }

    private async handleUserSelectMenu(interaction: UserSelectMenuInteraction): Promise<void> {
        await this.handleCustomIdInteraction(interaction, InteractionRoutes.UserMenu, () => this.userSelectMap);
    }

    private async handleRoleSelectMenu(interaction: RoleSelectMenuInteraction): Promise<void> {
        await this.handleCustomIdInteraction(interaction, InteractionRoutes.RoleMenu, () => this.roleSelectMap);
    }

    private async handleChannelSelectMenu(interaction: ChannelSelectMenuInteraction): Promise<void> {
        await this.handleCustomIdInteraction(interaction, InteractionRoutes.ChannelMenu, () => this.channelSelectMap);
    }

    private async handleMentionableSelectMenu(interaction: MentionableSelectMenuInteraction): Promise<void> {
        await this.handleCustomIdInteraction(
            interaction,
            InteractionRoutes.MentionableMenu,
            () => this.mentionableSelectMap
        );
    }

    private async handleMessageContextMenu(interaction: MessageContextMenuCommandInteraction): Promise<void> {
        await this.processInteraction(
            interaction,
            InteractionRoutes.MessageContextMenu,
            () => interaction.commandName,
            (key) => this.messageContextMenuMap.get(key)
        );
    }

    private async handleUserContextMenu(interaction: UserContextMenuCommandInteraction): Promise<void> {
        await this.processInteraction(
            interaction,
            InteractionRoutes.UserContextMenu,
            () => interaction.commandName,
            (key) => this.userContextMenuMap.get(key)
        );
    }

    private async handleAutocomplete(interaction: AutocompleteInteraction): Promise<void> {
        const route = slashRouteOf(interaction);
        await this.processInteraction(
            interaction,
            InteractionRoutes.Autocomplete,
            () => route,
            (key) => this.autocompleteMap.get(key),
            UnhandledAutocomplete
        );
    }
}
