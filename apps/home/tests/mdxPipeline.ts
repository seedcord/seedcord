import { copyFileSync, mkdirSync, mkdtempSync, rmSync, truncateSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { compile } from '@mdx-js/mdx';
import { mdxPreset } from 'fumadocs-core/content/mdx/preset-bundler';
import { remarkLLMs } from 'fumadocs-core/mdx-plugins/remark-llms';
import { VFile } from 'vfile';

import { TWIN_OPTIONS } from '#lib/blog/twinOptions';

// eslint-disable-next-line no-restricted-imports -- fumadocs-mdx loads source.config.ts from the app root
import config from '../source.config';

const WEBP_4X3 = path.join(import.meta.dirname, 'fixtures/4x3.webp');

export const POST_SLUG = 'test-post';

async function postOptions(): Promise<Awaited<ReturnType<typeof mdxPreset>>> {
    const authored = typeof config.mdxOptions === 'function' ? await config.mdxOptions() : config.mdxOptions;
    if (authored?.preset === 'minimal') throw new Error('source.config.ts switched to the minimal preset');
    return mdxPreset(authored);
}

async function compilePost(source: string, file: string): Promise<string> {
    return String(await compile(new VFile({ value: source, path: file }), { ...(await postOptions()), jsx: true }));
}

// the collection runs remarkLLMs with TWIN_OPTIONS to build each post's index.md
export async function markdownCopy(source: string): Promise<string> {
    const options = await postOptions();
    const file = await compile(new VFile({ value: source, path: path.join(tmpdir(), POST_SLUG, 'index.mdx') }), {
        ...options,
        remarkPlugins: [...(options.remarkPlugins ?? []), [remarkLLMs, { ...TWIN_OPTIONS, _data: true }]]
    });

    return String(file.data.markdown);
}

export class PostFolder implements Disposable {
    private readonly root = mkdtempSync(path.join(tmpdir(), 'seedcord-blog-'));
    readonly dir: string;
    readonly file: string;

    constructor(slug = POST_SLUG) {
        this.dir = path.join(this.root, slug);
        this.file = path.join(this.dir, 'index.mdx');
        mkdirSync(this.dir);
    }

    // truncate pads with zeros after the webp header
    webp(name: string, padTo?: number): this {
        const target = path.join(this.dir, name);
        copyFileSync(WEBP_4X3, target);
        if (padTo !== undefined) truncateSync(target, padTo);
        return this;
    }

    bytes(name: string, size: number): this {
        writeFileSync(path.join(this.dir, name), Buffer.alloc(size));
        return this;
    }

    compile(source: string): Promise<string> {
        return compilePost(source, this.file);
    }

    [Symbol.dispose](): void {
        rmSync(this.root, { recursive: true, force: true });
    }
}
