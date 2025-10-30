import 'reflect-metadata';

// Main exports
export * from './Seedcord';

// Bot export
export * from '@bot/Bot';

// Bot decorators exports
export * from '@bDecorators/Checkable';
export * from '@bDecorators/Catchable';
export * from '@bDecorators/Command';
export * from '@bDecorators/EventCatchable';
export * from '@bDecorators/Events';
export * from '@bDecorators/Interactions';
export * from '@bDecorators/Middlewares';

// Bot Controller Exports
export * from '@bControllers/CommandRegistry';
export * from '@bControllers/EventController';
export * from '@bControllers/InteractionController';

// Bot Error Exports
export * from '@bErrors/Channels';
export * from '@bErrors/Database';
export * from '@bErrors/Roles';
export * from '@bErrors/User';

// Bot Injectors Exports
export * from '@bot/injectors/EmojiInjector';

// Bot Utilities Channels Exports
export * from '@bUtilities/channels/fetchText';
export * from '@bUtilities/channels/sendInText';

// Bot Utilities Errors Exports
export * from '@bUtilities/errors/extractErrorResponse';
export * from '@bUtilities/errors/throwCustomError';

// Bot Utilities Messages Exports
export * from '@bUtilities/messages/attemptSendDM';

// Bot Utilities Miscellaneous Exports
export * from '@bUtilities/miscellaneous/buildSlashRoute';

// Bot Utilities Permissions Exports
export * from '@bUtilities/roles/checkBotPermissions';
export * from '@bUtilities/roles/checkPermissions';
export * from '@bUtilities/roles/fetchRole';
export * from '@bUtilities/roles/getBotRole';
export * from '@bUtilities/roles/hasPermsToAssign';

// Bot Utilities Users Exports
export * from '@bUtilities/users/fetchGuildMember';
export * from '@bUtilities/users/fetchManyGuildMembers';
export * from '@bUtilities/users/fetchManyUsers';
export * from '@bUtilities/users/fetchUser';
export * from '@bUtilities/users/updateMemberRoles';

// Bot Utility Types Exports
export type * from '@bUtilities/Types';

// Bot Default Exports
export * from '@bot/defaults/UnhandledEvent';

// Interfaces exports
export * from '@interfaces/Components';
export * from '@interfaces/Handler';
export * from '@interfaces/Plugin';
export type * from '@interfaces/Core';
export type * from '@interfaces/Config';

// Effects exports
export * from './effects';

// Errors
export * from '@bErrors/Database';

// Export Services
export * from '@seedcord/services';

// Export Types
export type * from '@seedcord/types';

// Export Utils
export * from '@seedcord/utils';
