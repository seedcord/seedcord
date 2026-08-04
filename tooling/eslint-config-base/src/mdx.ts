import * as mdx from 'eslint-plugin-mdx';

import type { Linter } from 'eslint';

// omits mdx/remark on purpose, that bridge lints markdown prose and needs its own remark config
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
