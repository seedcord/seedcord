import { BAKED_IDS_KEY } from '@seedcord/core/internal';
import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';
import { assertNever } from '@seedcord/utils';

import { builtFilesSource } from './builtFiles';

import type { CloudflarePlugin } from '#core/modules/cloudflarePlugin';
import type { ProjectFiles } from '#core/project/ProjectFiles';
import type { BakedIds } from '@seedcord/core/internal';
import type { Plugin } from 'vite';

export const WORKER_ENTRY_ID = 'virtual:seedcord/worker';

type EntryCustomizer = NonNullable<NonNullable<Parameters<CloudflarePlugin>[0]>['config']>;

// the plugin passes cloudflare.config.ts parsed. the fields this returns replace the file's
export function workerEntryConfig(cloudflareConfig: string): EntryCustomizer {
    return ({ entrypoint }) => {
        if (entrypoint !== undefined) {
            const why = `seedcord sets it to the default export of ${paint.bold('instance')} in your seedcord config.`;
            throw new SeedcordTypeError(SeedcordErrorCode.CliConfigFieldUnused, ['entrypoint', cloudflareConfig, why]);
        }
        return { entrypoint: WORKER_ENTRY_ID };
    };
}

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

const DEV_CWD_ID = 'virtual:seedcord/dev-cwd';

// workerd returns /bundle from process.cwd(). paint.path prints paths relative to it
function devCwdSource(cwd: string): string {
    return `process.cwd = () => ${JSON.stringify(cwd)};\n`;
}

// a dev worker reads its ids from Discord at startup. a build bakes them in
type EntryMode = { kind: 'build'; ids: BakedIds } | { kind: 'dev'; root: string; cwd: string };

interface WorkerEntryOptions {
    files: ProjectFiles;
    folders: string[];
    instanceKey: string;
    rootKey: string;
    functionExports: () => Promise<string[]>;
    mode: EntryMode;
}

// an object literal would turn a "__proto__" key into the prototype
function bakedIdsSource(ids: BakedIds): string {
    const json = JSON.stringify(JSON.stringify(ids));
    return `globalThis[Symbol.for(${JSON.stringify(BAKED_IDS_KEY)})] = JSON.parse(${json});\n`;
}

interface ModeSetup {
    root: string;
    sourcePaths: boolean;
    module: [id: string, source: string];
}

function modeSetup(mode: EntryMode): ModeSetup {
    switch (mode.kind) {
        case 'dev': {
            return { root: mode.root, sourcePaths: true, module: [DEV_CWD_ID, devCwdSource(mode.cwd)] };
        }
        case 'build': {
            return { root: WORKER_ROOT, sourcePaths: false, module: [BAKED_IDS_ID, bakedIdsSource(mode.ids)] };
        }
        default: {
            return assertNever(mode);
        }
    }
}

// the entry imports these in order, ahead of the instance file
function setupSources({ files, folders, rootKey, mode }: WorkerEntryOptions): Map<string, string> {
    const { root, sourcePaths, module } = modeSetup(mode);
    const rootExpression = JSON.stringify(root);
    return new Map([
        module,
        // the instance file may read env while it loads
        [BIND_ENV_ID, BIND_ENV],
        [BUILT_FILES_ID, builtFilesSource({ files, folders, rootExpression, rootKey, sourcePaths })]
    ]);
}

async function entrySource(
    { instanceKey, functionExports }: WorkerEntryOptions,
    setup: Map<string, string>
): Promise<string> {
    const instance = JSON.stringify(instanceKey);
    const lines = [...setup.keys()].map((id) => `import '${id}';`);
    lines.push(`export { default } from ${instance};`);
    // cloudflare reads durable object and workflow classes from the worker's named exports
    const named = await functionExports();
    if (named.length > 0) lines.push(`export { ${named.join(', ')} } from ${instance};`);
    return [...lines, ''].join('\n');
}

export function workerEntry(options: WorkerEntryOptions): Plugin {
    const setup = setupSources(options);
    return {
        name: WORKER_ENTRY_ID,
        resolveId: (id) => (id === WORKER_ENTRY_ID || setup.has(id) ? `\0${id}` : undefined),
        load: (id) => {
            if (id === `\0${WORKER_ENTRY_ID}`) return entrySource(options, setup);
            return id.startsWith('\0') ? setup.get(id.slice(1)) : undefined;
        }
    };
}
