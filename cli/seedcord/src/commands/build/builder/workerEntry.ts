import { BAKED_IDS_KEY } from '@seedcord/core/internal';

import { builtFilesSource } from './builtFiles';

import type { ModuleLoader } from '#core/modules/ModuleLoader';
import type { ProjectFiles } from '#core/project/ProjectFiles';
import type { BakedIds } from '@seedcord/core/internal';
import type { Plugin } from 'vite';

export const WORKER_ENTRY_ID = 'virtual:seedcord/worker';
const BIND_ENV_ID = 'virtual:seedcord/bind-env';
const BUILT_FILES_ID = 'virtual:seedcord/built-files';
const BAKED_IDS_ID = 'virtual:seedcord/baked-ids';

// workerd has no filesystem behind this path
const WORKER_ROOT = '/bot';

// envapt's workerd build throws on a read until something binds a source
const BIND_ENV = `import { env } from 'cloudflare:workers';
import { Envapter, PortableSource } from 'envapt';
Envapter.useSource(new PortableSource(env));
`;

// seedcord dev runs the source files from root and reads Discord at startup
type EntryMode = { kind: 'build'; ids: BakedIds } | { kind: 'dev'; root: string };

interface WorkerEntryOptions {
    files: ProjectFiles;
    folders: string[];
    instanceKey: string;
    rootKey: string;
    functionExports: () => Promise<string[]>;
    mode: EntryMode;
}

// workerd loads a worker only when each named export is a function or a handler object
export async function functionExportsOf(modules: ModuleLoader, instance: string): Promise<string[]> {
    const module = await modules.importModule<Record<string, unknown>>(instance);
    return Object.entries(module).reduce<string[]>((names, [name, value]) => {
        if (name !== 'default' && typeof value === 'function') names.push(name);
        return names;
    }, []);
}

// an object literal would turn a "__proto__" key into the prototype
function bakedIdsSource(ids: BakedIds): string {
    const json = JSON.stringify(JSON.stringify(ids));
    return `globalThis[Symbol.for(${JSON.stringify(BAKED_IDS_KEY)})] = JSON.parse(${json});\n`;
}

function setupSources({ files, folders, rootKey, mode }: WorkerEntryOptions): Map<string, string> {
    const isDev = mode.kind === 'dev';
    const rootExpression = JSON.stringify(isDev ? mode.root : WORKER_ROOT);
    const modules = new Map([
        [BIND_ENV_ID, BIND_ENV],
        [BUILT_FILES_ID, builtFilesSource({ files, folders, rootExpression, rootKey, sourcePaths: isDev })]
    ]);
    if (!isDev) modules.set(BAKED_IDS_ID, bakedIdsSource(mode.ids));
    return modules;
}

async function entrySource({ instanceKey, functionExports, mode }: WorkerEntryOptions): Promise<string> {
    const instance = JSON.stringify(instanceKey);
    const lines = [
        // the instance file may read env while it loads
        `import '${BIND_ENV_ID}';`,
        `import '${BUILT_FILES_ID}';`,
        ...(mode.kind === 'build' ? [`import '${BAKED_IDS_ID}';`] : []),
        `export { default } from ${instance};`
    ];
    // cloudflare reads durable object and workflow classes from the worker's named exports
    const named = await functionExports();
    if (named.length > 0) lines.push(`export { ${named.join(', ')} } from ${instance};`);
    return [...lines, ''].join('\n');
}

export function workerEntry(options: WorkerEntryOptions): Plugin {
    const modules = setupSources(options);
    return {
        name: WORKER_ENTRY_ID,
        resolveId: (id) => (id === WORKER_ENTRY_ID || modules.has(id) ? `\0${id}` : undefined),
        load: (id) => {
            if (id === `\0${WORKER_ENTRY_ID}`) return entrySource(options);
            return id.startsWith('\0') ? modules.get(id.slice(1)) : undefined;
        }
    };
}
