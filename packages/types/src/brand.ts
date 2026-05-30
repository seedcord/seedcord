// Brand symbol the CLI checks to confirm an unknown module export is a real Seedcord instance.
export const SeedcordBrand = Symbol.for('SeedcordInstance');

export interface Brandable {
    readonly [SeedcordBrand]: boolean;
}
