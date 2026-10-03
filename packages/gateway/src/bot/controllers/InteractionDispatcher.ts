/* eslint-disable max-lines -- one handler method per interaction type keeps the router in one file */
import { DispatchContext, InteractionKind } from '@seedcord/core';
import { HmrModuleHandler } from '@seedcord/core/hmr';
import {
    InteractionMetadataKey,
    interactionRoutesOf,
    asError,
    outcomeFor,
    queuedMsFor,
    reportDispatch,
    interactionMiddleware,
    InteractionMiddlewareMetadataKey,
    MiddlewareRegistry,
    PublishDefault,
    resultFor,
    runAfter,
    runHandlerGates,
    slowGateMonitor
} from '@seedcord/core/internal';
import { drainInFlight } from '@seedcord/core/node/internal';
import { prefixOf } from '@seedcord/custom-id';
import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { Logger } from '@seedcord/logger';
import { formatFilePath, hasKeys } from '@seedcord/utils';
import { traverseDirectory } from '@seedcord/utils/node';
import { Events } from 'discord.js';
import { Envapter } from 'envapt';

import { CONFIRM_DEF } from '#bot/confirm/reserved';
import { UnhandledAutocomplete, UnhandledRepliable } from '#bot/defaults';
import { interactionGateContext } from '#bot/gates/runGates';
import { handleInteractionFault } from '#bot/handleInteractionFault';
import { slashRouteOf } from '#bUtilities/miscellaneous/slashRouteOf';
import { AutocompleteHandler, InteractionMiddleware } from '#handlers/interaction';
import { InteractionHandler } from '#handlers/interaction/InteractionHandler';
import { RepliableHandler } from '#handlers/RepliableHandler';

import type { ReplySender } from '#bot/ReplySender';
import type {
    ConstructableHandler,
    HandlerConstructor,
    InteractionMiddlewareConstructor
} from '#handlers/constructors';
import type { InteractionOf } from '#handlers/interaction/middlewareKinds';
import type { Core } from '#interfaces/Core';
import type { Repliables, ValidInteractionTypes } from '#src/handlers/interactionTypes';
import type { DispatchOutcome, DispatchResult, MiddlewareKind } from '@seedcord/core';
import type { Initializeable, ContextMenuLeaves } from '@seedcord/core/internal';
import type { CustomIdMatcher, HmrAware, HmrUpdateEvent } from '@seedcord/types';
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
    routeType: InteractionKind;
    routes: string[];
}

interface DispatchedHandler {
    execute(): Promise<void>;
}

interface DispatchReportRow {
    readonly interaction: Interaction;
    readonly kind: InteractionKind;
    readonly fallback: boolean;
    readonly startedAt: number;
    readonly queuedMs: number;
    readonly dispatchId: string;
    readonly routeId: string;
}

interface BeforeHandler {
    readonly HandlerCtor: HandlerConstructor;
    readonly kind: InteractionKind;
    readonly interaction: Interaction;
    readonly dispatch: DispatchContext;
    readonly sender: ReplySender | undefined;
    readonly ran: InteractionMiddleware[];
    readonly declaredRoute: string | undefined;
}

export class InteractionDispatcher implements Initializeable, HmrAware {
    private readonly logger = new Logger('Interactions', { channel: 'interactions' });
    private isInitialized = false;

    private readonly maps: Record<InteractionKind, Map<string, HandlerConstructor>> = {
        [InteractionKind.Slash]: new Map(),
        [InteractionKind.Button]: new Map(),
        [InteractionKind.Modal]: new Map(),
        [InteractionKind.StringMenu]: new Map(),
        [InteractionKind.UserMenu]: new Map(),
        [InteractionKind.RoleMenu]: new Map(),
        [InteractionKind.ChannelMenu]: new Map(),
        [InteractionKind.MentionableMenu]: new Map(),
        [InteractionKind.MessageContextMenu]: new Map(),
        [InteractionKind.UserContextMenu]: new Map(),
        [InteractionKind.Autocomplete]: new Map()
    };

    private readonly handlerFiles = new Map<HandlerConstructor, string>();

    private readonly keysToIgnore = new Set<CustomIdMatcher>();
    private readonly middlewares = new MiddlewareRegistry<InteractionMiddlewareConstructor>(interactionMiddleware);

    private readonly inFlight = new Set<Promise<void>>();
    private draining = false;

    // a reload reports on the hmr channel
    private loading = false;
    private readonly loadedHandlers: { name: string; from: string }[] = [];
    private readonly loadedMiddlewares: { name: string; from: string }[] = [];

    private readonly hmrHandler?: HmrModuleHandler<
        HandlerConstructor,
        InteractionMiddlewareConstructor,
        InteractionArtifact[]
    >;

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
            if (!this.maps[InteractionKind.Slash].has(route)) {
                this.logger.warn(
                    `Slash route ${paint.sky.bold(route)} has no registered ${paint.bold('@SlashRoute')} handler.`
                );
            }
        }
    }

    public warnUnhandledContextMenuRoutes(leaves: ContextMenuLeaves): void {
        for (const name of leaves.user) {
            if (!this.maps[InteractionKind.UserContextMenu].has(name)) {
                this.logger.warn(
                    `User context menu ${paint.sky.bold(name)} has no registered ${paint.bold('@ContextMenuRoute')} handler.`
                );
            }
        }
        for (const name of leaves.message) {
            if (!this.maps[InteractionKind.MessageContextMenu].has(name)) {
                this.logger.warn(
                    `Message context menu ${paint.sky.bold(name)} has no registered ${paint.bold('@ContextMenuRoute')} handler.`
                );
            }
        }
    }

    private getArtifacts(handlerClass: HandlerConstructor): InteractionArtifact[] {
        return interactionRoutesOf(handlerClass).map(([routeType, routes]) => ({ routeType, routes }));
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
                    slash: this.maps[InteractionKind.Slash].size,
                    buttons: this.maps[InteractionKind.Button].size,
                    modals: this.maps[InteractionKind.Modal].size,
                    'string selects': this.maps[InteractionKind.StringMenu].size,
                    'user selects': this.maps[InteractionKind.UserMenu].size,
                    'role selects': this.maps[InteractionKind.RoleMenu].size,
                    'channel selects': this.maps[InteractionKind.ChannelMenu].size,
                    'mentionable selects': this.maps[InteractionKind.MentionableMenu].size,
                    'message menus': this.maps[InteractionKind.MessageContextMenu].size,
                    'user menus': this.maps[InteractionKind.UserContextMenu].size,
                    autocomplete: this.maps[InteractionKind.Autocomplete].size
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
        const metadata = this.middlewares.register(middlewareCtor);
        if (!metadata) return;

        if (this.loading) {
            // the kinds are the only place a dev sees that a middleware is scoped
            const scope = metadata.keys ? `${metadata.priority}, ${metadata.keys.join(', ')}` : metadata.priority;
            this.loadedMiddlewares.push({
                name: `${middlewareCtor.name} (${String(scope)})`,
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
        return (
            obj.prototype instanceof InteractionMiddleware && Reflect.hasMetadata(InteractionMiddlewareMetadataKey, obj)
        );
    }

    private registerHandler(handlerClass: HandlerConstructor, relativePath: string): void {
        const from = formatFilePath(relativePath);
        // a partial registration would orphan routes and break hmr rollback
        const writes: { kind: InteractionKind; route: string }[] = [];

        for (const [kind, routes] of interactionRoutesOf(handlerClass)) {
            for (const route of routes) {
                const existing = this.maps[kind].get(route);
                // a different class on the same route would silently shadow (last write wins)
                if (existing && existing !== handlerClass) {
                    throw new SeedcordError(SeedcordErrorCode.InteractionDuplicateRoute, [
                        `${kind}:${route}`,
                        // a stale hmr artifact list can leave a class in a route map after its entry here is gone
                        `${existing.name} (${this.handlerFiles.get(existing) ?? 'unknown file'})`,
                        `${handlerClass.name} (${from})`
                    ]);
                }
                writes.push({ kind, route });
            }
        }

        if (writes.length === 0) return;
        for (const { kind, route } of writes) this.maps[kind].set(route, handlerClass);
        this.handlerFiles.set(handlerClass, from);

        if (this.loading) this.loadedHandlers.push({ name: handlerClass.name, from });
    }

    public async onHmr(event: HmrUpdateEvent): Promise<void> {
        await this.hmrHandler?.handle(event);
    }

    private unregisterHandler(handlerClass: HandlerConstructor, artifacts?: InteractionArtifact[]): void {
        this.handlerFiles.delete(handlerClass);
        for (const { routeType, routes } of artifacts ?? this.getArtifacts(handlerClass)) {
            for (const route of routes) this.maps[routeType].delete(route);
        }
    }

    private unregisterMiddleware(middlewareCtor: InteractionMiddlewareConstructor): void {
        this.middlewares.unregister(middlewareCtor);
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
        return drainInFlight(this.inFlight, timeoutMs, this.logger, 'Interactions');
    }

    private async handleCustomIdInteraction<TInteraction extends Interaction & { customId: string }>(
        interaction: TInteraction,
        kind: InteractionKind
    ): Promise<void> {
        if ([...this.keysToIgnore].some((matcher) => matcher.owns(interaction.customId))) return;

        // the stable prefix (the routeKey minus its shape hash) routes an older-shape wire to its handler
        const prefix = prefixOf(interaction.customId);
        // no route matches an empty prefix. the unhandled default answers it like http does
        if (!prefix)
            this.logger.warn(`${paint.sky.bold(kind)} has invalid customId: ${paint.mute(interaction.customId)}`);

        await this.processInteraction(interaction, kind, () => prefix);
    }

    private async processInteraction<TInteraction extends Interaction>(
        interaction: TInteraction,
        kind: InteractionKind,
        extractKey: (i: TInteraction) => string,
        fallback: HandlerConstructor = UnhandledRepliable
    ): Promise<void> {
        const key = extractKey(interaction);
        const startedAt = performance.now();
        const queuedMs = queuedMsFor(interaction.id);
        const matched = this.maps[kind].get(key);

        const HandlerCtor = matched ?? fallback;
        // an empty key means a customId seedcord never minted
        const dispatch = new DispatchContext(`${kind}:${key || 'unrouted'}`);
        const report = this.reporterFor({
            interaction,
            kind,
            fallback: !matched,
            startedAt,
            queuedMs,
            dispatchId: dispatch.id,
            routeId: dispatch.routeId
        });

        // outside the try so the fault boundary keeps the handler's ack state
        let sender: ReplySender | undefined;
        const ran: InteractionMiddleware[] = [];
        let result: DispatchResult = { outcome: 'handled' };
        try {
            const handler = this.buildHandler(HandlerCtor, interaction as Repliables, dispatch, key, !matched);
            if (handler instanceof RepliableHandler) sender = handler.sender;

            const refusal = await this.refusalBeforeHandler({
                HandlerCtor,
                kind,
                interaction,
                dispatch,
                sender,
                ran,
                declaredRoute: matched ? dispatch.routeId : undefined
            });
            if (refusal) {
                result = resultFor(refusal.caught);
                await this.answer(refusal.caught, interaction as ValidInteractionTypes, dispatch, sender, report);
                return;
            }
            await handler.execute();
            report('handled');
        } catch (caught) {
            // a refusal already labelled the dispatch. a throw from answering it must not relabel.
            if (result.outcome === 'handled') result = resultFor(caught);
            await this.answer(caught, interaction as ValidInteractionTypes, dispatch, sender, report);
        } finally {
            await runAfter(ran, result, this.logger);
        }
    }

    private async answer(
        caught: unknown,
        interaction: ValidInteractionTypes,
        dispatch: DispatchContext,
        sender: ReplySender | undefined,
        report: (outcome: DispatchOutcome) => void
    ): Promise<void> {
        try {
            await handleInteractionFault(caught, interaction, this.core, dispatch, sender);
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
        // in a union of both handler bases, the event parameter is never. the maps pair each kind with its class.
        return new (HandlerCtor as ConstructableHandler)(interaction as never, this.core, dispatch);
    }

    // answering a refusal can throw into the catch and report twice
    private reporterFor(row: DispatchReportRow): (outcome: DispatchOutcome) => void {
        let reported = false;
        return (outcome) => {
            if (reported) return;
            reported = true;
            reportDispatch(this.core.bus, {
                dispatchId: row.dispatchId,
                routeId: row.routeId,
                interactionId: row.interaction.id,
                kind: row.kind,
                outcome,
                startedAt: row.startedAt,
                fallback: row.fallback,
                userId: row.interaction.user.id,
                guildId: row.interaction.guildId,
                queuedMs: row.queuedMs
            });
        };
    }

    // a returned value is the throw that stops the dispatch before the handler runs
    private async refusalBeforeHandler(step: BeforeHandler): Promise<{ caught: unknown } | null> {
        const { HandlerCtor, kind, interaction, dispatch, sender, ran, declaredRoute } = step;

        if (kind !== InteractionKind.Autocomplete && sender) {
            try {
                await this.runMiddlewares(kind, interaction as Repliables, dispatch, sender, ran);
            } catch (caught) {
                return { caught };
            }
        }

        // @Gated rejects autocomplete at compile time, since it has no reply target. this is the backstop
        if (interaction.isAutocomplete()) return null;
        return this.gateRefusal(HandlerCtor, interaction as Repliables, dispatch, declaredRoute);
    }

    private async runMiddlewares(
        kind: MiddlewareKind,
        interaction: Repliables,
        dispatch: DispatchContext,
        sender: ReplySender,
        ran: InteractionMiddleware[]
    ): Promise<void> {
        for (const Middleware of this.middlewares.chainFor(kind)) {
            // chainFor picked this kind. the interaction is the one the class declares.
            const event = interaction as InteractionOf<MiddlewareKind>;
            const middleware = new Middleware(event, this.core, dispatch, sender);
            // pushed before the await because a middleware that throws still gets its after()
            ran.push(middleware);
            await middleware.execute();
        }
    }

    private async gateRefusal(
        HandlerCtor: HandlerConstructor,
        interaction: Repliables,
        dispatch: DispatchContext,
        declaredRoute: string | undefined
    ): Promise<{ caught: unknown } | null> {
        const monitor = slowGateMonitor();
        try {
            await runHandlerGates(
                HandlerCtor,
                interactionGateContext(interaction, this.core, dispatch),
                declaredRoute,
                monitor?.observe
            );
            return null;
        } catch (caught) {
            return { caught };
        } finally {
            // a refusing gate spent budget too
            monitor?.report(declaredRoute ?? null);
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
        await this.processInteraction(interaction, InteractionKind.Slash, () => route);
    }

    private async handleButton(interaction: ButtonInteraction): Promise<void> {
        await this.handleCustomIdInteraction(interaction, InteractionKind.Button);
    }

    private async handleModal(interaction: ModalSubmitInteraction): Promise<void> {
        await this.handleCustomIdInteraction(interaction, InteractionKind.Modal);
    }

    private async handleStringSelectMenu(interaction: StringSelectMenuInteraction): Promise<void> {
        await this.handleCustomIdInteraction(interaction, InteractionKind.StringMenu);
    }

    private async handleUserSelectMenu(interaction: UserSelectMenuInteraction): Promise<void> {
        await this.handleCustomIdInteraction(interaction, InteractionKind.UserMenu);
    }

    private async handleRoleSelectMenu(interaction: RoleSelectMenuInteraction): Promise<void> {
        await this.handleCustomIdInteraction(interaction, InteractionKind.RoleMenu);
    }

    private async handleChannelSelectMenu(interaction: ChannelSelectMenuInteraction): Promise<void> {
        await this.handleCustomIdInteraction(interaction, InteractionKind.ChannelMenu);
    }

    private async handleMentionableSelectMenu(interaction: MentionableSelectMenuInteraction): Promise<void> {
        await this.handleCustomIdInteraction(interaction, InteractionKind.MentionableMenu);
    }

    private async handleMessageContextMenu(interaction: MessageContextMenuCommandInteraction): Promise<void> {
        await this.processInteraction(interaction, InteractionKind.MessageContextMenu, () => interaction.commandName);
    }

    private async handleUserContextMenu(interaction: UserContextMenuCommandInteraction): Promise<void> {
        await this.processInteraction(interaction, InteractionKind.UserContextMenu, () => interaction.commandName);
    }

    private async handleAutocomplete(interaction: AutocompleteInteraction): Promise<void> {
        const route = slashRouteOf(interaction);
        await this.processInteraction(interaction, InteractionKind.Autocomplete, () => route, UnhandledAutocomplete);
    }
}
