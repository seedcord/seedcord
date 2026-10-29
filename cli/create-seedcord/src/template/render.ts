import { readFile, readdir } from 'node:fs/promises';
import { join, posix, sep } from 'node:path';

import Handlebars from 'handlebars';

import type { TemplateContext } from './context';
import type { RenderedFile } from '@seedcord/cli-templates';

// npm drops a literal .gitignore from a tarball, whatever the files list says
const DOTTED = new Set(['env', 'gitattributes', 'gitignore', 'prettierignore']);

function targetPath(templateRelative: string): string {
    const parts = templateRelative.split(sep);
    const name = parts.pop()?.replace(/\.hbs$/, '') ?? '';

    return posix.join(...parts, DOTTED.has(name) ? `.${name}` : name);
}

async function hbsFilesIn(root: string): Promise<string[]> {
    const paths = await readdir(root, { recursive: true });
    return paths.filter((path) => path.endsWith('.hbs'));
}

export async function renderTemplates(templatesRoot: string, context: TemplateContext): Promise<RenderedFile[]> {
    const sources = await hbsFilesIn(templatesRoot);
    const rendered = await Promise.all(
        sources.map(async (source) => {
            const raw = await readFile(join(templatesRoot, source), 'utf8');

            return {
                path: targetPath(source),
                // every template is code, and escaping would mangle an apostrophe in a name
                contents: Handlebars.compile(raw, { noEscape: true })(context)
            };
        })
    );

    // a template that wraps its whole body in a conditional writes no file when that is false
    return rendered.filter((file) => file.contents.trim() !== '');
}

async function copiedIntoTemplates(dir: string): Promise<RenderedFile[]> {
    const sources = await hbsFilesIn(dir);
    return Promise.all(
        sources.map(async (source) => ({
            path: posix.join('templates', ...source.split(sep)),
            contents: await readFile(join(dir, source), 'utf8')
        }))
    );
}

// seedcord make renders these later
export async function copyStarters(startersRoot: string, { isGateway }: TemplateContext): Promise<RenderedFile[]> {
    const groups = isGateway ? ['shared', 'gateway'] : ['shared'];
    const copied = await Promise.all(groups.map((group) => copiedIntoTemplates(join(startersRoot, group))));
    return copied.flat();
}
