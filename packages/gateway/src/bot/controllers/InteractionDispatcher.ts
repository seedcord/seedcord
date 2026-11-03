import { InteractionKind } from '@seedcord/core';
import {
    componentKindOf,
    DispatchContext,
    HandlerLoader,
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
import { hasKeys } from '@seedcord/utils';
import { asError } from '@seedcord/utils/internal';
import { Events } from 'discord.js';

import { CONFIRM_DEF } from '#bot/confirm/reserved';
import { gatewayRunConfig } from '#bot/controllers/gatewayRunConfig';
import { UnhandledAutocomplete, UnhandledRepliable } from '#bot/defaults/index';
import { slashRouteOf } from '#bUtilities/miscellaneous/slashRouteOf';
import { AutocompleteHandler, InteractionMiddleware } from '#handlers/interaction/index';
import { InteractionHandler } from '#handlers/interaction/InteractionHandler';

import type { HandlerConstructor, InteractionMiddlewareConstructor } from '#handlers/constructors';
import type { Core } from '#interfaces/Core';
import type { ValidInteractionTypes } from '#src/handlers/interactionTypes';
import type { MiddlewareKind } from '@seedcord/core';
import type { ContextMenuLeaves, Initializeable, RegisteredRoute, RouteMaps } from '@seedcord/core/internal';
import type { InFlight } from '@seedcord/core/node/internal';
import type { CustomIdMatcher, HmrAware, HmrUpdateEvent } from '@seedcord/types';
import type { Interaction } from 'discord.js';

const UNHANDLED: { repliable: HandlerConstructor; autocomplete: HandlerConstructor } = {
    repliable: UnhandledRepliable,
    autocomplete: UnhandledAutocomplete
};

export class InteractionDispatcher implements Initializeable, HmrAware {
    private readonly logger = new Logger('Interactions', { channel: 'interactions' });
    private isInitialized = false;

    private readonly routes = new RouteRegistry<HandlerConstructor>();

    private get maps(): RouteMaps<HandlerConstructor> {
        return this.routes.maps;
    }

    private readonly keysToIgnore = new Set<CustomIdMatcher>();
    private readonly middlewares = new MiddlewareRegistry<InteractionMiddlewareConstructor>(interactionMiddleware);

    private readonly loader: HandlerLoader<
        HandlerConstructor,
        InteractionMiddlewareConstructor,
        MiddlewareKind,
        RegisteredRoute<HandlerConstructor>[]
    >;

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

        this.loader = new HandlerLoader({
            handlersDir: interactionsDir,
            middlewaresDir: hasKeys(this.core.config.bot.interactions, ['middlewares'])
                ? this.core.config.bot.interactions.middlewares
                : undefined,
            middlewares: this.middlewares,
            logger: this.logger,
            isHandler: (value): value is HandlerConstructor => this.isHandlerClass(value),
            isMiddleware: (value): value is InteractionMiddlewareConstructor => this.isMiddlewareClass(value),
            storeHandler: (ctor, from) => this.routes.register(ctor, from),
            removeHandler: (ctor, routes) => this.routes.unregister(ctor, routes),
            artifactsOf: (ctor) => this.routes.routesOf(ctor)
        });
    }

    public warnUnhandledRoutes(commandLeaves: Iterable<string>): void {
        this.routes.warnUnhandledRoutes(this.logger, commandLeaves);
    }

    public warnUnhandledContextMenuRoutes(leaves: ContextMenuLeaves): void {
        this.routes.warnUnhandledContextMenuRoutes(this.logger, leaves);
    }

    public async init(): Promise<void> {
        if (this.isInitialized) return;

        this.isInitialized = true;

        await this.loader.load();
        this.attachToClient();
        this.reportLoad();
    }

    private reportLoad(): void {
        const { utils } = this.logger;
        const { loadedHandlers, loadedMiddlewares } = this.loader;

        utils.summary(
            'Loaded',
            { 'interaction handlers': loadedHandlers.length, middlewares: loadedMiddlewares.length },
            'debug'
        );

        if (loadedMiddlewares.length > 0) {
            utils.block('Loaded middlewares', utils.entries(loadedMiddlewares), 'debug');
        }

        utils.block(
            'Loaded interaction handlers',
            [
                ...utils.entries(loadedHandlers),
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

    public async onHmr(event: HmrUpdateEvent): Promise<void> {
        await this.loader.onHmr(event);
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
        await this.processInteraction(interaction, kind, prefixOf(interaction.customId));
    }

    private async processInteraction(
        interaction: ValidInteractionTypes,
        kind: InteractionKind,
        key: string
    ): Promise<void> {
        const { fallback, ctor: HandlerCtor } = matchRoute(this.maps, kind, key, UNHANDLED);
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
