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

// Symbol.for so a second copy of this module reads the same slots
export const CommandMetadataKey = Symbol.for('seedcord:command:metadata');
export const InteractionMetadataKey = Symbol.for('seedcord:interaction:metadata');
export const MiddlewareMetadataKey = Symbol.for('seedcord:middleware:metadata');
export const SubscribeMetadataKey = Symbol.for('seedcord:subscribe:metadata');
export const EventMetadataKey = Symbol.for('seedcord:event:metadata');
export const GatedMetadataKey = Symbol.for('seedcord:gated:metadata');
export const WebhookUrlMetadataKey = Symbol.for('seedcord:webhook-url:metadata');

export const InteractionRouteKeys: Record<InteractionKind, symbol> = {
    [InteractionKind.Slash]: Symbol.for('seedcord:interaction:slash'),
    [InteractionKind.Button]: Symbol.for('seedcord:interaction:button'),
    [InteractionKind.Modal]: Symbol.for('seedcord:interaction:modal'),
    [InteractionKind.StringMenu]: Symbol.for('seedcord:interaction:string-menu'),
    [InteractionKind.UserMenu]: Symbol.for('seedcord:interaction:user-menu'),
    [InteractionKind.RoleMenu]: Symbol.for('seedcord:interaction:role-menu'),
    [InteractionKind.ChannelMenu]: Symbol.for('seedcord:interaction:channel-menu'),
    [InteractionKind.MentionableMenu]: Symbol.for('seedcord:interaction:mentionable-menu'),
    [InteractionKind.MessageContextMenu]: Symbol.for('seedcord:interaction:message-context-menu'),
    [InteractionKind.UserContextMenu]: Symbol.for('seedcord:interaction:user-context-menu'),
    [InteractionKind.Autocomplete]: Symbol.for('seedcord:interaction:autocomplete')
};
