/**
 * A unique symbol used to brand Seedcord instances.
 *
 * Currently, the CLI uses this to verify that a provided object is indeed a Seedcord instance.
 *
 * @internal
 */
export const SeedcordBrand = Symbol.for('SeedcordInstance');

/**
 * An interface that brands an object as a Seedcord instance.
 *
 * @internal
 */
export interface Brandable {
    readonly [SeedcordBrand]: boolean;
}
