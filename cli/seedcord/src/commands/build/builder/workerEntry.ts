import { builtFilesSource } from './builtFiles';

import type { ProjectFiles } from '#core/project/ProjectFiles';
import type { Plugin } from 'vite';

export const WORKER_ENTRY_ID = 'virtual:seedcord/worker';
const BIND_ENV_ID = 'virtual:seedcord/bind-env';
const BUILT_FILES_ID = 'virtual:seedcord/built-files';

// workerd has no filesystem behind this path
const WORKER_ROOT = '/bot';

// envapt's workerd build throws on a read until something binds a source
const BIND_ENV = `import { env } from 'cloudflare:workers';
import { Envapter, PortableSource } from 'envapt';
Envapter.useSource(new PortableSource(env));
`;

interface WorkerEntryOptions {
    files: ProjectFiles;
    folders: string[];
    // instance and base as vite sees them, like /src/bot.ts and /src
    instance: string;
    base: string;
}

function sources({ files, folders, instance, base }: WorkerEntryOptions): Map<string, string> {
    return new Map([
        [
            WORKER_ENTRY_ID,
            [
                // a module's imports run before its own code, in the order written
                `import '${BIND_ENV_ID}';`,
                `import '${BUILT_FILES_ID}';`,
                `export { default } from ${JSON.stringify(instance)};`,
                // cloudflare reads durable object and workflow classes from the worker's named exports
                `export * from ${JSON.stringify(instance)};`,
                ''
            ].join('\n')
        ],
        [BIND_ENV_ID, BIND_ENV],
        [BUILT_FILES_ID, builtFilesSource({ files, folders, rootExpression: JSON.stringify(WORKER_ROOT), base })]
    ]);
}

export function workerEntry(options: WorkerEntryOptions): Plugin {
    const modules = sources(options);
    return {
        name: WORKER_ENTRY_ID,
        resolveId: (id) => (modules.has(id) ? `\0${id}` : undefined),
        load: (id) => (id.startsWith('\0') ? modules.get(id.slice(1)) : undefined)
    };
}
