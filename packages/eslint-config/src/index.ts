import baseCreateConfig, { TS_FILES } from '@seedcord/eslint-config-base';
import { recommended as seedcordRecommended } from '@seedcord/eslint-plugin';
import { recommended as discordjsRecommended } from 'eslint-plugin-discordjs';

import type { CreateConfigOptions, FlatConfig, FlatConfigItem } from '@seedcord/eslint-config-base';
import type { TSESLint } from '@typescript-eslint/utils';

export * from '@seedcord/eslint-config-base';

export interface SeedcordConfigOptions extends CreateConfigOptions {
    /**
     * Register `eslint-plugin-discordjs` and apply its recommended preset.
     *
     * @defaultValue `false`
     */
    registerDiscordjsPlugin?: boolean;

    /**
     * Register `@seedcord/eslint-plugin` and apply its recommended preset.
     *
     * @defaultValue `false`
     */
    registerSeedcordPlugin?: boolean;
}

function pluginPreset(preset: TSESLint.FlatConfig.Config): FlatConfigItem {
    // justified: typescript-eslint's FlatConfig.Config and eslint's Linter.Config describe the
    // same runtime shape with incompatible index signatures
    return { ...preset, files: [...TS_FILES] } as FlatConfigItem;
}

/**
 * Creates a comprehensive ESLint configuration tailored for JavaScript and TypeScript projects.
 *
 * @param options - Configuration options to customize the ESLint setup.
 */
export default function createConfig(options: SeedcordConfigOptions = {}): FlatConfig {
    const { registerDiscordjsPlugin = false, registerSeedcordPlugin = false, userConfigs = [], ...rest } = options;

    // injected through userConfigs so the blocks follow the shared rule blocks, and consumer
    // overrides still win because their configs come after them
    const pluginBlocks: FlatConfigItem[] = [
        ...(registerDiscordjsPlugin ? [pluginPreset(discordjsRecommended)] : []),
        ...(registerSeedcordPlugin ? [pluginPreset(seedcordRecommended)] : [])
    ];

    return baseCreateConfig({ ...rest, userConfigs: [...pluginBlocks, ...userConfigs] });
}
