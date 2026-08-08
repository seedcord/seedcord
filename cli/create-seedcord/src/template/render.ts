import { readFile, readdir } from 'node:fs/promises';
import { join, posix, relative, sep } from 'node:path';

import Handlebars from 'handlebars';

import type { TemplateContext } from './context';

export interface RenderedFile {
    path: string;
    contents: string;
}

// npm drops a literal .gitignore from a tarball, whatever the files list says
const DOTTED = new Set(['env', 'gitignore', 'prettierignore']);

function targetPath(templateRelative: string): string {
    const parts = templateRelative.split(sep);
    const name = parts.pop()?.replace(/\.hbs$/, '') ?? '';

    return posix.join(...parts, DOTTED.has(name) ? `.${name}` : name);
}

async function templateFiles(root: string, directory: string): Promise<string[]> {
    const entries = await readdir(directory, { withFileTypes: true });
    const found = await Promise.all(
        entries.map(async (entry) => {
            const full = join(directory, entry.name);
            if (entry.isDirectory()) return templateFiles(root, full);
            return entry.name.endsWith('.hbs') ? [relative(root, full)] : [];
        })
    );

    return found.flat();
}

export async function renderTemplates(templatesRoot: string, context: TemplateContext): Promise<RenderedFile[]> {
    const sources = await templateFiles(templatesRoot, templatesRoot);

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
