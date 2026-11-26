import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { flatMapAsync, uniq } from 'es-toolkit';
import { normalizePath } from 'vite';

import { importedNames, mergeNames } from './importedNames';

import type { BotImport } from '@seedcord/types/internal';
import type { DevEnvironment, EnvironmentModuleGraph } from 'vite';

export class BotImports {
    constructor(private readonly instance: string) {}

    // a ?raw module isn't the file's code
    public files(graph: EnvironmentModuleGraph): string[] {
        const botModules = graph.getModulesByFile(normalizePath(this.instance)) ?? [];
        const files = [...botModules].flatMap((mod) =>
            [...mod.importedModules].flatMap(({ id, file }) =>
                // node_modules files would load a second copy of their packages
                file !== null && id === file && !file.includes('/node_modules/') ? [resolve(file)] : []
            )
        );
        return uniq(files);
    }

    public among(graph: EnvironmentModuleGraph, files: readonly string[]): string[] {
        const imports = new Set(this.files(graph));
        return files.filter((file) => imports.has(file));
    }

    public async names(environment: DevEnvironment): Promise<BotImport[]> {
        const { instance } = this;
        const imported = new Set(this.files(environment.moduleGraph));
        const read = importedNames(await readFile(instance, 'utf8'), instance);
        const found = await flatMapAsync([...read], async ([source, names]) => {
            const resolvedId = await environment.pluginContainer.resolveId(source, instance);
            const file = resolvedId ? resolve(resolvedId.id) : undefined;
            return file !== undefined && imported.has(file) ? [{ file, names }] : [];
        });
        // './plugin' and './plugin.ts' are two sources for one file for example
        const byFile = new Map<string, BotImport['names']>();
        for (const { file, names } of found) byFile.set(file, mergeNames(byFile.get(file) ?? [], names));
        return [...byFile].map(([file, names]) => ({ file, names }));
    }
}
