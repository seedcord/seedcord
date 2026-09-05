// the framework's own Bus calls. a bot author reaches the Bus through publish() and a Subscriber subclass
export const RegisterDefaults = Symbol('seedcord:bus:registerDefaults');
export const VerifyWebhooks = Symbol('seedcord:bus:verifyWebhooks');
export const RegisteredCount = Symbol('seedcord:bus:registeredCount');
export const RegisterSubscriber = Symbol('seedcord:bus:register');
export const UnregisterSubscriber = Symbol('seedcord:bus:unregister');
