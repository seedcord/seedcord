/**
 * Every interaction kind seedcord routes.
 */
export enum InteractionKind {
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

export const InteractionMetadataKey = Symbol('seedcord:interaction:metadata');

export const InteractionRouteKeys: Record<InteractionKind, symbol> = {
    [InteractionKind.Slash]: Symbol('seedcord:interaction:slash'),
    [InteractionKind.Button]: Symbol('seedcord:interaction:button'),
    [InteractionKind.Modal]: Symbol('seedcord:interaction:modal'),
    [InteractionKind.StringMenu]: Symbol('seedcord:interaction:stringMenu'),
    [InteractionKind.UserMenu]: Symbol('seedcord:interaction:userMenu'),
    [InteractionKind.RoleMenu]: Symbol('seedcord:interaction:roleMenu'),
    [InteractionKind.ChannelMenu]: Symbol('seedcord:interaction:channelMenu'),
    [InteractionKind.MentionableMenu]: Symbol('seedcord:interaction:mentionableMenu'),
    [InteractionKind.MessageContextMenu]: Symbol('seedcord:interaction:messageContextMenu'),
    [InteractionKind.UserContextMenu]: Symbol('seedcord:interaction:userContextMenu'),
    [InteractionKind.Autocomplete]: Symbol('seedcord:interaction:autocomplete')
};

export const MiddlewareMetadataKey = Symbol('seedcord:middleware:metadata');

export const EventMetadataKey = Symbol('seedcord:event:metadata');

// Symbol.for so the cli's own copy of this module reads the same slot
export const CommandMetadataKey = Symbol.for('seedcord:command:metadata');

export const GatedMetadataKey = Symbol('seedcord:gated:metadata');

export const SubscribeMetadataKey = Symbol('seedcord:subscribe:metadata');

export const WebhookUrlMetadataKey = Symbol('seedcord:webhookUrl:metadata');
