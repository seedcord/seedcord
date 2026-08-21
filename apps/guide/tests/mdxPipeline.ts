import { compile } from '@mdx-js/mdx';
import { mdxPreset } from 'fumadocs-core/content/mdx/preset-bundler';

import config from '../source.config';

type PresetOptions = Parameters<typeof mdxPreset>[0];

export async function compileGuideMdx(source: string): Promise<string> {
    const authored = typeof config.mdxOptions === 'function' ? await config.mdxOptions() : config.mdxOptions;
    // source.config.ts never picks the 'minimal' preset, the other arm of the declared type
    const options = await mdxPreset(authored as PresetOptions);
    const file = { value: source, path: 'content/docs/sample.mdx' };

    return String(await compile(file, { ...options, jsx: true }));
}
