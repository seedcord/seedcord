import * as mdx from 'eslint-plugin-mdx';

import type { Linter } from 'eslint';

/**
 * Builds the flat-config block that turns on MDX support.
 *
 * Deliberately omits the `mdx/remark` rule and its remark processor: that bridge lints
 * markdown *prose* via remark-lint, which overlaps with markdownlint and needs a separate
 * remark config to do anything. Prose linting stays out of scope here.
 *
 * @param files - File globs the block applies to (typically `['**\/*.mdx']`).
 */
export function mdxBlock(files: string[]): Linter.Config {
    const { languageOptions, plugins } = mdx.flat;

    const block: Linter.Config = {
        files: [...files],
        rules: {
            'no-unused-expressions': 'error'
        }
    };

    if (languageOptions) block.languageOptions = languageOptions;
    if (plugins) block.plugins = plugins;

    return block;
}
