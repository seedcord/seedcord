import { EventEmitter } from 'node:events';
import { join } from 'node:path';

import { type Mock, beforeEach, describe, expect, it, vi } from 'vitest';

import { HmrPlugin } from '#commands/dev/runtime/HmrPlugin';

import type { DevEvent } from '#commands/dev/runtime/events';
import type { HmrUpdateEvent } from '@seedcord/types';
import type { EnvironmentModuleNode, HotUpdateOptions, ViteDevServer } from 'vite';

const HMR_EVENT_NAME = 'seedcord:hmr';

function watcherMock(): EventEmitter & { add: Mock } {
    return Object.assign(new EventEmitter(), { add: vi.fn() });
}

const loggerSpies = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn()
};

vi.mock('@seedcord/logger', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@seedcord/logger')>()),
    Logger: class {
        public info = loggerSpies.info;
        public warn = loggerSpies.warn;
        public error = loggerSpies.error;
        public debug = loggerSpies.debug;
        public trace = loggerSpies.trace;
    }
}));

vi.mock('@seedcord/event-emitter', () => ({
    TypedEventEmitter: EventEmitter
}));

describe('HmrPlugin', () => {
    let hmrPlugin: HmrPlugin;
    const mockConfig = {
        root: '/test/root',
        configFile: 'seedcord.config.ts',
        entry: 'src/index.ts',
        instance: 'src/Seedcord.ts',
        typecheck: { enabled: false } as const,
        idleAnimation: true,
        tunnel: { mode: 'quick' } as const,
        build: {
            outDir: 'dist',
            bootstrap: 'bootstrap.js'
        }
    };

    beforeEach(() => {
        vi.clearAllMocks();
        hmrPlugin = new HmrPlugin(mockConfig);
    });

    it('carries the config rollback flag onto the hmr payload', async () => {
        const plugin = new HmrPlugin({ ...mockConfig, hmr: { rollback: false } });
        const hotSend = vi.fn();
        // justified: spy on the private `hot` getter
        const hotHost = plugin as unknown as { hot: { send: typeof hotSend; on: ReturnType<typeof vi.fn> } };
        vi.spyOn(hotHost, 'hot', 'get').mockReturnValue({ send: hotSend, on: vi.fn() });

        const file = join(process.cwd(), 'src/commands/ping.ts');
        await (plugin.plugin.hotUpdate as (ctx: HotUpdateOptions) => Promise<void>)({
            type: 'create',
            file,
            server: {
                moduleGraph: { getModulesByFile: vi.fn(), invalidateModule: vi.fn() }
            } as unknown as ViteDevServer,
            modules: [],
            timestamp: Date.now(),
            read: vi.fn()
        });

        expect(hotSend).toHaveBeenCalledWith(HMR_EVENT_NAME, expect.objectContaining({ file, rollback: false }));
    });

    it('asks for a restart when the config file above the vite root changes', () => {
        const configFile = join(process.cwd(), 'seedcord.config.ts');
        const plugin = new HmrPlugin({ ...mockConfig, root: join(process.cwd(), 'src'), configFile });
        // justified: spy on the private `hot` getter
        const hotHost = plugin as unknown as { hot: { send: Mock; on: Mock } };
        vi.spyOn(hotHost, 'hot', 'get').mockReturnValue({ send: vi.fn(), on: vi.fn() });

        const events: DevEvent[] = [];
        plugin.on('event', (event: DevEvent) => events.push(event));

        const watcher = watcherMock();
        const server = {
            watcher,
            environments: { ssr: { hot: { send: vi.fn(), on: vi.fn() } } }
        } as unknown as ViteDevServer;
        (plugin.plugin.configureServer as (s: ViteDevServer) => void)(server);

        watcher.emit('change', configFile);

        expect(events).toContainEqual({ type: 'restart-required' });
    });

    it('relays the bound port the framework reports', () => {
        const plugin = new HmrPlugin(mockConfig);
        const listeners = new Map<string, (data: unknown) => void>();
        // justified: spy on the private `hot` getter
        const hotHost = plugin as unknown as { hot: { send: Mock; on: Mock } };
        vi.spyOn(hotHost, 'hot', 'get').mockReturnValue({
            send: vi.fn(),
            on: vi.fn((event: string, cb: (data: unknown) => void) => listeners.set(event, cb))
        });

        const events: DevEvent[] = [];
        plugin.on('event', (event: DevEvent) => events.push(event));

        const server = {
            watcher: watcherMock(),
            environments: { ssr: { hot: { send: vi.fn(), on: vi.fn() } } }
        } as unknown as ViteDevServer;
        (plugin.plugin.configureServer as (s: ViteDevServer) => void)(server);

        listeners.get('seedcord:server-listening')?.({ port: 4000 });

        expect(events).toContainEqual({ type: 'server-listening', port: 4000 });
    });

    describe('configureServer (File Events)', () => {
        let serverMock: ViteDevServer;
        let watcher: EventEmitter;
        let hotSendMock: Mock;

        beforeEach(() => {
            watcher = watcherMock();
            hotSendMock = vi.fn();

            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- spy on the private `hot` getter
            vi.spyOn(hmrPlugin as any, 'hot', 'get').mockReturnValue({
                send: hotSendMock,
                on: vi.fn()
            });

            serverMock = {
                watcher,
                environments: {
                    ssr: {
                        hot: {
                            send: vi.fn(),
                            on: vi.fn()
                        }
                    }
                },
                hot: {
                    send: vi.fn(),
                    on: vi.fn()
                }
            } as unknown as ViteDevServer;

            const plugin = hmrPlugin.plugin;
            if (typeof plugin.configureServer === 'function') {
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- Vite types configureServer with a `this` context, which blocks a direct call
                (plugin.configureServer as (server: ViteDevServer) => void)(serverMock);
            }
        });

        it('sends a save that lands right after a create', async () => {
            const file = join(process.cwd(), 'src/commands/ping.ts');
            const ctx = (type: HotUpdateOptions['type']): HotUpdateOptions => ({
                type,
                file,
                server: {
                    ...serverMock,
                    moduleGraph: { getModulesByFile: vi.fn(), invalidateModule: vi.fn() }
                } as unknown as ViteDevServer,
                modules: [],
                timestamp: Date.now(),
                read: vi.fn()
            });

            await (hmrPlugin.plugin.hotUpdate as (ctx: HotUpdateOptions) => Promise<void>)(ctx('create'));
            await (hmrPlugin.plugin.hotUpdate as (ctx: HotUpdateOptions) => Promise<void>)(ctx('update'));

            expect(hotSendMock).toHaveBeenLastCalledWith(
                HMR_EVENT_NAME,
                expect.objectContaining({ file, type: 'update' })
            );
        });

        it('sends one delete carrying the importers of the deleted file', async () => {
            const file = join(process.cwd(), 'src/components/Button.ts');
            const importerFile = join(process.cwd(), 'src/commands/Click.ts');
            const importerNode = { file: importerFile, importers: new Set() } as unknown as EnvironmentModuleNode;
            const fileNode = { file, importers: new Set([importerNode]) } as unknown as EnvironmentModuleNode;

            // vite emits unlink on the watcher, then calls hotUpdate with type delete
            watcher.emit('unlink', file);
            await (hmrPlugin.plugin.hotUpdate as (ctx: HotUpdateOptions) => Promise<void>)({
                type: 'delete',
                file,
                server: {
                    ...serverMock,
                    moduleGraph: { getModulesByFile: vi.fn(), invalidateModule: vi.fn() }
                } as unknown as ViteDevServer,
                modules: [fileNode],
                timestamp: Date.now(),
                read: vi.fn()
            });

            expect(hotSendMock.mock.calls).toEqual([
                [HMR_EVENT_NAME, { file, type: 'delete', affectedModules: [file, importerFile], rollback: true }]
            ]);
        });

        it('sends one create for a new file', async () => {
            const file = join(process.cwd(), 'src/commands/ping.ts');
            const ctx: HotUpdateOptions = {
                type: 'create',
                file,
                server: {
                    ...serverMock,
                    moduleGraph: { getModulesByFile: vi.fn(), invalidateModule: vi.fn() }
                } as unknown as ViteDevServer,
                modules: [],
                timestamp: Date.now(),
                read: vi.fn()
            };

            // vite emits add on the watcher, then calls hotUpdate once for the client and once for ssr
            watcher.emit('add', file);
            await (hmrPlugin.plugin.hotUpdate as (ctx: HotUpdateOptions) => Promise<void>)(ctx);
            await (hmrPlugin.plugin.hotUpdate as (ctx: HotUpdateOptions) => Promise<void>)(ctx);

            expect(hotSendMock.mock.calls).toEqual([
                [HMR_EVENT_NAME, { file, type: 'create', affectedModules: [], rollback: true }]
            ]);
        });

        it('should handle "addDir" event as "createDir"', () => {
            const file = join(process.cwd(), 'src/commands/group');
            watcher.emit('addDir', file);

            expect(loggerSpies.trace).toHaveBeenCalledWith(expect.stringContaining('CREATEDIR'));
            expect(hotSendMock).toHaveBeenCalledWith(HMR_EVENT_NAME, {
                file,
                type: 'createDir',
                rollback: true
            });
        });

        it('should handle "unlinkDir" event as "deleteDir"', () => {
            const file = join(process.cwd(), 'src/commands/group');
            watcher.emit('unlinkDir', file);

            expect(loggerSpies.trace).toHaveBeenCalledWith(expect.stringContaining('DELETEDIR'));
            expect(hotSendMock).toHaveBeenCalledWith(HMR_EVENT_NAME, {
                file,
                type: 'deleteDir',
                rollback: true
            });
        });
    });

    describe('hotUpdate', () => {
        let serverMock: ViteDevServer;
        let hotSendMock: Mock;

        beforeEach(() => {
            hotSendMock = vi.fn();

            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- spy on the private `hot` getter
            vi.spyOn(hmrPlugin as any, 'hot', 'get').mockReturnValue({
                send: hotSendMock,
                on: vi.fn()
            });

            serverMock = {
                environments: {
                    ssr: {
                        hot: {
                            send: vi.fn()
                        }
                    }
                },
                moduleGraph: {
                    getModulesByFile: vi.fn(),
                    invalidateModule: vi.fn()
                }
            } as unknown as ViteDevServer;
        });

        it('should handle update and calculate affected modules', async () => {
            const file = join(process.cwd(), 'src/components/Button.ts');
            const importerFile = join(process.cwd(), 'src/commands/Click.ts');

            const importerNode = {
                file: importerFile,
                importers: new Set(),
                environment: 'client'
            } as unknown as EnvironmentModuleNode;

            const modules = [
                {
                    file,
                    importers: new Set([importerNode]),
                    environment: 'client'
                }
            ] as unknown as EnvironmentModuleNode[];

            const ctx: HotUpdateOptions = {
                type: 'update',
                file,
                server: serverMock,
                modules,
                timestamp: Date.now(),
                read: vi.fn()
            };

            const plugin = hmrPlugin.plugin;
            if (typeof plugin.hotUpdate === 'function') {
                await (plugin.hotUpdate as (ctx: HotUpdateOptions) => Promise<void>)(ctx);
            }

            expect(loggerSpies.trace).toHaveBeenCalledWith(expect.stringContaining('UPDATE'));
            expect(hotSendMock).toHaveBeenCalledWith(HMR_EVENT_NAME, {
                file,
                type: 'update',
                affectedModules: expect.arrayContaining([file, importerFile]) as HmrUpdateEvent['affectedModules'],
                rollback: true
            });
        });

        it('should find modules from moduleGraph if context modules are empty', async () => {
            const file = join(process.cwd(), 'src/components/Button.ts');
            const importerFile = join(process.cwd(), 'src/commands/Click.ts');

            const importerNode = {
                file: importerFile,
                importers: new Set(),
                environment: 'client'
            } as unknown as EnvironmentModuleNode;

            const fileNode = {
                file,
                importers: new Set([importerNode]),
                environment: 'client'
            } as unknown as EnvironmentModuleNode;

            const getModulesByFileMock = vi.fn().mockImplementation((f) => {
                if (f === file) return new Set([fileNode]);
                if (f === importerFile) return new Set([importerNode]);
                return new Set();
            });
            const invalidateModuleMock = vi.fn();

            serverMock.moduleGraph = {
                getModulesByFile: getModulesByFileMock,
                invalidateModule: invalidateModuleMock
            } as unknown as ViteDevServer['moduleGraph'];

            const ctx: HotUpdateOptions = {
                type: 'update',
                file,
                server: serverMock,
                modules: [],
                timestamp: Date.now(),
                read: vi.fn()
            };

            const plugin = hmrPlugin.plugin;
            if (typeof plugin.hotUpdate === 'function') {
                await (plugin.hotUpdate as (ctx: HotUpdateOptions) => Promise<void>)(ctx);
            }

            expect(getModulesByFileMock).toHaveBeenCalledWith(file);
            expect(invalidateModuleMock).toHaveBeenCalledWith(fileNode);
            expect(invalidateModuleMock).toHaveBeenCalledWith(importerNode);
            expect(hotSendMock).toHaveBeenCalledWith(HMR_EVENT_NAME, {
                file,
                type: 'update',
                affectedModules: expect.arrayContaining([file, importerFile]) as HmrUpdateEvent['affectedModules'],
                rollback: true
            });
        });

        it('should debounce rapid updates', async () => {
            const file = join(process.cwd(), 'src/rapid.ts');
            const ctx: HotUpdateOptions = {
                type: 'update',
                file,
                server: serverMock,
                modules: [],
                timestamp: Date.now(),
                read: vi.fn()
            };

            const plugin = hmrPlugin.plugin;
            if (typeof plugin.hotUpdate === 'function') {
                await (plugin.hotUpdate as (ctx: HotUpdateOptions) => Promise<void>)(ctx);
                await (plugin.hotUpdate as (ctx: HotUpdateOptions) => Promise<void>)(ctx);
            }

            expect(loggerSpies.trace).toHaveBeenCalledTimes(1);
            expect(hotSendMock).toHaveBeenCalledTimes(1);
        });

        it('should allow updates after debounce timeout', async () => {
            vi.useFakeTimers();
            const file = join(process.cwd(), 'src/slow.ts');
            const ctx: HotUpdateOptions = {
                type: 'update',
                file,
                server: serverMock,
                modules: [],
                timestamp: Date.now(),
                read: vi.fn()
            };

            const plugin = hmrPlugin.plugin;
            if (typeof plugin.hotUpdate === 'function') {
                await (plugin.hotUpdate as (ctx: HotUpdateOptions) => Promise<void>)(ctx);

                vi.advanceTimersByTime(300); // past the 250ms debounce

                await (plugin.hotUpdate as (ctx: HotUpdateOptions) => Promise<void>)(ctx);
            }

            expect(loggerSpies.trace).toHaveBeenCalledTimes(2);
            expect(hotSendMock).toHaveBeenCalledTimes(2);
            vi.useRealTimers();
        });

        it('should handle circular dependencies in module graph', async () => {
            const fileA = join(process.cwd(), 'src/A.ts');
            const fileB = join(process.cwd(), 'src/B.ts');

            const modA = {
                file: fileA,
                importers: new Set(),
                environment: 'client'
            } as unknown as EnvironmentModuleNode;

            const modB = {
                file: fileB,
                importers: new Set(),
                environment: 'client'
            } as unknown as EnvironmentModuleNode;

            modA.importers.add(modB);
            modB.importers.add(modA);

            const ctx: HotUpdateOptions = {
                type: 'update',
                file: fileA,
                server: serverMock,
                modules: [modA],
                timestamp: Date.now(),
                read: vi.fn()
            };

            const plugin = hmrPlugin.plugin;
            if (typeof plugin.hotUpdate === 'function') {
                await (plugin.hotUpdate as (ctx: HotUpdateOptions) => Promise<void>)(ctx);
            }

            expect(hotSendMock).toHaveBeenCalledWith(
                HMR_EVENT_NAME,
                expect.objectContaining({
                    file: fileA,
                    type: 'update',
                    affectedModules: expect.arrayContaining([fileA, fileB]) as HmrUpdateEvent['affectedModules']
                })
            );
        });
    });
});
