import { isNotNil } from 'es-toolkit';
import { parseSync } from 'vite';

import type { BotImport } from '@seedcord/types/internal';

type ModuleRecord = ReturnType<typeof parseSync>['module'];
type Entry =
    | ModuleRecord['staticImports'][number]['entries'][number]
    | ModuleRecord['staticExports'][number]['entries'][number];

// undefined for a namespace import, export *, or export * as. those read every export
function exportName({ importName }: Entry): string | null | undefined {
    if (importName.kind === 'Default') return 'default';
    return importName.kind === 'Name' ? importName.name : undefined;
}

// skips type-only imports. typescript removes them before the code runs
export function importedNames(code: string, file: string): Map<string, BotImport['names']> {
    const { module } = parseSync(file, code);
    const names = new Map<string, BotImport['names']>();
    const read = (source: string, entries: readonly Entry[]): void => {
        const values = entries.filter((entry) => !entry.isType).map(exportName);
        const before = names.get(source) ?? [];
        names.set(source, before !== 'all' && values.every(isNotNil) ? [...before, ...values] : 'all');
    };

    for (const { moduleRequest, entries } of module.staticImports) read(moduleRequest.value, entries);
    for (const { entries } of module.staticExports) {
        for (const entry of entries) if (entry.moduleRequest) read(entry.moduleRequest.value, [entry]);
    }
    return names;
}
