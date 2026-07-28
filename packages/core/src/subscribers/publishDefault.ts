/**
 * The key of the Bus method that emits the framework's own subscriptions. `publish` excludes these keys
 * through `PublishableKey`, and this symbol is exported only from the internal entry.
 *
 * @internal
 */
export const PublishDefault = Symbol('seedcord.publishDefault');
