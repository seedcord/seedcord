import { existsSync } from 'node:fs';
import path from 'node:path';

import { posixRelative } from '#src/lib/paths';

const ESLINT_CONFIG = 'eslint.config.ts';
const ESLINT = 'eslint --no-warn-ignored --max-warnings=0 --fix --cache';

function* folderAndParents(dir: string): Generator<string> {
    for (let current = dir; ; current = path.dirname(current)) {
        yield current;
        if (path.dirname(current) === current) return;
    }
}

function eslintRoot(file: string): string | undefined {
    return folderAndParents(path.dirname(file)).find((dir) => existsSync(path.join(dir, ESLINT_CONFIG)));
}

// vp staged splits commands with string-argv
// it never unescapes \" or \\
function quote(arg: string): string {
    if (!arg.includes('"')) return `"${arg}"`;
    if (!arg.includes("'")) return `'${arg}'`;
    throw new Error(`vp staged can't pass a path holding both ' and ", got ${arg}. Rename the file.`);
}

// every command starts in the repo root, without a shell to run a cd
function eslintCommand(root: string | undefined, files: readonly string[]): string {
    if (root === undefined) return `vp exec ${ESLINT} ${files.map(quote).join(' ')}`;
    const relative = files.map((file) => quote(posixRelative(root, file)));
    return `vp -C ${quote(root)} exec ${ESLINT} --config ${quote(ESLINT_CONFIG)} ${relative.join(' ')}`;
}

const PROSE = [
    'vale --minAlertLevel=error',
    'eslint --no-config-lookup -c tooling/prose/prose.config.ts --quiet --no-warn-ignored'
];

// vale and the eslint pass skip any files that aren't covered by their configs
export function runProse(files: readonly string[]): string[] {
    const list = files.map(quote).join(' ');
    return PROSE.map((command) => `vp exec ${command} ${list}`);
}

export function runEslint(files: readonly string[]): string[] {
    const linted = files.filter((file) => !file.endsWith('.d.ts'));
    return [...Map.groupBy(linted, eslintRoot)].map(([root, grouped]) => eslintCommand(root, grouped));
}
