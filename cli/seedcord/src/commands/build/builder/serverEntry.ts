import { builtFilesSource, PLACEHOLDER_ROOT } from './builtFiles';

import type { TypedOmit } from '@seedcord/types';
import type { Plugin } from 'vite';

export const ENTRY_ID = 'seedcord:entry';
const RESOLVED_ENTRY_ID = `\0${ENTRY_ID}`;

// undefined once next.js bundles the entry
const ROOT_EXPRESSION = `import.meta.dirname ?? ${JSON.stringify(PLACEHOLDER_ROOT)}`;

type EntryBuiltFiles = TypedOmit<Parameters<typeof builtFilesSource>[0], 'rootExpression' | 'sourcePaths'>;

export function isServerEntry(moduleId: string | null | undefined): boolean {
    return moduleId === RESOLVED_ENTRY_ID;
}

// these two use await import because static imports run before the code that registers the built files
export function runStartFile(startKey: string): string[] {
    return [`await import(${JSON.stringify(startKey)});`];
}

export function exportInstance(instanceKey: string): string[] {
    return [`const { default: bot } = await import(${JSON.stringify(instanceKey)});`, 'export default bot;'];
}

export function serverEntry(builtFiles: EntryBuiltFiles, importBot: string[]): Plugin {
    const registerFiles = builtFilesSource({ ...builtFiles, rootExpression: ROOT_EXPRESSION, sourcePaths: false });
    const source = [registerFiles, ...importBot, ''].join('\n');
    return {
        name: ENTRY_ID,
        resolveId: (id) => (id === ENTRY_ID ? RESOLVED_ENTRY_ID : undefined),
        load: (id) => (id === RESOLVED_ENTRY_ID ? source : undefined)
    };
}
