import { InteractionKind } from '@seedcord/core';
import {
    HandlerLoader,
    InteractionRun,
    InteractionMetadataKey,
    interactionMiddleware,
    InteractionMiddlewareMetadataKey,
    matchRoute,
    MiddlewareRegistry,
    PublishDefault,
    RouteRegistry,
    unhandledSlots
} from '@seedcord/core/internal';
import { prefixOf } from '@seedcord/custom-id';
import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { Logger } from '@seedcord/logger';
import { HostPlugins } from '@seedcord/types/internal';
import { hasKeys } from '@seedcord/utils';
import { asError } from '@seedcord/utils/internal';
import { Events } from 'discord.js';

import { CONFIRM_DEF } from '#bot/confirm/reserved';
import { autocompleteRunConfig, repliableRunConfig } from '#bot/controllers/gatewayRunConfig';
import { UnhandledAutocomplete, UnhandledRepliable } from '#bot/defaults';
import { slashRouteOf } from '#bUtilities/miscellaneous/slashRouteOf';
import { AutocompleteHandler, InteractionMiddleware } from '#handlers/interaction';
import { InteractionHandler } from '#handlers/interaction/InteractionHandler';

import type {
    HandlerConstructor,
    HandlerSlots,
    InteractionMiddlewareConstructor,
    ResolvedInteraction
} from '#handlers/constructors';
import type { Payloads } from '#handlers/interaction/middlewareKinds';
import type { Core } from '#interfaces/Core';
import type { MiddlewareKind } from '@seedcord/core';
import type { ContextMenuLeaves, Initializeable, RouteMaps } from '@seedcord/core/internal';
import type { InFlight } from '@seedcord/core/node/internal';
import type { CustomIdMatcher, HmrAware, HmrUpdateEvent } from '@seedcord/types';
import type { Interaction } from 'discord.js';

const UNHANDLED: HandlerSlots = unhandledSlots(UnhandledRepliable, UnhandledAutocomplete);

export class InteractionDispatcher implements Initializeable, HmrAware {
    private readonly logger = new Logger('Interactions', { channel: 'interactions' });
    private isInitialized = false;

    private readonly routes = new RouteRegistry<HandlerSlots>();

    private get maps(): RouteMaps<HandlerSlots> {
        return this.routes.maps;
    }

    private readonly keysToIgnore = new Set<CustomIdMatcher>();
    private readonly middlewares = new MiddlewareRegistry<InteractionMiddlewareConstructor>(interactionMiddleware);

    private readonly loader: HandlerLoader<HandlerConstructor, InteractionMiddlewareConstructor, MiddlewareKind>;

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

        // the global router would double-ack these clicks because the in-process getConfirmation() collector consumes them
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
            plugins: this.core[HostPlugins],
            logger: this.logger,
            isHandler: (value): value is HandlerConstructor => this.isHandlerClass(value),
            isMiddleware: (value): value is InteractionMiddlewareConstructor => this.isMiddlewareClass(value),
            storeHandler: (ctor, from) => this.routes.register(ctor, from),
            removeHandler: (ctor) => this.routes.unregister(ctor)
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

    private async handleInteraction(interaction: Interaction): Promise<void> {
        const resolved = this.resolvedOf(interaction);
        if (!resolved) {
            this.logger.warn(`Unhandled interaction type: ${interaction.type}`);
            return;
        }
        const { event } = resolved;
        if ('customId' in event && [...this.keysToIgnore].some((matcher) => matcher.owns(event.customId))) return;
        await this.run(resolved);
    }

    // each branch narrows the interaction to the type its kind's handlers take
    private resolvedOf(interaction: Interaction): ResolvedInteraction | null {
        if (interaction.isChatInputCommand()) {
            return this.resolve(InteractionKind.Slash, slashRouteOf(interaction), interaction);
        }
        if (interaction.isAutocomplete()) {
            return this.resolve(InteractionKind.Autocomplete, slashRouteOf(interaction), interaction);
        }
        // the stable prefix (the routeKey minus its shape hash) routes an older-shape wire to its handler
        if (interaction.isModalSubmit()) {
            return this.resolve(InteractionKind.Modal, prefixOf(interaction.customId), interaction);
        }
        if (interaction.isButton()) {
            return this.resolve(InteractionKind.Button, prefixOf(interaction.customId), interaction);
        }
        if (interaction.isStringSelectMenu()) {
            return this.resolve(InteractionKind.StringMenu, prefixOf(interaction.customId), interaction);
        }
        if (interaction.isUserSelectMenu()) {
            return this.resolve(InteractionKind.UserMenu, prefixOf(interaction.customId), interaction);
        }
        if (interaction.isRoleSelectMenu()) {
            return this.resolve(InteractionKind.RoleMenu, prefixOf(interaction.customId), interaction);
        }
        if (interaction.isChannelSelectMenu()) {
            return this.resolve(InteractionKind.ChannelMenu, prefixOf(interaction.customId), interaction);
        }
        if (interaction.isMentionableSelectMenu()) {
            return this.resolve(InteractionKind.MentionableMenu, prefixOf(interaction.customId), interaction);
        }
        if (interaction.isMessageContextMenuCommand()) {
            return this.resolve(InteractionKind.MessageContextMenu, interaction.commandName, interaction);
        }
        if (interaction.isUserContextMenuCommand()) {
            return this.resolve(InteractionKind.UserContextMenu, interaction.commandName, interaction);
        }
        return null;
    }

    private resolve<Kind extends InteractionKind>(
        kind: Kind,
        key: string,
        event: Payloads[Kind]
    ): ResolvedInteraction<Kind> {
        return { ...matchRoute(this.maps, kind, key, UNHANDLED), event };
    }

    private async run(resolved: ResolvedInteraction): Promise<void> {
        const { core, logger } = this;
        const config =
            resolved.kind === InteractionKind.Autocomplete
                ? autocompleteRunConfig({ resolved, core, logger })
                : repliableRunConfig({ resolved, core, logger, middlewares: this.middlewares.chainFor(resolved.kind) });
        const start = await new InteractionRun(config).prepare();
        await start?.();
    }
}
