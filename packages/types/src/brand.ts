// CLI checks this symbol to confirm an unknown export is a real seedcord instance
export const SeedcordBrand = Symbol.for('seedcord:brand');

export interface Brandable {
    readonly [SeedcordBrand]: boolean;
}

// the CLI loads the bot out of the user's node_modules, a second copy of this package
export const HostShutdown = Symbol.for('seedcord:host:shutdown');
export const HostStartup = Symbol.for('seedcord:host:startup');
export const HostVersion = Symbol.for('seedcord:host:version');
export const HostAugmentTarget = Symbol.for('seedcord:host:augment-target');
export const HostListenHost = Symbol.for('seedcord:host:listen-host');
export const HostPlugins = Symbol.for('seedcord:host:plugins');
export const HostContract = Symbol.for('seedcord:host:contract');

// VERY IMPORTANT!!!
// bump this whenever SeedcordInstance changes
// the CLI refuses a bot stamped with another number
export const HOST_CONTRACT = 1;
// VERY IMPORTANT!!!
