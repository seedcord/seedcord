import { relative, sep } from 'node:path';

import { BUILT_FILES_KEY } from '@seedcord/utils/node/internal';

import type { Plugin } from 'vite';

const IMPORT_META_PATH = /\bimport\.meta\.(dirname|filename|url)\b/g;
const BUILT_ROOT = `globalThis[Symbol.for(${JSON.stringify(BUILT_FILES_KEY)})].root`;

// bun --compile gives every module the entry's import.meta
export function pinModulePaths(root: string): Plugin {
    const prefix = root + sep;

    return {
        name: 'seedcord:pin-module-paths',
        transform(code, id) {
            if (!id.startsWith(prefix) || id.includes(`${sep}node_modules${sep}`) || !code.includes('import.meta.')) {
                return undefined;
            }

            const file = `/${relative(root, id).split(sep).join('/').replace(/\.ts$/, '.js')}`;
            const dir = file.slice(0, file.lastIndexOf('/'));
            const filename = `(${BUILT_ROOT} + ${JSON.stringify(file)})`;
            const values = {
                dirname: `(${BUILT_ROOT} + ${JSON.stringify(dir)})`,
                filename,
                url: `(new URL('file://' + ${filename}).href)`
            };

            // map: null holds because the replacement adds no lines
            return { code: code.replaceAll(IMPORT_META_PATH, (_, key: keyof typeof values) => values[key]), map: null };
        }
    };
}
