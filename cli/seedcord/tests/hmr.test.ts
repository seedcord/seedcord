import { EventEmitter } from 'node:events';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { Logger } from '@seedcord/logger';
import {
    type Mock,
    type MockInstance,
    afterAll,
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    onTestFinished,
    vi
} from 'vitest';

import { HmrPlugin } from '#commands/dev/runtime/HmrPlugin';
import { RestartFiles } from '#commands/dev/runtime/RestartFiles';
import { ProjectFiles } from '#core/project/ProjectFiles';
import { realPath } from '#core/project/realPath';
import { StateFolder } from '#core/state/StateFolder';
import { silentLogger } from '#tests/silentLogger';
import { vitePluginsOf } from '#tests/vitePluginsOf';

import type { DevEvent } from '#commands/dev/runtime/events';
import type { ResolvedSeedcordConfig } from '#core/config/schema';
import type { EnvironmentModuleNode, HotUpdateOptions, ViteDevServer } from 'vite';

const HMR_EVENT_NAME = 'seedcord:hmr';

// the plugin turns a save of a missing file into a delete
const projectRoot = realPath(mkdtempSync(join(tmpdir(), 'seedcord-hmr-')));
for (const saved of [
    'src/commands/ping.ts',
    'src/commands/Click.ts',
    'src/components/Button.ts',
    'src/config/limits.ts',
    'src/migrations/001-create-users.ts'
]) {
    mkdirSync(dirname(join(projectRoot, saved)), { recursive: true });
    writeFileSync(join(projectRoot, saved), '');
}
afterAll(() => {
    rmSync(projectRoot, { recursive: true, force: true });
});

function watcherMock(): EventEmitter & { add: Mock } {
    return Object.assign(new EventEmitter(), { add: vi.fn() });
}

interface FakeEnvironment {
    name: 'client' | 'seedcord';
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
    const server = { moduleGraph: environment('seedcord').moduleGraph } as unknown as ViteDevServer;
    void hook.call(context, { type, file, modules, server, timestamp: Date.now(), read: vi.fn() });
}

// vite runs the client environment's hook first, then the bot's
function viteHotUpdate(
    plugin: HmrPlugin,
    type: HotUpdateOptions['type'],
    file: string,
    botModules: EnvironmentModuleNode[] = [],
    bot = environment('seedcord')
): void {
    callHotUpdate(plugin, environment('client'), type, file);
    callHotUpdate(plugin, bot, type, file, botModules);
}

interface ConfiguredPlugin {
    plugin: HmrPlugin;
    watcher: EventEmitter;
    listeners: Map<string, (data: unknown) => void>;
    sent: Mock;
    events: DevEvent[];
}

// the last-deploy tests below write to their own folder
const STATE = new StateFolder(process.cwd(), silentLogger);

function restartFilesOf(config: ResolvedSeedcordConfig): RestartFiles {
    return new RestartFiles(config, new ProjectFiles(config).layout, []);
}

function configuredPlugin(config: ConstructorParameters<typeof HmrPlugin>[0], state = STATE): ConfiguredPlugin {
    const plugin = new HmrPlugin(config, state, 'seedcord', restartFilesOf(config));
    onTestFinished(() => plugin.close());
    const listeners = new Map<string, (data: unknown) => void>();
    // justified: spy on the private `hot` getter
    const hotHost = plugin as unknown as { hot: { send: Mock; on: Mock } };
    const sent = vi.fn();
    vi.spyOn(hotHost, 'hot', 'get').mockReturnValue({
        send: sent,
        on: vi.fn((event: string, cb: (data: unknown) => void) => listeners.set(event, cb))
    });

    const events: DevEvent[] = [];
    plugin.on('event', (event: DevEvent) => events.push(event));

    const watcher = watcherMock();
    const server = {
        watcher,
        environments: { seedcord: { hot: { send: vi.fn(), on: vi.fn() } } }
    } as unknown as ViteDevServer;
    (plugin.plugin.configureServer as (s: ViteDevServer) => void)(server);

    return { plugin, watcher, listeners, sent, events };
}

describe('HmrPlugin', () => {
    let hmrPlugin: HmrPlugin;
    const mockConfig: ResolvedSeedcordConfig = {
        root: projectRoot,
        configFile: realPath(join(projectRoot, 'seedcord.config.ts')),
        target: {
            kind: 'server',
            start: realPath(join(projectRoot, 'src/index.ts')),
            outDir: realPath(join(projectRoot, 'dist'))
        },
        instance: realPath(join(projectRoot, 'src/Seedcord.ts')),
        typecheck: { enabled: false } as const,
        idleAnimation: true,
        tunnel: { mode: 'quick' } as const,
        build: {},
        files: [],
        viteMode: 'development',
        vitePlugins: vitePluginsOf()
    };

    const srcRoot = realPath(join(projectRoot, 'src'));
    let trace: MockInstance<Logger['trace']>;

    beforeEach(() => {
        for (const level of ['info', 'warn', 'error', 'debug'] as const) {
            vi.spyOn(Logger.prototype, level).mockImplementation(() => undefined);
        }
        trace = vi.spyOn(Logger.prototype, 'trace').mockImplementation(() => undefined);
        hmrPlugin = new HmrPlugin(mockConfig, STATE, 'seedcord', restartFilesOf(mockConfig));
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('carries the config rollback flag onto the hmr payload', () => {
        const plugin = new HmrPlugin(
            { ...mockConfig, hmr: { rollback: false } },
            STATE,
            'seedcord',
            restartFilesOf(mockConfig)
        );
        const hotSend = vi.fn();
        // justified: spy on the private `hot` getter
        const hotHost = plugin as unknown as { hot: { send: typeof hotSend; on: ReturnType<typeof vi.fn> } };
        vi.spyOn(hotHost, 'hot', 'get').mockReturnValue({ send: hotSend, on: vi.fn() });

        const file = join(projectRoot, 'src/commands/ping.ts');
        viteHotUpdate(plugin, 'create', file);

        expect(hotSend).toHaveBeenCalledWith(HMR_EVENT_NAME, expect.objectContaining({ file, rollback: false }));
    });

    it('relays the bound port the framework reports', () => {
        const { listeners, events } = configuredPlugin(mockConfig);

        listeners.get('seedcord:server-listening')?.({ port: 4000 });

        expect(events).toContainEqual({ type: 'server-listening', port: 4000 });
    });

    describe('the last deploy', () => {
        const deployed = { applicationId: 'app-1', scopes: { global: 'a1b2', '111': 'c3d4' } };

        function withState(): ConfiguredPlugin {
            const dir = mkdtempSync(join(tmpdir(), 'seedcord-hmr-state-'));
            onTestFinished(() => rmSync(dir, { recursive: true, force: true }));
            return configuredPlugin(mockConfig, new StateFolder(dir, silentLogger));
        }

        it('answers a read with the deploy the framework reported for that application', () => {
            const { listeners, sent } = withState();

            listeners.get('seedcord:commands-deployed')?.(deployed);
            listeners.get('seedcord:read-deployed')?.({ applicationId: 'app-1' });

            expect(sent).toHaveBeenCalledWith('seedcord:last-deploy', { deployed });
        });

        it('answers undefined for a deploy saved for another application', () => {
            const { listeners, sent } = withState();

            listeners.get('seedcord:commands-deployed')?.(deployed);
            listeners.get('seedcord:read-deployed')?.({ applicationId: 'app-2' });

            expect(sent).toHaveBeenCalledWith('seedcord:last-deploy', { deployed: undefined });
        });
    });

    it.each(['migrations/**', './migrations/**', join(srcRoot, 'migrations/**')])(
        'asks for a restart on a save matching the plugin pattern %s',
        (pattern) => {
            const { plugin, listeners, events } = configuredPlugin({ ...mockConfig, root: srcRoot });

            listeners.get('seedcord:register-critical-files')?.({ patterns: [pattern] });
            viteHotUpdate(plugin, 'update', join(srcRoot, 'migrations/001-create-users.ts'));

            expect(events).toContainEqual({ type: 'restart-required' });
        }
    );

    it('asks for a restart on a lockfile save beside the config of a bot rooted at ./src', () => {
        const config = { ...mockConfig, root: srcRoot };
        const lockfile = join(projectRoot, 'pnpm-lock.yaml');
        writeFileSync(lockfile, '');
        const { plugin, events } = configuredPlugin(config);

        viteHotUpdate(plugin, 'update', lockfile);

        expect(events).toContainEqual({ type: 'restart-required' });
    });

    it('asks for a restart on a save matching a ./ pattern in hmr.restart', () => {
        const { plugin, events } = configuredPlugin({
            ...mockConfig,
            root: srcRoot,
            hmr: { restart: ['./config/**'] }
        });

        viteHotUpdate(plugin, 'update', join(srcRoot, 'config/limits.ts'));

        expect(events).toContainEqual({ type: 'restart-required' });
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
                    seedcord: {
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
            const file = join(projectRoot, 'src/commands/group');
            watcher.emit('addDir', file);

            expect(trace).toHaveBeenCalledWith(expect.stringContaining('CREATEDIR'));
            expect(hotSendMock).toHaveBeenCalledWith(HMR_EVENT_NAME, {
                file,
                type: 'createDir',
                rollback: true
            });
        });

        it('should handle "unlinkDir" event as "deleteDir"', () => {
            const file = join(projectRoot, 'src/commands/group');
            watcher.emit('unlinkDir', file);

            expect(trace).toHaveBeenCalledWith(expect.stringContaining('DELETEDIR'));
            expect(hotSendMock).toHaveBeenCalledWith(HMR_EVENT_NAME, {
                file,
                type: 'deleteDir',
                rollback: true
            });
        });
    });

    describe('hotUpdate', () => {
        const file = join(projectRoot, 'src/components/Button.ts');
        const importerFile = join(projectRoot, 'src/commands/Click.ts');
        let hotSendMock: Mock;

        beforeEach(() => {
            hotSendMock = vi.fn();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- spy on the private `hot` getter
            vi.spyOn(hmrPlugin as any, 'hot', 'get').mockReturnValue({ send: hotSendMock, on: vi.fn() });
        });

        it("sends one update carrying the importers from the bot's graph", () => {
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

        it('sends a delete for an update to a file that is gone', () => {
            const gone = join(projectRoot, 'src/components/Gone.ts');

            viteHotUpdate(hmrPlugin, 'update', gone, [moduleNode(gone, [moduleNode(importerFile)])]);

            expect(hotSendMock.mock.calls).toEqual([
                [HMR_EVENT_NAME, { file: gone, type: 'delete', affectedModules: [gone, importerFile], rollback: true }]
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

            callHotUpdate(hmrPlugin, environment('seedcord'), 'update', file, [plain, imported]);

            expect(hotSendMock).toHaveBeenCalledWith(
                HMR_EVENT_NAME,
                expect.objectContaining({ affectedModules: [file, importerFile] })
            );
        });

        it("invalidates the modules of every affected file in the bot's graph", () => {
            const fileNode = moduleNode(file, [moduleNode(importerFile)]);
            const importerNode = moduleNode(importerFile);
            const bot = environment('seedcord');
            bot.moduleGraph.getModulesByFile.mockImplementation((target: string) =>
                target === file ? new Set([fileNode]) : new Set([importerNode])
            );

            viteHotUpdate(hmrPlugin, 'update', file, [fileNode], bot);

            expect(bot.moduleGraph.invalidateModule.mock.calls).toEqual([[fileNode], [importerNode]]);
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
