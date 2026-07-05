/** @internal */
export enum InteractionRoutes {
    Slash = 'slash',
    Button = 'button',
    Modal = 'modal',
    StringMenu = 'stringMenu',
    UserMenu = 'userMenu',
    RoleMenu = 'roleMenu',
    ChannelMenu = 'channelMenu',
    MentionableMenu = 'mentionableMenu',
    MessageContextMenu = 'messageContextMenu',
    UserContextMenu = 'userContextMenu',
    Autocomplete = 'autocomplete'
}

/** @internal */
export const InteractionMetadataKey = Symbol('seedcord:interaction:metadata');

/** @internal */
export const InteractionRouteKeys: Record<InteractionRoutes, symbol> = {
    [InteractionRoutes.Slash]: Symbol('seedcord:interaction:slash'),
    [InteractionRoutes.Button]: Symbol('seedcord:interaction:button'),
    [InteractionRoutes.Modal]: Symbol('seedcord:interaction:modal'),
    [InteractionRoutes.StringMenu]: Symbol('seedcord:interaction:stringMenu'),
    [InteractionRoutes.UserMenu]: Symbol('seedcord:interaction:userMenu'),
    [InteractionRoutes.RoleMenu]: Symbol('seedcord:interaction:roleMenu'),
    [InteractionRoutes.ChannelMenu]: Symbol('seedcord:interaction:channelMenu'),
    [InteractionRoutes.MentionableMenu]: Symbol('seedcord:interaction:mentionableMenu'),
    [InteractionRoutes.MessageContextMenu]: Symbol('seedcord:interaction:messageContextMenu'),
    [InteractionRoutes.UserContextMenu]: Symbol('seedcord:interaction:userContextMenu'),
    [InteractionRoutes.Autocomplete]: Symbol('seedcord:interaction:autocomplete')
};

/** @internal */
export const MiddlewareMetadataKey = Symbol('seedcord:middleware:metadata');

/** @internal */
export const EventMetadataKey = Symbol('seedcord:event:metadata');

/** @internal */
export const CommandMetadataKey = Symbol('seedcord:command:metadata');

/** @internal */
export const GatedMetadataKey = Symbol('seedcord:gated:metadata');

/** @internal */
export const SubscribeMetadataKey = Symbol('seedcord:subscribe:metadata');
