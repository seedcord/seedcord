export { setBotColor } from '@components/botColorHolder';

export type { CommandMeta } from '@decorators/Command';
export {
    areRoutes,
    contextMenuRouteOf,
    selectMenuRouteOf,
    storeComponentRoute,
    storeInteractionRoute,
    type RoutableConstructor
} from '@decorators/interactionRoutes';

export type { Handler } from '@src/handlers/BaseHandler';

export { routeIdOf, runGates, runHandlerGates } from '@gates/runGates';
export { pickNotice } from '@gates/catalog/options';
export type { GateFitsWith } from '@gates/matching';

export { getDevChannel, setDevChannel } from '@hmr/devChannel';
export { HmrManager } from '@hmr/HmrManager';
export { wrapHot } from '@hmr/wrapHot';

export { GateNotice, NeedsAny, NotAllowed, NotInDm, NotInGuild, NotOwner, OnCooldown } from '@notices/index';

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
} from '@src/metadataKeys';

export { NoticeCard } from '@stops/NoticeCard';

export { prefixOf, decodeFor, type AnyCustomId } from '@customId/CustomId';
export {
    ComponentDefsKey,
    decodeComponentRoute,
    type DecodedComponentRoute,
    type HasComponentDefs,
    type MatchArms,
    type SingleParams
} from '@customId/routing';
export type { DecodedParams } from '@customId/Field';

export type { OptionLens } from '@inputs/OptionLens';
export type { SlashOptions } from '@inputs/SlashOptions';
export type { AutocompletableNames, ChoiceValueOf, EntryFor, FocusedField } from '@inputs/AutocompleteOptions';

export { PAGE_MAX, pageCursor, type PageCursor } from '@pagination/cursor';

export { deferFlags, sendFlags } from '@reply/flags';
export { checkAckLegality, sendTarget, type AckState, type ReplyMethod } from '@reply/ackLegality';
export { AckTrace } from '@reply/AckTrace';
export { BaseReplySender, type ModalLike } from '@reply/BaseReplySender';
export { translateSerializationError } from '@reply/translateSerialization';
export { serializeReply, type SerializedReply } from '@reply/serializeReply';
