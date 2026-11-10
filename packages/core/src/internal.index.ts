export { busLoggerOf } from '#subscribers/Bus';
export { SubscriberLoader } from '#subscribers/SubscriberLoader';
export {
    AutocompleteRouteBrand,
    ComponentDefsBrand,
    ComponentKindBrand,
    ContextMenuKindBrand,
    ContextMenuNamesBrand,
    MiddlewareKindsBrand,
    SlashRouteBrand
} from '#decorators/brands';
export { interactionMiddlewareMetaOf } from '#decorators/middleware';
export type { InteractionMiddlewareMetadata } from '#decorators/middleware';
export { interactionMiddleware, MiddlewareRegistry } from '#src/dispatch/MiddlewareRegistry';
export type { MiddlewareRegistration, MiddlewareRegistrationOf } from '#src/dispatch/MiddlewareRegistry';
export { bindBotColor } from '#components/botColorHolder';
export { FaultBoundary, type FaultDetails } from '#src/notices/FaultBoundary';

export { FixedScope } from '#src/plugin/Plugin';
export type { PluginArgs, PluginCtor } from '#src/plugin/Plugin';
export type { Runtime, Transport } from '#src/plugin/options';
export { sealAttachments } from '#src/plugin/PluginHost';
export { PluginRegistry } from '#src/plugin/PluginRegistry';
export { splitPluginKey } from '#src/plugin/splitPluginKey';
export { CoordinatedStartup, type StartupTasks } from '#src/lifecycle/CoordinatedStartup';
export { PluginLifecycle } from '#src/lifecycle/PluginLifecycle';
export { settleWithin } from '#src/lifecycle/withTimeout';

export type { CommandMeta } from '#decorators/Command';
export {
    contextMenuRouteOf,
    interactionRoutesOf,
    storeComponentRoute,
    storeInteractionRoute,
    type RoutableConstructor
} from '#decorators/interactionRoutes';

export { runHandlerGates } from '#gates/runGates';
export { accessorStore, clearStore, guardedAccessor } from '#src/miscellaneous/guarded';
export { isEmojiTuple } from '#src/miscellaneous/emojiConfig';
export { lazyLogger } from '#src/miscellaneous/lazyLogger';
export { currentApplication } from '#src/miscellaneous/currentApplication';
export { readBotToken } from '#src/miscellaneous/readBotToken';
export { bindEnv } from '#src/miscellaneous/bindViteEnv';
export { resolveEmojis } from '#src/miscellaneous/resolveEmojis';

export { BAKED_IDS_KEY, type BakedIds } from '#src/bakedIds';
export { installLinks, warnLinks } from '#src/commands/CommandInjector';
export { COMMAND_DEPLOY_TIMEOUT_MS, CommandRegistry } from '#src/commands/CommandRegistry';
export { resolveDeployTarget } from '#src/commands/deployTarget';
export { putCommands, type CommandBody, type CommandScopes } from '#src/commands/putCommands';
export { readCommands, readCommandsAt } from '#src/commands/readCommands';
export { planDeploy } from '#src/commands/planDeploy';
export { guildSummaries, type GuildSummary } from '#src/commands/guildSummaries';
export { commandsRoute, GLOBAL_ID, globalFirst, scopeIdsOf, skippedNote, type ScopeId } from '#src/commands/scopes';
export {
    commandKey,
    commandRefOf,
    indexById,
    linkCommands,
    type CommandRef,
    type LinkedCommands
} from '#src/commands/linkCommands';
export { contextMenuLeaves } from '#src/commands/contextMenuLeaves';
export type { ContextMenuLeaves } from '#src/commands/contextMenuLeaves';
export { isCommandClass, type CommandCtor } from '#src/commands/isCommandClass';
export type { CommandBuilder, DeployResult } from '#src/commands/types';

export type { GateFitsWith } from '#gates/matching';
export { assertUniqueKeys } from '#src/decorators/assertUniqueKeys';
export { runCase, type CaseReturn, type MatchResult, type OnlyCases } from '#src/handlers/runCase';
export type { MiddlewareRoute } from '#src/handlers/MiddlewareRoute';

export { getDevChannel, setDevChannel } from '#hmr/devChannel';
export { connectDevChannel, HmrManager } from '#hmr/HmrManager';
export { wrapHot } from '#hmr/wrapHot';
export { fromDevLogLine, fromWireError, toWireError } from '#hmr/wire';
export { forwardLogsToCli } from '#hmr/forwardLogsToCli';

export { MissingRole, NeedsAny, NotAllowed, NotInDm, NotInGuild, NotOwner, OnCooldown } from '#notices/index';

export {
    CommandMetadataKey,
    EventMetadataKey,
    EventMiddlewareMetadataKey,
    GatedMetadataKey,
    InteractionMetadataKey,
    InteractionMiddlewareMetadataKey,
    InteractionRouteKeys,
    SubscribeMetadataKey,
    WebhookUrlMetadataKey
} from '#src/metadataKeys';

export { NoticeCard } from '#stops/NoticeCard';

export {
    ComponentDefsKey,
    decodeComponentRoute,
    type DecodedComponentRoute,
    type HasComponentDefs,
    type MatchCases,
    type SingleParams
} from '#customId/routing';

export type { MenuCacheFor, NamesFor } from '#registries/ContextMenuRegistry';
export type { CacheFor, OptionKind, RouteCache, SlashOption, SlashRouteEntry } from '#registries/SlashRegistry';

export type { OptionLens } from '#inputs/OptionLens';
export type { SlashOptions } from '#inputs/SlashOptions';
export type { AutocompletableNames, ChoiceValueOf, EntryFor, FocusedField } from '#inputs/AutocompleteOptions';

export { PAGE_MAX, pageCursor, type PageCursor } from '#pagination/cursor';

export { deferFlags, sendFlags } from '#reply/flags';
export { checkAckLegality, sendTarget, type AckState, type ReplyMethod } from '#reply/ackLegality';
export { AckTrace } from '#reply/AckTrace';
export { AutocompleteResponder } from '#reply/AutocompleteResponder';
export { reportedWrite, type ReplyTelemetry } from '#reply/responseReport';
export { translateSerializationError } from '#reply/translateSerialization';
export { serializeReply, type SerializedReply } from '#reply/serializeReply';

export { type StoredSubscriberCtor } from '#subscribers/Bus';
export { ReportThrottle } from '#subscribers/ReportThrottle';
export { PublishDefault } from '#subscribers/publishDefault';
export {
    OnRun,
    RegisterDefaults,
    RegisteredCount,
    RegisterSubscriber,
    UnregisterSubscriber,
    VerifyWebhooks
} from '#subscribers/slots';
export { DispatchContext, type InteractionDispatch } from '#src/dispatch/DispatchContext';
export { InteractionRun, type InteractionRunConfig } from '#src/dispatch/InteractionRun';
export { HandlerLoader } from '#src/dispatch/HandlerLoader';
export {
    emptyRouteMaps,
    matchRoute,
    RouteRegistry,
    unhandledSlots,
    type RegisteredRoute,
    type ResolvedRoute,
    type RouteMaps
} from '#src/dispatch/RouteRegistry';
export { eventResultFor, resultFor, runAfter } from '#src/dispatch/runAfter';
export { OnceTracker } from '#src/dispatch/OnceTracker';
// each transport declaration-merges its own default keys into this
export type { DefaultSubscriptions } from '#subscribers/types/Subscriptions';
export { interactionFaultSource } from '#subscribers/interactionFaultSource';
export type { Initializeable } from '#src/plugin/Plugin';
