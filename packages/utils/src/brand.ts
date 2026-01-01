export const SeedcordBrand = Symbol.for('SeedcordInstance');

export interface Brandable {
    readonly [SeedcordBrand]: boolean;
}
