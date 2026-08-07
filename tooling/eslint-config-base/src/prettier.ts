import { PRETTIER_CONFIG } from './rules/prettier-rules';

import type { Options } from 'prettier';

/**
 * Prettier config augmented with the option keys contributed by `prettier-plugin-tailwindcss`.
 * The plugin's options are not part of prettier's own `Options` type.
 */
export type PrettierConfig = Options & {
    tailwindStylesheet?: string;
    tailwindFunctions?: string[];
    tailwindAttributes?: string[];
    tailwindPreserveDuplicates?: boolean;
};

/**
 * Tailwind class-sorting options forwarded to `prettier-plugin-tailwindcss`.
 */
export interface TailwindPrettierOptions {
    /** Path to the Tailwind entry stylesheet (the one with `@import 'tailwindcss'`). Required by v4. */
    stylesheet: string;

    /**
     * Function and tagged-template names whose class strings get sorted
     * (`prettier-plugin-tailwindcss` treats both via `tailwindFunctions`).
     *
     * @default ['cn', 'tw']
     */
    functions?: string[];

    /** Attribute names (or `/regex/`) whose values get class-sorted. No default. */
    attributes?: string[];

    /**
     * Keeps duplicate classes uncollapsed
     *
     * @defaultValue `false`
     */
    preserveDuplicates?: boolean;
}

export interface CreatePrettierConfigOptions {
    /**
     * When provided, layers in `prettier-plugin-tailwindcss` and its class-sorting options.
     * Omit it to get the base seedcord prettier config unchanged.
     *
     * Requires `prettier-plugin-tailwindcss` to be installed in the consuming package
     * (an optional peerDependency).
     */
    tailwind?: TailwindPrettierOptions;
}

/**
 * Builds a Prettier config from the shared seedcord base, optionally adding Tailwind class sorting.
 *
 * @param options - Pass `tailwind` to enable `prettier-plugin-tailwindcss`; omit for the plain base.
 */
export function createPrettierConfig(options: CreatePrettierConfigOptions = {}): PrettierConfig {
    const base: PrettierConfig = { ...PRETTIER_CONFIG };

    if (!options.tailwind) return base;

    const { stylesheet, functions = ['cn', 'tw'], attributes, preserveDuplicates = false } = options.tailwind;

    return {
        ...base,
        plugins: [...(base.plugins ?? []), 'prettier-plugin-tailwindcss'],
        tailwindStylesheet: stylesheet,
        tailwindFunctions: functions,
        tailwindPreserveDuplicates: preserveDuplicates,
        ...(attributes ? { tailwindAttributes: attributes } : {})
    };
}

export { PRETTIER_CONFIG };
