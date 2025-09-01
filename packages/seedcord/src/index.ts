import 'reflect-metadata';

// Main exports
export * from './Seedcord';

// Bot exports
export * from './bot/Bot';
export * from './bot/decorators/Checkable';
export * from './bot/decorators/Catchable';
export * from './bot/decorators/CommandRegisterable';
export * from './bot/decorators/EventCatchable';
export * from './bot/decorators/EventRegisterable';
export * from './bot/decorators/InteractionConfigurable';

// Library exports
export * from './library/Helpers';

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
