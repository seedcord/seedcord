import { isNotNil } from 'es-toolkit';
import { parseSync, Visitor } from 'vite';

import type { BotImport } from '@seedcord/types/internal';
import type { ESTree } from 'vite';

type ModuleRecord = ReturnType<typeof parseSync>['module'];
type Entry =
    | ModuleRecord['staticImports'][number]['entries'][number]
    | ModuleRecord['staticExports'][number]['entries'][number];

// undefined for a namespace import, export *, or export * as. those read every export
function exportName({ importName }: Entry): string | undefined {
    if (importName.kind === 'Default') return 'default';
    return importName.kind === 'Name' && importName.name !== null ? importName.name : undefined;
}

// a save keeps the restart for import(name) or a template with ${} because they can load any file
function fixedPath(source: ESTree.Expression): string | undefined {
    if (source.type === 'Literal') return typeof source.value === 'string' ? source.value : undefined;
    if (source.type !== 'TemplateLiteral' || source.expressions.length > 0) return undefined;
    return source.quasis[0]?.value.cooked ?? undefined;
}

export function mergeNames(first: BotImport['names'], second: BotImport['names']): BotImport['names'] {
    return first === 'all' || second === 'all' ? 'all' : [...first, ...second];
}

// skips type-only imports. typescript removes them before the code runs
export function importedNames(code: string, file: string): Map<string, BotImport['names']> {
    const { module, program } = parseSync(file, code);
    const names = new Map<string, BotImport['names']>();
    const read = (source: string, entries: readonly Entry[]): void => {
        const values = entries.filter((entry) => !entry.isType).map(exportName);
        names.set(source, mergeNames(names.get(source) ?? [], values.every(isNotNil) ? values : 'all'));
    };

    for (const { moduleRequest, entries } of module.staticImports) read(moduleRequest.value, entries);
    for (const { entries } of module.staticExports) {
        for (const entry of entries) if (entry.moduleRequest) read(entry.moduleRequest.value, [entry]);
    }
    // 'all' because the parser can't tell which exports the bot reads from what import() returns
    new Visitor({
        ImportExpression: ({ source }) => {
            const path = fixedPath(source);
            if (path !== undefined) names.set(path, 'all');
        }
    }).visit(program);
    return names;
}
