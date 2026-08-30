// CLI checks this symbol to confirm an unknown export is a real seedcord instance
export const SeedcordBrand = Symbol.for('SeedcordInstance');

export interface Brandable {
    readonly [SeedcordBrand]: boolean;
}

// the CLI loads the bot out of the user's node_modules, a second copy of this package
export const HostShutdown = Symbol.for('seedcord.host.shutdown');
export const HostStartup = Symbol.for('seedcord.host.startup');
export const HostVersion = Symbol.for('seedcord.host.version');
export const HostAugmentTarget = Symbol.for('seedcord.host.augmentTarget');
export const HostPluginKeys = Symbol.for('seedcord.host.pluginKeys');
