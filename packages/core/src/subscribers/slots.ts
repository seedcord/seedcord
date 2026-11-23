// the framework's own Bus calls. a bot author reaches the Bus through publish() and a Subscriber subclass
export const RegisterDefaults = Symbol('seedcord:bus:register-defaults');
export const VerifyWebhooks = Symbol('seedcord:bus:verify-webhooks');
export const RegisteredCount = Symbol('seedcord:bus:registered-count');
export const RegisterSubscriber = Symbol('seedcord:bus:register');
export const UnregisterSubscriber = Symbol('seedcord:bus:unregister');
