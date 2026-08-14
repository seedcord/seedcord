import { requirePlugin } from './optionalPlugins';

import type { Linter } from 'eslint';

interface MdxPlugin {
    flat: Pick<Linter.Config, 'languageOptions' | 'plugins'>;
}

// omits mdx/remark on purpose, since that bridge lints markdown prose and needs its own remark config
export function mdxBlock(files: string[]): Linter.Config {
    const mdx = requirePlugin<MdxPlugin>('eslint-plugin-mdx', 'mdxFiles');
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
