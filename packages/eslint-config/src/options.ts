import type { Linter } from 'eslint';

/** @internal */
export type FlatConfig = Linter.Config[];

/** @internal */
export type FlatConfigItem = Linter.Config;

export interface CreateConfigOptions {
    /**
     * Root directory for TypeScript configuration
     *
     * @defaultValue `process.cwd()`
     */
    tsconfigRootDir?: string;

    /** Additional glob patterns to extend the shared ignore list */
    generalIgnores?: string[];

    /** Additional user-defined ESLint configuration items to merge */
    userConfigs?: FlatConfigItem[];

    /**
     * Toggle registration of the `eslint-plugin-import-x` plugin
     *
     * @defaultValue `true`
     */
    registerImportPlugin?: boolean;

    /**
     * Toggle registration of the `eslint-plugin-prettier` plugin
     *
     * @defaultValue `true`
     */
    registerPrettierPlugin?: boolean;

    /**
     * Toggle registration of the `eslint-plugin-security` plugin
     *
     * @defaultValue `true`
     */
    registerSecurityPlugin?: boolean;

    /**
     * Toggle registration of the `eslint-plugin-tsdoc` plugin
     *
     * @defaultValue `true`
     */
    registerTsdocPlugin?: boolean;

    /**
     * Toggle registration of TypeScript ESLint configs
     *
     * @defaultValue `true`
     */
    registerTypescriptConfigs?: boolean;

    /**
     * Toggle registration of the `eslint-plugin-unicorn` plugin. unicorn requires eslint >=10.4, so
     * consumers still on eslint 9 must set this to `false`.
     *
     * @defaultValue `true`
     */
    registerUnicornPlugin?: boolean;

    /**
     * Absolute path to the consumer's Tailwind entry CSS (`@import 'tailwindcss'`). When set, the
     * canonical-class rules run as `warn`, off when omitted. Shared packages without a `globals.css`
     * can pass a sibling app's entry via {@link resolveSharedTailwindEntry}. Requires `tailwindcss`.
     */
    tailwindEntryPoint?: string;

    /**
     * Function names whose string arguments are scanned for non-canonical Tailwind classes. The `tw`
     * tagged template is handled by {@link CreateConfigOptions.tailwindTaggedTemplates}.
     *
     * @default ['cn']
     */
    tailwindCalleeFunctions?: string[];

    /**
     * Tagged-template names whose content is scanned for non-canonical Tailwind classes. Only
     * `better-tailwindcss` supports tagged templates.
     *
     * @default ['tw']
     */
    tailwindTaggedTemplates?: string[];

    /**
     * File globs to lint as MDX (typically every `.mdx`). Registers the `eslint-mdx` parser + `mdx`
     * plugin and runs `no-unused-expressions` on embedded JS/JSX. Does not lint markdown prose.
     */
    mdxFiles?: string[];

    /**
     * Enable seedcord's discord.js lint rules, off by default. Bans importing the component builders
     * from `discord.js`, whose CJS copy is a separate class from the ESM `@discordjs/builders` seedcord uses.
     *
     * @defaultValue `false`
     */
    discordRules?: boolean;
}
