export { setBotColor } from '@components/botColorHolder';

export type { CommandMeta } from '@decorators/Command';

export { runGates, runHandlerGates } from '@gates/runGates';
export { pickNotice } from '@gates/catalog/options';
export type { GateFitsWith } from '@gates/matching';

export { GateNotice, NeedsAny, NotAllowed, NotInDm, NotInGuild, NotOwner, OnCooldown } from '@notices/index';

export {
    CommandMetadataKey,
    EventMetadataKey,
    GatedMetadataKey,
    InteractionMetadataKey,
    InteractionRouteKeys,
    InteractionRoutes,
    MiddlewareMetadataKey,
    SubscribeMetadataKey
} from '@src/metadataKeys';

export { NoticeCard } from '@stops/NoticeCard';

export { prefixOf, decodeFor, type AnyCustomId } from '@customId/CustomId';
export { ComponentDefsKey, type HasComponentDefs } from '@customId/routing';
export type { DecodedParams } from '@customId/Field';

export { PAGE_MAX, pageCursor, type PageCursor } from '@pagination/cursor';
