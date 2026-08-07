// CLI checks this symbol to confirm an unknown export is a real seedcord instance
export const SeedcordBrand = Symbol.for('SeedcordInstance');

export interface Brandable {
    readonly [SeedcordBrand]: boolean;
}
