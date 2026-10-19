import { copyFileSync, mkdirSync, mkdtempSync, rmSync, truncateSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { compile } from '@mdx-js/mdx';
import { mdxPreset } from 'fumadocs-core/content/mdx/preset-bundler';
import { VFile } from 'vfile';

// eslint-disable-next-line no-restricted-imports -- fumadocs-mdx loads source.config.ts from the app root
import config from '../source.config';

type PresetOptions = Parameters<typeof mdxPreset>[0];

const WEBP_4X3 = path.join(import.meta.dirname, 'fixtures/4x3.webp');

export const POST_SLUG = 'test-post';

export async function compilePost(source: string, file: string): Promise<string> {
    const authored = typeof config.mdxOptions === 'function' ? await config.mdxOptions() : config.mdxOptions;
    // source.config.ts sets no preset, which leaves out 'minimal', the other arm of the declared type
    const options = await mdxPreset(authored as PresetOptions);

    return String(await compile(new VFile({ value: source, path: file }), { ...options, jsx: true }));
}

export class PostFolder implements Disposable {
    private readonly root = mkdtempSync(path.join(tmpdir(), 'seedcord-blog-'));
    readonly dir = path.join(this.root, POST_SLUG);
    readonly file = path.join(this.dir, 'index.mdx');

    constructor() {
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
