import { OxfmtConfig, SortTailwindcssConfig } from 'vite-plus/fmt';
import { OXFMT_CONFIG } from './rules/oxfmt-config';

export interface CreateOxfmtConfigOptions {
    /**
     * Whether or not to sort Tailwind classes with Oxfmt.
     * Omit it to get the base seedcord oxfmt config unchanged.
     */
    tailwind?: SortTailwindcssConfig;

    /**
     * Per-glob option overrides, passed through to oxfmt's own `overrides` field.
     */
    overrides?: OxfmtConfig['overrides'];
}

export function createOxfmtConfig(options: CreateOxfmtConfigOptions = {}): OxfmtConfig {
    const base: OxfmtConfig = {
        ...OXFMT_CONFIG,
        ...(options.overrides ? { overrides: options.overrides } : {})
    };

    if (!options.tailwind) return base;

    const { functions = ['cn', 'tw'], preserveDuplicates = false, ...rest } = options.tailwind;

    return {
        ...base,
        sortTailwindcss: { functions, preserveDuplicates, ...rest }
    };
}
