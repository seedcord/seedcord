import { Visitor } from 'vite';

import type { ProjectFiles } from '#core/project/ProjectFiles';
import type { Plugin } from 'vite';

type PathKey = 'dirname' | 'filename' | 'url';

interface Rewrite {
    start: number;
    end: number;
    key: PathKey;
}

function isPathKey(name: string): name is PathKey {
    return name === 'dirname' || name === 'filename' || name === 'url';
}

function importMetaPaths(program: Parameters<Visitor['visit']>[0]): Rewrite[] {
    const found: Rewrite[] = [];
    new Visitor({
        MemberExpression(node) {
            const { object, property } = node;
            const isImportMeta = object.type === 'MetaProperty' && object.meta.name === 'import';
            if (isImportMeta && property.type === 'Identifier' && isPathKey(property.name)) {
                found.push({ start: node.start, end: node.end, key: property.name });
            }
        }
    }).visit(program);
    return found;
}

const FILE_URL = '__seedcordPathToFileURL';
const FILE_URL_IMPORT = `import { pathToFileURL as ${FILE_URL} } from 'node:url';`;

// bun --compile gives every module the entry's import.meta.
// builtRoot is a JS expression for the built root.
export function pinModulePaths(files: ProjectFiles, builtRoot: string): Plugin {
    return {
        name: 'seedcord:pin-module-paths',
        transform(code, id) {
            // a ?raw text module is file content
            if (!files.holds(id) || id.includes('?')) return undefined;
            if (!code.includes('import.meta.')) return undefined;

            const rewrites = importMetaPaths(this.parse(code));
            if (rewrites.length === 0) return undefined;

            const file = files.keyOf(id).replace(/\.ts$/, '.js');
            const filename = `(${builtRoot} + ${JSON.stringify(file)})`;
            const values: Record<PathKey, string> = {
                dirname: `(${builtRoot} + ${JSON.stringify(file.slice(0, file.lastIndexOf('/')))})`,
                filename,
                url: `(${FILE_URL}(${filename}).href)`
            };

            let rewritten = code;
            for (const { start, end, key } of rewrites.toReversed()) {
                rewritten = rewritten.slice(0, start) + values[key] + rewritten.slice(end);
            }
            if (rewrites.some(({ key }) => key === 'url')) rewritten = FILE_URL_IMPORT + rewritten;
            // keeps line numbers right. columns after a rewrite shift
            return { code: rewritten, map: null };
        }
    };
}
