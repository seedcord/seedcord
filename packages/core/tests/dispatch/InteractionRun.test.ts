import { Logger } from '@seedcord/logger';
import { HostPlugins } from '@seedcord/types/internal';
import { describe, expect, it, vi } from 'vite-plus/test';

import { defineGate } from '#gates/Gate';
import { DispatchContext } from '#src/dispatch/DispatchContext';
import { InteractionRun } from '#src/dispatch/InteractionRun';
import { GatedMetadataKey, InteractionKind } from '#src/metadataKeys';
import { PluginRegistry } from '#src/plugin/PluginRegistry';
import { Silence } from '#stops/Silence';
import { busWith } from '#tests/utils/busWith';

import type { GateContextBase } from '#gates/Gate';
import type { CoreBase } from '#interfaces/CoreBase';
import type { InteractionRunConfig } from '#src/dispatch/InteractionRun';

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
        const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
        const config = {
            ...configFor(InteractionKind.Button, Unhandled, {
                responder: { clear: vi.fn() },
                handler: () => new Unhandled()
            }),
            dispatch: new DispatchContext(InteractionKind.Button, route, true),
            customId
        };

        await new InteractionRun(config).prepare();

        expect(warn).toHaveBeenCalledWith(expect.stringContaining(warning));
        warn.mockRestore();
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
