import { VitePlugins } from '#core/config/vitePlugins';

// the vitePlugins ProjectLoader resolves from a seedcord.config.ts. a JS config can return anything
export function vitePluginsOf(factory?: () => unknown, configFile = '/bot/seedcord.config.ts'): VitePlugins {
    return new VitePlugins(factory, configFile);
}
