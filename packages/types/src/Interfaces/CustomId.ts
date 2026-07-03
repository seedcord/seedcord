/**
 * Structural shape of a customId matcher. A framework `CustomId` (from `@seedcord/core`) satisfies it.
 * Used to type {@link InteractionsConfig.ignoreCustomIds} without importing the concrete class, which
 * would create a `@seedcord/types` to `@seedcord/core` cycle.
 */
export interface CustomIdMatcher {
    /** True if the raw customId wire was minted from this matcher's prefix. */
    owns(customId: string): boolean;
}
