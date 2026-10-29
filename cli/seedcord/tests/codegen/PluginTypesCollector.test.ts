import { realpathSync } from 'node:fs';
import { mkdir, mkdtempDisposable, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { stripVTControlCharacters } from 'node:util';

import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { HostPluginKeys } from '@seedcord/types/internal';
import { toPosixPath } from '@seedcord/utils/internal';
import { assert, describe, expect, it } from 'vitest';

import { PluginTypesCollector } from '#commands/codegen/PluginTypesCollector';

import type { EvaluatedModule, ModuleLoader } from '#core/modules/ModuleLoader';
import type { SeedcordInstance } from '@seedcord/types/internal';

const ROOT = resolve('/bot/src');

class Users {
    public readonly table = 'users';
}

interface GrowingLoader {
    readonly modules: Pick<ModuleLoader, 'evaluated' | 'importPackage'>;
    readonly load: (file: string, exports: object, imports?: readonly string[]) => void;
    readonly publish: (name: string, exports: Record<string, unknown>) => void;
}

// a loader whose module list grows as codegen() imports files, like Vite's runner
function growingLoader(): GrowingLoader {
    const evaluated: EvaluatedModule[] = [];
    const packages = new Map<string, Record<string, unknown>>();
    return {
        modules: {
            evaluated: () => evaluated,
            importPackage: (name) => Promise.resolve(packages.get(name) ?? {})
        },
        // vite's runner stores forward slashes on windows too
        load: (file, exports, imports = []) => {
            const posix = toPosixPath(file);
            const posixImports = imports.map(toPosixPath);
            evaluated.push({ id: posix, file: posix, exports: { ...exports }, imports: new Set(posixImports) });
        },
        publish: (name, exports) => {
            packages.set(name, exports);
        }
    };
}

function botWith(plugins: Record<string, object>): SeedcordInstance {
    // justified: the collector reads only the plugin keys and the plugins they point at
    return { [HostPluginKeys]: Object.keys(plugins), ...plugins } as unknown as SeedcordInstance;
}

describe('PluginTypesCollector', () => {
    it('points at the file that defines a class codegen() loaded, past a barrel that re-exports it', async () => {
        const { modules, load } = growingLoader();
        const defining = join(ROOT, "tony's/Users.ts");
        const jobs = { run: (): void => undefined };
        class Services {
            public static readonly id = 'services';
            public codegen(): Promise<unknown> {
                load(join(ROOT, "tony's/All.ts"), { Users }, [defining]);
                load(defining, { Users, jobs });
                return Promise.resolve({ services: { users: Users }, labels: ['a', 1, true, null], jobs });
            }
        }

        const types = await PluginTypesCollector.collect(botWith({ db: new Services() }), modules, ROOT);

        expect(types.get('services')).toEqual([
            {
                key: 'db',
                type: String.raw`{ jobs: (typeof import('./tony\'s/Users'))['jobs']; labels: ['a', 1, true, null]; services: { users: (typeof import('./tony\'s/Users'))['Users'] } }`
            }
        ]);
    });

    it("writes a value from the plugin's own package as an import of the package name", async () => {
        await using dir = await mkdtempDisposable(join(tmpdir(), 'codegen-package-'));
        const pkgDir = realpathSync(dir.path);
        await mkdir(join(pkgDir, 'dist'));
        await writeFile(join(pkgDir, 'package.json'), JSON.stringify({ name: 'plugin-x' }));

        const { modules, load, publish } = growingLoader();
        class Health {
            public readonly path = '/health';
        }
        class Installed {
            public static readonly id = 'plugin-x';
            public codegen(): Promise<unknown> {
                return Promise.resolve({ services: { health: Health } });
            }
        }
        // a chunk defines the class. only the package's entry exports Health
        load(join(pkgDir, 'dist/chunk.mjs'), { Installed });
        publish('plugin-x', { Installed, Health });

        const types = await PluginTypesCollector.collect(botWith({ x: new Installed() }), modules, ROOT);

        expect(types.get('plugin-x')).toEqual([
            { key: 'x', type: "{ services: { health: (typeof import('plugin-x'))['Health'] } }" }
        ]);
    });

    it('reports every problem from every plugin in one aggregate', async () => {
        const { modules } = growingLoader();
        class Bad {
            public static readonly id = 'bad';
            public codegen(): Promise<unknown> {
                // justified: Object.create(null) always returns an object
                const bare: unknown = Object.create(Object.create(null) as object);
                const loop: Record<string, unknown> = {};
                loop.self = loop;
                const holes: unknown[] = [];
                holes[1] = 3;
                return Promise.resolve({ when: new Date(0), fn: () => 1, n: Number.NaN, big: 1n, bare, loop, holes });
            }
        }
        class Throws {
            public static readonly id = 'throws';
            public codegen(): Promise<unknown> {
                return Promise.reject(new Error('the folder is missing'));
            }
        }
        class NoId {
            public codegen(): Promise<unknown> {
                return Promise.resolve({});
            }
        }

        const bot = botWith({ bad: new Bad(), throws: new Throws(), noId: new NoId() });
        const caught: unknown = await PluginTypesCollector.collect(bot, modules, ROOT).catch((error: unknown) => error);

        assert(isSeedcordError(caught, 'SeedcordAggregateError', SeedcordErrorCode.CliProblems));
        expect(caught.errors.map((error) => (isSeedcordError(error) ? error.code : undefined))).toEqual([
            SeedcordErrorCode.CliPluginCodegenThrew,
            SeedcordErrorCode.CliPluginCodegenNoId,
            SeedcordErrorCode.CliPluginCodegenValue,
            SeedcordErrorCode.CliPluginCodegenValue,
            SeedcordErrorCode.CliPluginCodegenValue,
            SeedcordErrorCode.CliPluginCodegenValue,
            SeedcordErrorCode.CliPluginCodegenValue,
            SeedcordErrorCode.CliPluginCodegenValue,
            SeedcordErrorCode.CliPluginCodegenValue
        ]);
        const messages = caught.errors.map((error) =>
            isSeedcordError(error) ? stripVTControlCharacters(error.message) : undefined
        );
        expect(messages).toContainEqual(expect.stringContaining('returned a Date at when.'));
    });

    it('keeps each attachment of one class and reports a key where they disagree', async () => {
        const { modules } = growingLoader();
        class Cron {
            public static readonly id = 'cron';
            public constructor(private readonly tasks: Record<string, unknown>) {}
            public codegen(): Promise<unknown> {
                return Promise.resolve({ tasks: this.tasks });
            }
        }

        const both = await PluginTypesCollector.collect(
            botWith({
                cron: new Cron({ constructor: 'nightly', steps: [{ run: 'send' }] }),
                admin: new Cron({ digest: 'daily', steps: [{ run: 'send' }] })
            }),
            modules,
            ROOT
        );
        const clash = PluginTypesCollector.collect(
            botWith({ cron: new Cron({ digest: 'daily' }), admin: new Cron({ digest: 'hourly' }) }),
            modules,
            ROOT
        );

        expect(both.get('cron')).toEqual([
            { key: 'cron', type: "{ tasks: { constructor: 'nightly'; steps: [{ run: 'send' }] } }" },
            { key: 'admin', type: "{ tasks: { digest: 'daily'; steps: [{ run: 'send' }] } }" }
        ]);
        await expect(clash).rejects.toMatchObject({ code: SeedcordErrorCode.CliPluginCodegenConflict });

        const loop = (): Record<string, unknown> => {
            const tasks: Record<string, unknown> = {};
            tasks.self = tasks;
            return tasks;
        };
        const cycles = PluginTypesCollector.collect(
            botWith({ cron: new Cron(loop()), admin: new Cron(loop()) }),
            modules,
            ROOT
        );
        await expect(cycles).rejects.toMatchObject({
            code: SeedcordErrorCode.CliProblems,
            errors: [
                { code: SeedcordErrorCode.CliPluginCodegenValue },
                { code: SeedcordErrorCode.CliPluginCodegenValue }
            ]
        });
    });

    it('reads a plugin attached inside a group', async () => {
        const { modules } = growingLoader();
        class Grouped {
            public static readonly id = 'grouped';
            public codegen(): Promise<unknown> {
                return Promise.resolve({ ready: true });
            }
        }
        // justified: the collector reads only the plugin keys and the plugins they point at
        const bot = {
            [HostPluginKeys]: ['services.users'],
            services: { users: new Grouped() }
        } as unknown as SeedcordInstance;

        const types = await PluginTypesCollector.collect(bot, modules, ROOT);

        expect(types.get('grouped')).toEqual([{ key: 'services.users', type: '{ ready: true }' }]);
    });

    it('reports two classes that share an id', async () => {
        const { modules } = growingLoader();
        const plugin = (id: string): object =>
            new (class {
                public static readonly id = id;
                public codegen(): Promise<unknown> {
                    return Promise.resolve({});
                }
            })();

        const run = PluginTypesCollector.collect(botWith({ a: plugin('same'), b: plugin('same') }), modules, ROOT);

        await expect(run).rejects.toMatchObject({ code: SeedcordErrorCode.CoreDuplicateName });
    });
});
