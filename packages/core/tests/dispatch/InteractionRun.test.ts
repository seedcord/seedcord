import { Logger } from '@seedcord/logger';
import { captureLogs } from '@seedcord/logger/internal';
import { HostPlugins } from '@seedcord/types/internal';
import { Envapter, PortableSource } from 'envapt';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import { defineGate } from '#gates/Gate';
import { DispatchContext } from '#src/dispatch/DispatchContext';
import { InteractionRun } from '#src/dispatch/InteractionRun';
import { GatedMetadataKey, InteractionKind } from '#src/metadataKeys';
import { PluginRegistry } from '#src/plugin/PluginRegistry';
import { Silence } from '#stops/Silence';
import { TestSender } from '#tests/reply/helpers';
import { busWith } from '#tests/utils/busWith';

import type { GateContextBase } from '#gates/Gate';
import type { CoreBase } from '#interfaces/CoreBase';
import type { InteractionRunConfig } from '#src/dispatch/InteractionRun';
import type { SubscriptionData } from '#subscribers/types/Subscriptions';

function configFor(
    kind: InteractionKind,
    HandlerCtor: InteractionRunConfig['HandlerCtor'],
    target: InteractionRunConfig['target']
): InteractionRunConfig {
    return {
        dispatch: new DispatchContext(kind, 'probe'),
        // justified: the run reads only core.config.errors, core.bus, and the members
        core: { bus: busWith(), config: {}, [HostPlugins]: new PluginRegistry() } as unknown as CoreBase,
        HandlerCtor,
        apiError: class extends Error {
            readonly code = 0;
        },
        logger: new Logger('Test'),
        interactionId: 'i1',
        origin: { userId: 'u1', guildId: null, channelId: null, userLocale: null, guildLocale: null },
        customId: null,
        target,
        faultDetails: () => ({
            origin: 'probe',
            source: null,
            guild: undefined,
            user: undefined,
            metadata: {}
        })
    };
}

describe('InteractionRun', () => {
    it('still runs after() when reporting a refusal throws', async () => {
        const after = vi.fn();
        const refused = new Error('refused');
        const gate = defineGate('Refuse', () => {
            throw refused;
        });
        class Refused {
            execute = vi.fn();
        }
        class Audit {
            execute = vi.fn();
            after = after;
        }
        Reflect.defineMetadata(GatedMetadataKey, [gate], Refused);

        const config = {
            ...configFor(InteractionKind.Slash, Refused, {
                // justified: runInteractionGates reads only dispatch from this context
                gateContext: () =>
                    ({ dispatch: new DispatchContext(InteractionKind.Slash, 'probe') }) as GateContextBase,
                sender: { send: vi.fn().mockResolvedValue(undefined) },
                handler: () => new Refused(),
                middlewares: [() => new Audit()]
            }),
            faultDetails: () => {
                throw new Error('details failed');
            }
        };

        await expect(new InteractionRun(config).prepare()).rejects.toThrow('details failed');
        expect(after).toHaveBeenCalledWith({ outcome: 'failed', caught: refused });
    });

    it.each([
        { route: 'gone', customId: null, warning: 'No handler found' },
        { route: '', customId: 'vote', warning: 'vote' }
    ])('warns on a fallback dispatch for route "$route"', async ({ route, customId, warning }) => {
        class Unhandled {
            execute = vi.fn();
        }
        using logs = captureLogs();
        const config = {
            ...configFor(InteractionKind.Button, Unhandled, {
                responder: { clear: vi.fn() },
                handler: () => new Unhandled()
            }),
            dispatch: new DispatchContext(InteractionKind.Button, route, true),
            customId
        };

        await new InteractionRun(config).prepare();

        expect(logs.at('warn')).toContainEqual(expect.stringContaining(warning));
    });

    it('publishes interactionDispatching before interactionDispatched, with the same dispatch id', async () => {
        class Done {
            execute = vi.fn();
        }
        const config = configFor(InteractionKind.Autocomplete, Done, {
            responder: { clear: vi.fn() },
            handler: () => new Done()
        });
        const seen: string[][] = [];
        for (const key of ['interactionDispatching', 'interactionDispatched'] as const) {
            config.core.bus.on(key, ({ dispatchId }) => seen.push([key, dispatchId]));
        }

        const start = await new InteractionRun(config).prepare();
        await start?.();

        expect(seen).toEqual([
            ['interactionDispatching', config.dispatch.id],
            ['interactionDispatched', config.dispatch.id]
        ]);
    });

    it('clears the choices when an autocomplete handler throws a Silence', async () => {
        class Quiet {
            execute(): void {
                throw new Silence('nothing to suggest');
            }
        }
        const clear = vi.fn().mockResolvedValue(undefined);

        const start = await new InteractionRun(
            configFor(InteractionKind.Autocomplete, Quiet, { responder: { clear }, handler: () => new Quiet() })
        ).prepare();
        await start?.();

        expect(clear).toHaveBeenCalledOnce();
    });
});

describe('a dispatch that is still running', () => {
    const never = (): Promise<void> => new Promise(() => undefined);

    // the handler runs as soon as the run starts because autocomplete skips middleware and gates
    function runningConfig(execute: () => Promise<void> = never): InteractionRunConfig {
        class Hangs {
            execute = execute;
        }
        return configFor(InteractionKind.Autocomplete, Hangs, {
            responder: { clear: vi.fn() },
            handler: () => new Hangs()
        });
    }

    async function start(config: InteractionRunConfig): Promise<void> {
        const run = await new InteractionRun(config).prepare();
        void run?.();
    }

    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        Envapter.useSource(new PortableSource({}));
    });

    it('publishes interactionDispatching', async () => {
        const config = runningConfig();
        const starts: SubscriptionData<'interactionDispatching'>[] = [];
        config.core.bus.on('interactionDispatching', (payload) => starts.push(payload));

        await start(config);

        expect(starts).toEqual([
            {
                dispatchId: config.dispatch.id,
                routeId: 'autocomplete:probe',
                interactionId: 'i1',
                kind: 'autocomplete',
                fallback: false
            }
        ]);
    });

    it("warns at 2.5s if the handler still hasn't responded", async () => {
        using logs = captureLogs();
        await start(runningConfig());

        vi.advanceTimersByTime(2499);
        expect(logs.at('warn')).toEqual([]);
        vi.advanceTimersByTime(1);

        expect(logs.at('warn')).toEqual([expect.stringContaining('autocomplete:probe')]);
    });

    it("doesn't warn once the handler has responded", async () => {
        using logs = captureLogs();
        const config: InteractionRunConfig = runningConfig(async () => {
            await new TestSender(config.core.bus, true, config.dispatch).defer();
            await never();
        });

        await start(config);
        await vi.advanceTimersByTimeAsync(2500);

        expect(logs.at('warn')).toEqual([]);
    });

    it("doesn't warn once the dispatch has finished", async () => {
        using logs = captureLogs();

        await start(runningConfig(() => Promise.reject(new Silence('nothing to suggest'))));
        await vi.advanceTimersByTimeAsync(2500);

        expect(logs.at('warn')).toEqual([]);
    });

    it("doesn't warn in production", async () => {
        Envapter.useSource(new PortableSource({ ENVIRONMENT: 'production' }));
        using logs = captureLogs();

        await start(runningConfig());
        vi.advanceTimersByTime(2500);

        expect(logs.at('warn')).toEqual([]);
    });
});
