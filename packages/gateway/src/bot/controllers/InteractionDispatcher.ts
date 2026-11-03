import { InteractionKind } from '@seedcord/core';
import { HmrModuleHandler } from '@seedcord/core/hmr';
import {
    componentKindOf,
    DispatchContext,
    InteractionRun,
    InteractionMetadataKey,
    interactionMiddleware,
    InteractionMiddlewareMetadataKey,
    matchRoute,
    MiddlewareRegistry,
    PublishDefault,
    RouteRegistry
} from '@seedcord/core/internal';
import { prefixOf } from '@seedcord/custom-id';
import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { Logger } from '@seedcord/logger';
import { formatFilePath, hasKeys, importFiles } from '@seedcord/utils';
import { asError } from '@seedcord/utils/internal';
import { Events } from 'discord.js';
import { Envapter } from 'envapt';

import { CONFIRM_DEF } from '#bot/confirm/reserved';
import { gatewayRunConfig } from '#bot/controllers/gatewayRunConfig';
import { UnhandledAutocomplete, UnhandledRepliable } from '#bot/defaults';
import { slashRouteOf } from '#bUtilities/miscellaneous/slashRouteOf';
import { AutocompleteHandler, InteractionMiddleware } from '#handlers/interaction';
import { InteractionHandler } from '#handlers/interaction/InteractionHandler';

import type { HandlerConstructor, InteractionMiddlewareConstructor } from '#handlers/constructors';
import type { Core } from '#interfaces/Core';
import type { ValidInteractionTypes } from '#src/handlers/interactionTypes';
import type { ContextMenuLeaves, Initializeable, RouteMaps } from '@seedcord/core/internal';
import type { InFlight } from '@seedcord/core/node/internal';
import type { CustomIdMatcher, HmrAware, HmrUpdateEvent } from '@seedcord/types';
import type { Interaction } from 'discord.js';

export class InteractionDispatcher implements Initializeable, HmrAware {
    private readonly logger = new Logger('Interactions', { channel: 'interactions' });
    private isInitialized = false;

    private readonly routes = new RouteRegistry<HandlerConstructor>();

    private get maps(): RouteMaps<HandlerConstructor> {
        return this.routes.maps;
    }

    private readonly keysToIgnore = new Set<CustomIdMatcher>();
    private readonly middlewares = new MiddlewareRegistry<InteractionMiddlewareConstructor>(interactionMiddleware);

    // a reload reports on the hmr channel
    private loading = false;
    private readonly loadedHandlers: { name: string; from: string }[] = [];
    private readonly loadedMiddlewares: { name: string; from: string }[] = [];

    private readonly hmrHandler?: HmrModuleHandler<HandlerConstructor, InteractionMiddlewareConstructor, string[]>;

    constructor(
        protected core: Core,
        private readonly inFlight: InFlight
    ) {
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
            unregisterHandler: this.routes.unregister.bind(this.routes),
            unregisterMiddleware: this.unregisterMiddleware.bind(this),
            getArtifacts: this.routes.routesOf.bind(this.routes),
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
        for await (const { fullPath, relativePath, imported } of importFiles(dir)) {
            for (const val of Object.values(imported)) {
                if (!this.isHandlerClass(val)) continue;
                this.registerHandler(val, relativePath);
                this.hmrHandler?.trackHandler(fullPath, val);
            }
        }
    }

    private async loadMiddlewares(dir: string): Promise<void> {
        for await (const { fullPath, relativePath, imported } of importFiles(dir)) {
            for (const val of Object.values(imported)) {
                if (!this.isMiddlewareClass(val)) continue;

                this.registerMiddleware(val, relativePath);
                this.hmrHandler?.trackMiddleware(fullPath, val);
            }
        }
    }

    private registerMiddleware(middlewareCtor: InteractionMiddlewareConstructor, relativePath: string): void {
        const metadata = this.middlewares.register(middlewareCtor);
        if (!metadata || !this.loading) return;

        // the kinds are the only place a dev sees that a middleware is scoped
        const scope = metadata.keys ? `${metadata.priority}, ${metadata.keys.join(', ')}` : metadata.priority;
        this.loadedMiddlewares.push({
            name: `${middlewareCtor.name} (${String(scope)})`,
            from: formatFilePath(relativePath)
        });
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
        if (!this.routes.register(handlerClass, from)) return;
        if (this.loading) this.loadedHandlers.push({ name: handlerClass.name, from });
    }

    public async onHmr(event: HmrUpdateEvent): Promise<void> {
        await this.hmrHandler?.handle(event);
    }

    private unregisterMiddleware(middlewareCtor: InteractionMiddlewareConstructor): void {
        this.middlewares.unregister(middlewareCtor);
    }

    private attachToClient(): void {
        this.core.bot.client.on(Events.InteractionCreate, (interaction) => {
            void this.inFlight.admit(() => {
                this.core.bus[PublishDefault]('anyInteraction', { interaction });
                return this.handleInteraction(interaction).catch((caught: unknown) => {
                    const error = asError(caught);
                    this.logger.error(`[${paint.coral.bold('UNHANDLED ERROR AT ROOT')}] ${error.name}`, error.stack);
                    this.core.bus[PublishDefault]('unhandledInteractionError', { error });
                });
            });
        });
    }

    private async handleCustomIdInteraction(
        interaction: Extract<ValidInteractionTypes, { customId: string }>,
        kind: InteractionKind
    ): Promise<void> {
        if ([...this.keysToIgnore].some((matcher) => matcher.owns(interaction.customId))) return;

        // the stable prefix (the routeKey minus its shape hash) routes an older-shape wire to its handler
        const prefix = prefixOf(interaction.customId);
        // no route matches an empty prefix. the unhandled default answers it
        if (!prefix)
            this.logger.warn(`${paint.sky.bold(kind)} has invalid customId: ${paint.mute(interaction.customId)}`);

        await this.processInteraction(interaction, kind, prefix);
    }

    private async processInteraction(
        interaction: ValidInteractionTypes,
        kind: InteractionKind,
        key: string
    ): Promise<void> {
        const { fallback, ctor: HandlerCtor } = matchRoute<HandlerConstructor>(this.maps, kind, key, {
            repliable: UnhandledRepliable,
            autocomplete: UnhandledAutocomplete
        });
        if (fallback) {
            this.logger.warn(`No handler found for key ${paint.sky.bold(key)}. Falling back to ${HandlerCtor.name}.`);
        }
        const config = gatewayRunConfig({
            interaction,
            core: this.core,
            dispatch: new DispatchContext(kind, key, fallback),
            HandlerCtor,
            middlewares: this.middlewares,
            logger: this.logger
        });
        const start = await new InteractionRun(config).prepare();
        await start?.();
    }

    private async handleInteraction(interaction: Interaction): Promise<void> {
        if (interaction.isChatInputCommand()) {
            await this.processInteraction(interaction, InteractionKind.Slash, slashRouteOf(interaction));
        } else if (interaction.isAutocomplete()) {
            await this.processInteraction(interaction, InteractionKind.Autocomplete, slashRouteOf(interaction));
        } else if (interaction.isModalSubmit()) {
            await this.handleCustomIdInteraction(interaction, InteractionKind.Modal);
        } else if (interaction.isButton() || interaction.isAnySelectMenu()) {
            const kind = componentKindOf(interaction.componentType);
            if (kind) await this.handleCustomIdInteraction(interaction, kind);
        } else if (interaction.isMessageContextMenuCommand()) {
            await this.processInteraction(interaction, InteractionKind.MessageContextMenu, interaction.commandName);
        } else if (interaction.isUserContextMenuCommand()) {
            await this.processInteraction(interaction, InteractionKind.UserContextMenu, interaction.commandName);
        } else {
            this.logger.warn(`Unhandled interaction type: ${interaction.type}`);
        }
    }
}
