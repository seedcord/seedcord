import { BAKED_IDS_KEY } from '@seedcord/core/internal';
import { assertNever } from '@seedcord/utils';
import { workerdPath } from '@seedcord/utils/internal';

import { builtFilesSource, loadListedFiles, PLACEHOLDER_ROOT } from './builtFiles';

import type { EntryPlugins } from './builtFiles';
import type { PluginConfig } from '@cloudflare/vite-plugin';
import type { BakedIds } from '@seedcord/core/internal';
import type { BotLayout } from '@seedcord/utils/internal';
import type { Plugin } from 'vite';

const WORKER_ENTRY_ID = 'virtual:seedcord/worker';

type EntryCustomizer = NonNullable<PluginConfig['config']>;

// the fields this returns replace the ones in cloudflare.config.ts
export const workerEntryConfig: EntryCustomizer = () => ({ entrypoint: WORKER_ENTRY_ID });

const BIND_ENV_ID = 'virtual:seedcord/bind-env';
const BUILT_FILES_ID = 'virtual:seedcord/built-files';
const BAKED_IDS_ID = 'virtual:seedcord/baked-ids';

// envapt's workerd build throws on a read until something binds a source
const BIND_ENV = `import { env } from 'cloudflare:workers';
import { Envapter, PortableSource } from 'envapt';
Envapter.useSource(new PortableSource(env));
`;

const CWD_ID = 'virtual:seedcord/cwd';

// workerd returns /bundle from process.cwd(). paint.path and the file loaders print paths relative to it
function cwdSource(cwd: string): string {
    return `process.cwd = () => ${JSON.stringify(cwd)};\n`;
}

// a dev worker reads its ids from Discord at startup. a build bakes them in
type EntryMode = { kind: 'build'; ids: BakedIds } | { kind: 'dev'; root: string; cwd: string };

interface WorkerEntryOptions {
    layout: BotLayout;
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
    cwd: string;
    sourcePaths: boolean;
    modules: [id: string, source: string][];
}

function modeSetup(mode: EntryMode): ModeSetup {
    switch (mode.kind) {
        case 'dev': {
            return { root: workerdPath(mode.root), cwd: workerdPath(mode.cwd), sourcePaths: true, modules: [] };
        }
        case 'build': {
            return {
                root: PLACEHOLDER_ROOT,
                cwd: PLACEHOLDER_ROOT,
                sourcePaths: false,
                modules: [[BAKED_IDS_ID, bakedIdsSource(mode.ids)]]
            };
        }
        default: {
            return assertNever(mode);
        }
    }
}

// the entry imports these in order, ahead of the instance file
function setupSources({ layout, folders, rootKey, mode }: WorkerEntryOptions): Map<string, string> {
    const { root, cwd, sourcePaths, modules } = modeSetup(mode);
    const rootExpression = JSON.stringify(root);
    return new Map([
        [CWD_ID, cwdSource(cwd)],
        ...modules,
        // the instance file may read env while it loads
        [BIND_ENV_ID, BIND_ENV],
        [BUILT_FILES_ID, builtFilesSource({ layout, folders, rootExpression, rootKey, sourcePaths })]
    ]);
}

const INSTANCE_MODULE_KEY = 'seedcord:cli:instance-module';

// after a save to bot.ts or a file it imports, cloudflare evaluates this entry again on the next request.
// a second new Seedcord would throw. the bot that started keeps answering until the restart
function keptInstanceExports(instance: string, named: string[]): string[] {
    const lines = [
        `const instanceModule = (globalThis[Symbol.for(${JSON.stringify(INSTANCE_MODULE_KEY)})] ??= await import(${instance}));`,
        'export default instanceModule.default;'
    ];
    if (named.length > 0) lines.push(`export const { ${named.join(', ')} } = instanceModule;`);
    return lines;
}

function instanceExports(instance: string, named: string[]): string[] {
    const lines = [`export { default } from ${instance};`];
    if (named.length > 0) lines.push(`export { ${named.join(', ')} } from ${instance};`);
    return lines;
}

async function entrySource(
    { instanceKey, functionExports, mode }: WorkerEntryOptions,
    setup: Map<string, string>
): Promise<string> {
    const lines = [...setup.keys()].map((id) => `import '${id}';`);
    const exportsFrom = mode.kind === 'dev' ? keptInstanceExports : instanceExports;
    // cloudflare reads durable object and workflow classes from the worker's named exports
    lines.push(...exportsFrom(JSON.stringify(instanceKey), await functionExports()));
    return [...lines, ''].join('\n');
}

export function workerEntry(options: WorkerEntryOptions): EntryPlugins {
    const setup = setupSources(options);
    const entry: Plugin = {
        name: WORKER_ENTRY_ID,
        resolveId: (id) => (id === WORKER_ENTRY_ID || setup.has(id) ? `\0${id}` : undefined),
        load: (id) => {
            if (id === `\0${WORKER_ENTRY_ID}`) return entrySource(options, setup);
            return id.startsWith('\0') ? setup.get(id.slice(1)) : undefined;
        }
    };
    return [entry, loadListedFiles()];
}
