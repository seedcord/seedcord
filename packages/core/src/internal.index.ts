export { busLoggerOf } from '#subscribers/Bus';
export {
    AutocompleteRouteBrand,
    ComponentDefsBrand,
    ComponentKindBrand,
    ContextMenuKindBrand,
    ContextMenuNamesBrand,
    SlashRouteBrand
} from '#decorators/brands';
export { setBotColor } from '#components/botColorHolder';

export type { PluginArgs, PluginCtor } from '#src/plugin/Plugin';

export type { CommandMeta } from '#decorators/Command';
export {
    areRoutes,
    contextMenuRouteOf,
    interactionRoutesOf,
    selectMenuRouteOf,
    storeComponentRoute,
    storeInteractionRoute,
    type RoutableConstructor
} from '#decorators/interactionRoutes';

export { routeIdOf, runGates, runHandlerGates } from '#gates/runGates';
export { slowGateMonitor, type SlowGateMonitor } from '#gates/slowGate';
export type { GateObserver } from '#gates/runGates';
export { accessorStore, clearStore, guardedAccessor } from '#src/miscellaneous/guarded';
export { isEmojiTuple } from '#src/miscellaneous/emojiConfig';

export { contextMenuLeaves } from '#src/commands/contextMenuLeaves';
export type { ContextMenuLeaves } from '#src/commands/contextMenuLeaves';
export { isCommandClass, type CommandCtor } from '#src/commands/isCommandClass';
export { slashRouteLeaves } from '#src/commands/slashRouteLeaves';
export type { CommandBuilder, DeployResult } from '#src/commands/types';

export { pickNotice } from '#gates/catalog/options';
export { PermissionNames } from '#gates/catalog/permissions';
export type { GateFitsWith } from '#gates/matching';

export { getDevChannel, setDevChannel } from '#hmr/devChannel';
export { HmrManager } from '#hmr/HmrManager';
export { wrapHot } from '#hmr/wrapHot';

export {
    GateNotice,
    HasDangerousPermissions,
    MissingPermissions,
    MissingRole,
    NeedsAny,
    NotAllowed,
    NotInDm,
    NotInGuild,
    NotOwner,
    OnCooldown
} from '#notices/index';

export {
    CommandMetadataKey,
    EventMetadataKey,
    GatedMetadataKey,
    InteractionMetadataKey,
    InteractionRouteKeys,
    InteractionRoutes,
    MiddlewareMetadataKey,
    SubscribeMetadataKey,
    WebhookUrlMetadataKey
} from '#src/metadataKeys';

export { asError } from '#stops/asError';
export { NoticeCard } from '#stops/NoticeCard';

export {
    ComponentDefsKey,
    decodeComponentRoute,
    type DecodedComponentRoute,
    type HasComponentDefs,
    type MatchArms,
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
export { reportedWrite, type ReplyTelemetry } from '#reply/responseReport';
export { translateSerializationError } from '#reply/translateSerialization';
export { serializeReply, type SerializedReply } from '#reply/serializeReply';

export { type StoredSubscriberCtor, type SubscriberRegistration } from '#subscribers/Bus';
export { ReportThrottle } from '#subscribers/ReportThrottle';
export { PublishDefault } from '#subscribers/publishDefault';
export {
    RegisterDefaults,
    RegisteredCount,
    RegisterSubscriber,
    UnregisterSubscriber,
    VerifyWebhooks
} from '#subscribers/slots';
export { outcomeFor, queuedMsFor, reportDispatch } from '#src/dispatch/dispatchReport';
// the transports' augmentation target for their own default keys
export type { DefaultSubscriptions } from '#subscribers/types/Subscriptions';
export type { Initializeable } from '#src/plugin/Plugin';
