import 'reflect-metadata';

// Main exports
export * from './Seedcord';

// Bot export
export * from './bot/Bot';

// Bot decorators exports
export * from './bot/decorators/Checkable';
export * from './bot/decorators/Catchable';
export * from './bot/decorators/Command';
export * from './bot/decorators/EventCatchable';
export * from './bot/decorators/Events';
export * from './bot/decorators/Interactions';
export * from './bot/decorators/Middlewares';

// Bot Controller Exports
export * from './bot/controllers/CommandRegistry';
export * from './bot/controllers/EventController';
export * from './bot/controllers/InteractionController';

// Bot Error Exports
export * from './bot/errors/Channels';
export * from './bot/errors/Database';
export * from './bot/errors/Roles';
export * from './bot/errors/User';

// Bot Injectors Exports
export * from './bot/injectors/EmojiInjector';

// Bot Utilities Channels Exports
export * from './bot/utilities/channels/fetchText';
export * from './bot/utilities/channels/sendInText';

// Bot Utilities Errors Exports
export * from './bot/utilities/errors/extractErrorResponse';
export * from './bot/utilities/errors/throwCustomError';

// Bot Utilities Messages Exports
export * from './bot/utilities/messages/attemptSendDM';

// Bot Utilities Miscellaneous Exports
export * from './bot/utilities/miscellaneous/buildSlashRoute';

// Bot Utilities Permissions Exports
export * from './bot/utilities/roles/checkBotPermissions';
export * from './bot/utilities/roles/checkPermissions';
export * from './bot/utilities/roles/fetchRole';
export * from './bot/utilities/roles/getBotRole';
export * from './bot/utilities/roles/hasPermsToAssign';

// Bot Utilities Users Exports
export * from './bot/utilities/users/fetchGuildMember';
export * from './bot/utilities/users/fetchManyGuildMembers';
export * from './bot/utilities/users/fetchManyUsers';
export * from './bot/utilities/users/fetchUser';
export * from './bot/utilities/users/updateMemberRoles';

// Bot Utility Types Exports
export type * from './bot/utilities/Types';

// Bot Default Exports
export * from './bot/defaults/UnhandledEvent';

// Interfaces exports
export * from './interfaces/Components';
export * from './interfaces/Handler';
export * from './interfaces/Plugin';
export type * from './interfaces/Core';
export type * from './interfaces/Config';

// Effects exports
export * from './effects/EffectsRegistry';
export * from './effects/EffectsEmitter';
export * from './effects/decorators/RegisterEffect';
export * from './effects/default/UnknownException';
export * from './effects/interfaces/EffectsHandler';
export * from './effects/interfaces/abstracts/WebhookLog';
export type * from './effects/types/Effects';

// Errors
export * from './bot/errors/Database';

// Export Services
export * from '@seedcord/services';

// Export Types
export type * from '@seedcord/types';

// Export Utils
export * from '@seedcord/utils';
