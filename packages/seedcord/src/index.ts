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

// Services exports
export * from './services/Logger';
export * from './services/Lifecycle/CoordinatedStartup';
export * from './services/Lifecycle/CoordinatedShutdown';
export * from './services/HealthCheck';
export * from './services/CooldownManager';

// Database exports
export * from './mongo/Mongo';
export * from './mongo/BaseService';
export * from './mongo/decorators/DBCatchable';
export * from './mongo/decorators/DatabaseModel';
export * from './mongo/decorators/DatabaseService';
export type * from './mongo/types/Services';

// Library exports
export * from './library/Globals';
export * from './library/Helpers';

// Interfaces exports
export * from './interfaces/Components';
export * from './interfaces/Handler';
export * from './interfaces/Plugin';
export type * from './interfaces/Core';
export type * from './interfaces/Config';

// Hooks exports
export * from './hooks/HookController';
export * from './hooks/HookEmitter';
export * from './hooks/decorators/RegisterHook';
export * from './hooks/interfaces/HookHandler';
export * from './hooks/interfaces/abstracts/WebhookLog';
export type * from './hooks/types/Hooks';
