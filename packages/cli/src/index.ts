// CLI command exports
export { DevCommand } from './commands/DevCommand';
export { BuildCommand } from './commands/BuildCommand';

// Config schema and helpers
export { ConfigLoader } from './config/ConfigLoader';
export { ConfigLocator } from './config/ConfigLocator';
export { SEEDCORD_CONFIG_FILENAMES, defineConfig } from './config/schema';
export type { ResolvedSeedcordDevConfig, SeedcordDevConfig } from './config/schema';

// Module loading utilities
export type { ModuleLoader } from './modules/ModuleLoader';
export { RuntimeModuleLoader } from './modules/RuntimeModuleLoader';

// Runtime helpers
export { SeedcordDevRunner } from './runtime/SeedcordDevRunner';
export { SeedcordBuildRunner } from './runtime/SeedcordBuildRunner';
export { TypeScriptProjectBuilder } from './builder/TypeScriptProjectBuilder';
export { BootstrapWriter } from './builder/BootstrapWriter';
export { SeedcordInstanceLoader } from './runtime/SeedcordInstanceLoader';

// Shared utilities
export { resolveDefaultExport } from './utils/resolveDefaultExport';

export const version = process.env.PACKAGE_VERSION ?? '0.0.0';
