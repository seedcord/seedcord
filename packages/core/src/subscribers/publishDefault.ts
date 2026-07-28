/**
 * The key of the Bus method that emits framework-owned subscriptions. It reaches no public entry, so
 * bot code cannot name it even with the runtime object in hand.
 *
 * @internal
 */
export const PublishDefault = Symbol('seedcord.publishDefault');
