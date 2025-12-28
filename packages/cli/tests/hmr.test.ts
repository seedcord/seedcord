import { EventEmitter } from 'node:events';
import { join } from 'node:path';

import { type Mock, beforeEach, describe, expect, it, vi } from 'vitest';

import { HMR_EVENT_NAME } from '@api/Hmr';
import { HmrPlugin } from '@commands/dev/runtime/HmrPlugin';

import type { HmrUpdateEvent } from '@api/Hmr';
import type { HmrContext, ModuleNode, ViteDevServer } from 'vite';

// Mock Logger
const loggerSpies = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
};

vi.mock('@seedcord/services', () => {
    return {
        Logger: class {
            public info = loggerSpies.info;
            public warn = loggerSpies.warn;
            public error = loggerSpies.error;
            public debug = loggerSpies.debug;
        }
    };
});

describe('HmrPlugin', () => {
    let hmrPlugin: HmrPlugin;

    beforeEach(() => {
        vi.clearAllMocks();
        hmrPlugin = new HmrPlugin();
    });

    it('should have correct name and hooks', () => {
        const plugin = hmrPlugin.plugin;
        expect(plugin.name).toBe('seedcord:hmr');
        expect(plugin.configureServer).toBeDefined();
        expect(plugin.handleHotUpdate).toBeDefined();
    });

    describe('configureServer (File Events)', () => {
        let serverMock: ViteDevServer;
        let watcher: EventEmitter;
        let hotSendMock: Mock;

        beforeEach(() => {
            watcher = new EventEmitter();
            hotSendMock = vi.fn();
            serverMock = {
                watcher,
                environments: {
                    ssr: {
                        hot: {
                            send: hotSendMock
                        }
                    }
                },
                hot: {
                    send: vi.fn() // Fallback
                }
            } as unknown as ViteDevServer;

            // Initialize hooks
            const plugin = hmrPlugin.plugin;
            if (typeof plugin.configureServer === 'function') {
                (plugin.configureServer as (server: ViteDevServer) => void)(serverMock);
            }
        });

        it('should handle "add" event as "create"', () => {
            const file = join(process.cwd(), 'src/commands/ping.ts');
            watcher.emit('add', file);

            expect(loggerSpies.info).toHaveBeenCalledWith(expect.stringContaining('CREATE'));
            expect(hotSendMock).toHaveBeenCalledWith(HMR_EVENT_NAME, {
                file,
                type: 'create'
            });
        });

        it('should handle "unlink" event as "delete"', () => {
            const file = join(process.cwd(), 'src/commands/ping.ts');
            watcher.emit('unlink', file);

            expect(loggerSpies.info).toHaveBeenCalledWith(expect.stringContaining('DELETE'));
            expect(hotSendMock).toHaveBeenCalledWith(HMR_EVENT_NAME, {
                file,
                type: 'delete'
            });
        });

        it('should handle "addDir" event as "createDir"', () => {
            const file = join(process.cwd(), 'src/commands/group');
            watcher.emit('addDir', file);

            expect(loggerSpies.info).toHaveBeenCalledWith(expect.stringContaining('CREATEDIR'));
            expect(hotSendMock).toHaveBeenCalledWith(HMR_EVENT_NAME, {
                file,
                type: 'createDir'
            });
        });

        it('should handle "unlinkDir" event as "deleteDir"', () => {
            const file = join(process.cwd(), 'src/commands/group');
            watcher.emit('unlinkDir', file);

            expect(loggerSpies.info).toHaveBeenCalledWith(expect.stringContaining('DELETEDIR'));
            expect(hotSendMock).toHaveBeenCalledWith(HMR_EVENT_NAME, {
                file,
                type: 'deleteDir'
            });
        });
    });

    describe('handleHotUpdate', () => {
        let serverMock: ViteDevServer;
        let hotSendMock: Mock;

        beforeEach(() => {
            hotSendMock = vi.fn();
            serverMock = {
                environments: {
                    ssr: {
                        hot: {
                            send: hotSendMock
                        }
                    }
                }
            } as unknown as ViteDevServer;
        });

        it('should handle update and calculate affected modules', async () => {
            const file = join(process.cwd(), 'src/components/Button.ts');
            const importerFile = join(process.cwd(), 'src/commands/Click.ts');

            const importerNode = {
                file: importerFile,
                importers: new Set()
            } as unknown as ModuleNode;

            const modules = [
                {
                    file,
                    importers: new Set([importerNode])
                }
            ] as unknown as ModuleNode[];

            const ctx: HmrContext = {
                file,
                server: serverMock,
                modules,
                timestamp: Date.now(),
                read: vi.fn()
            };

            const plugin = hmrPlugin.plugin;
            if (typeof plugin.handleHotUpdate === 'function') {
                await (plugin.handleHotUpdate as (ctx: HmrContext) => Promise<void>)(ctx);
            }

            expect(loggerSpies.info).toHaveBeenCalledWith(expect.stringContaining('UPDATE'));
            expect(hotSendMock).toHaveBeenCalledWith(HMR_EVENT_NAME, {
                file,
                type: 'update',
                affectedModules: expect.arrayContaining([file, importerFile]) as HmrUpdateEvent['affectedModules']
            });
        });

        it('should debounce rapid updates', async () => {
            const file = join(process.cwd(), 'src/rapid.ts');
            const ctx: HmrContext = {
                file,
                server: serverMock,
                modules: [],
                timestamp: Date.now(),
                read: vi.fn()
            };

            const plugin = hmrPlugin.plugin;
            if (typeof plugin.handleHotUpdate === 'function') {
                // First call
                await (plugin.handleHotUpdate as (ctx: HmrContext) => Promise<void>)(ctx);

                // Second call immediately
                await (plugin.handleHotUpdate as (ctx: HmrContext) => Promise<void>)(ctx);
            }

            expect(loggerSpies.info).toHaveBeenCalledTimes(1);
            expect(hotSendMock).toHaveBeenCalledTimes(1);
        });

        it('should allow updates after debounce timeout', async () => {
            vi.useFakeTimers();
            const file = join(process.cwd(), 'src/slow.ts');
            const ctx: HmrContext = {
                file,
                server: serverMock,
                modules: [],
                timestamp: Date.now(),
                read: vi.fn()
            };

            const plugin = hmrPlugin.plugin;
            if (typeof plugin.handleHotUpdate === 'function') {
                // First call
                await (plugin.handleHotUpdate as (ctx: HmrContext) => Promise<void>)(ctx);

                // Advance time by 300ms (debounce is 250ms)
                vi.advanceTimersByTime(300);

                // Second call
                await (plugin.handleHotUpdate as (ctx: HmrContext) => Promise<void>)(ctx);
            }

            expect(loggerSpies.info).toHaveBeenCalledTimes(2);
            expect(hotSendMock).toHaveBeenCalledTimes(2);
            vi.useRealTimers();
        });

        it('should handle circular dependencies in module graph', async () => {
            const fileA = join(process.cwd(), 'src/A.ts');
            const fileB = join(process.cwd(), 'src/B.ts');

            const modA = { file: fileA, importers: new Set() } as unknown as ModuleNode;

            const modB = { file: fileB, importers: new Set() } as unknown as ModuleNode;

            // A imports B, B imports A
            modA.importers.add(modB);
            modB.importers.add(modA);

            const ctx: HmrContext = {
                file: fileA,
                server: serverMock,
                modules: [modA],
                timestamp: Date.now(),
                read: vi.fn()
            };

            const plugin = hmrPlugin.plugin;
            if (typeof plugin.handleHotUpdate === 'function') {
                await (plugin.handleHotUpdate as (ctx: HmrContext) => Promise<void>)(ctx);
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
