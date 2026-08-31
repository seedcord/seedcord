import { remarkLLMs } from 'fumadocs-core/mdx-plugins/remark-llms';
import remarkMdx from 'remark-mdx';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { VFile } from 'vfile';

import { TWIN_OPTIONS } from '#lib/twin';

// _data is the plugin's own hook for reading the markdown without compiling a module
export async function twinOf(source: string): Promise<string> {
    const processor = unified()
        .use(remarkParse)
        .use(remarkMdx)
        .use(remarkLLMs, { ...TWIN_OPTIONS, _data: true });

    const file = new VFile(source);
    await processor.run(processor.parse(file), file);

    return String(file.data.markdown);
}
