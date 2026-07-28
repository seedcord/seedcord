/**
 * The key of the Bus method that emits framework-owned subscriptions. `publish` excludes these keys
 * through `PublishableKey`, and this symbol is exported only from the internal entry.
 *
 * @internal
 */
export const PublishDefault = Symbol('seedcord.publishDefault');
