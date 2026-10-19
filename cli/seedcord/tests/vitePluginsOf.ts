import { VitePlugins } from '#core/config/vitePlugins';

import type { PluginOption } from 'vite';

// the vitePlugins ProjectLoader resolves from a seedcord.config.ts
export function vitePluginsOf(factory?: () => PluginOption[], configFile = '/bot/seedcord.config.ts'): VitePlugins {
    return new VitePlugins(factory, configFile);
}
