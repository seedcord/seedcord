import { EventEmitter } from 'node:events';
import { join } from 'node:path';

import { type Mock, beforeEach, describe, expect, it, vi } from 'vitest';

import { HmrPlugin } from '#commands/dev/runtime/HmrPlugin';

import type { DevEvent } from '#commands/dev/runtime/events';
import type { EnvironmentModuleNode, HotUpdateOptions, ViteDevServer } from 'vite';

const HMR_EVENT_NAME = 'seedcord:hmr';

function watcherMock(): EventEmitter & { add: Mock } {
    return Object.assign(new EventEmitter(), { add: vi.fn() });
}

interface FakeEnvironment {
    name: 'client' | 'ssr';
    moduleGraph: { getModulesByFile: Mock; invalidateModule: Mock };
}

function environment(name: FakeEnvironment['name']): FakeEnvironment {
    return { name, moduleGraph: { getModulesByFile: vi.fn(), invalidateModule: vi.fn() } };
}

function moduleNode(file: string, importers: EnvironmentModuleNode[] = []): EnvironmentModuleNode {
    // the plugin reads only file and importers
    return { file, importers: new Set(importers) } as unknown as EnvironmentModuleNode;
}

function callHotUpdate(
    plugin: HmrPlugin,
    env: FakeEnvironment,
    type: HotUpdateOptions['type'],
    file: string,
    modules: EnvironmentModuleNode[] = []
): void {
    const hook = plugin.plugin.hotUpdate;
    if (typeof hook !== 'function') throw new TypeError('HmrPlugin.hotUpdate is not a function hook');

    // the plugin reads only environment.name and environment.moduleGraph
    const context = { environment: env } as unknown as ThisParameterType<typeof hook>;
    // an empty graph stands in for the deprecated server.moduleGraph
    const server = { moduleGraph: environment('ssr').moduleGraph } as unknown as ViteDevServer;
    void hook.call(context, { type, file, modules, server, timestamp: Date.now(), read: vi.fn() });
}

// vite runs the client environment's hook first, then ssr, where the bot's modules live
function viteHotUpdate(
    plugin: HmrPlugin,
    type: HotUpdateOptions['type'],
    file: string,
    ssrModules: EnvironmentModuleNode[] = [],
    ssr = environment('ssr')
): void {
    callHotUpdate(plugin, environment('client'), type, file);
    callHotUpdate(plugin, ssr, type, file, ssrModules);
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

    it('carries the config rollback flag onto the hmr payload', () => {
        const plugin = new HmrPlugin({ ...mockConfig, hmr: { rollback: false } });
        const hotSend = vi.fn();
        // justified: spy on the private `hot` getter
        const hotHost = plugin as unknown as { hot: { send: typeof hotSend; on: ReturnType<typeof vi.fn> } };
        vi.spyOn(hotHost, 'hot', 'get').mockReturnValue({ send: hotSend, on: vi.fn() });

        const file = join(process.cwd(), 'src/commands/ping.ts');
        viteHotUpdate(plugin, 'create', file);

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
        const file = join(process.cwd(), 'src/components/Button.ts');
        const importerFile = join(process.cwd(), 'src/commands/Click.ts');
        let hotSendMock: Mock;

        beforeEach(() => {
            hotSendMock = vi.fn();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- spy on the private `hot` getter
            vi.spyOn(hmrPlugin as any, 'hot', 'get').mockReturnValue({ send: hotSendMock, on: vi.fn() });
        });

        it('sends one update carrying the importers from the ssr graph', () => {
            viteHotUpdate(hmrPlugin, 'update', file, [moduleNode(file, [moduleNode(importerFile)])]);

            expect(hotSendMock.mock.calls).toEqual([
                [HMR_EVENT_NAME, { file, type: 'update', affectedModules: [file, importerFile], rollback: true }]
            ]);
        });

        it('sends one delete carrying the importers of the deleted file', () => {
            viteHotUpdate(hmrPlugin, 'delete', file, [moduleNode(file, [moduleNode(importerFile)])]);

            expect(hotSendMock.mock.calls).toEqual([
                [HMR_EVENT_NAME, { file, type: 'delete', affectedModules: [file, importerFile], rollback: true }]
            ]);
        });

        it('lists the file itself when the graph has no module for it yet', () => {
            viteHotUpdate(hmrPlugin, 'create', file);

            expect(hotSendMock.mock.calls).toEqual([
                [HMR_EVENT_NAME, { file, type: 'create', affectedModules: [file], rollback: true }]
            ]);
        });

        it('follows the importers of every module a file has', () => {
            const plain = moduleNode(file);
            const imported = moduleNode(file, [moduleNode(importerFile)]);

            callHotUpdate(hmrPlugin, environment('ssr'), 'update', file, [plain, imported]);

            expect(hotSendMock).toHaveBeenCalledWith(
                HMR_EVENT_NAME,
                expect.objectContaining({ affectedModules: [file, importerFile] })
            );
        });

        it('invalidates the modules of every affected file in the ssr graph', () => {
            const fileNode = moduleNode(file, [moduleNode(importerFile)]);
            const importerNode = moduleNode(importerFile);
            const ssr = environment('ssr');
            ssr.moduleGraph.getModulesByFile.mockImplementation((target: string) =>
                target === file ? new Set([fileNode]) : new Set([importerNode])
            );

            viteHotUpdate(hmrPlugin, 'update', file, [fileNode], ssr);

            expect(ssr.moduleGraph.invalidateModule.mock.calls).toEqual([[fileNode], [importerNode]]);
        });

        it('sends a save that lands right after a create', () => {
            viteHotUpdate(hmrPlugin, 'create', file);
            viteHotUpdate(hmrPlugin, 'update', file);

            expect(hotSendMock.mock.calls.map(([, payload]) => (payload as { type: string }).type)).toEqual([
                'create',
                'update'
            ]);
        });

        it('sends one event for two saves inside the debounce window', () => {
            viteHotUpdate(hmrPlugin, 'update', file);
            viteHotUpdate(hmrPlugin, 'update', file);

            expect(hotSendMock).toHaveBeenCalledTimes(1);
        });

        it('sends a save again once the debounce window has passed', () => {
            vi.useFakeTimers();
            viteHotUpdate(hmrPlugin, 'update', file);
            vi.advanceTimersByTime(300);
            viteHotUpdate(hmrPlugin, 'update', file);
            vi.useRealTimers();

            expect(hotSendMock).toHaveBeenCalledTimes(2);
        });

        it('stops at a circular import', () => {
            const a = moduleNode(file);
            const b = moduleNode(importerFile, [a]);
            a.importers.add(b);

            viteHotUpdate(hmrPlugin, 'update', file, [a]);

            expect(hotSendMock).toHaveBeenCalledWith(
                HMR_EVENT_NAME,
                expect.objectContaining({ affectedModules: [file, importerFile] })
            );
        });
    });
});
