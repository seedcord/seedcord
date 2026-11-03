import { Logger } from '@seedcord/logger';
import { describe, expect, it, vi } from 'vitest';

import { defineGate } from '#gates/Gate';
import { DispatchContext } from '#src/dispatch/DispatchContext';
import { InteractionRun } from '#src/dispatch/InteractionRun';
import { GatedMetadataKey, InteractionKind } from '#src/metadataKeys';
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
        // justified: the run reads only core.config.errors and core.bus
        core: { bus: busWith(), config: {} } as unknown as CoreBase,
        event: {},
        HandlerCtor,
        middlewares: { chainFor: () => [] },
        apiError: class extends Error {
            readonly code = 0;
        },
        logger: new Logger('Test'),
        interactionId: 'i1',
        userId: 'u1',
        guildId: null,
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
        const gate = defineGate('Refuse', () => {
            throw new Error('refused');
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
                // justified: the gate above doesn't read its context
                gateContext: () => ({}) as GateContextBase,
                sender: { send: vi.fn().mockResolvedValue(undefined) }
            }),
            middlewares: { chainFor: () => [Audit] },
            faultDetails: () => {
                throw new Error('details failed');
            }
        };

        await expect(new InteractionRun(config).prepare()).rejects.toThrow('details failed');
        expect(after).toHaveBeenCalledOnce();
    });

    it('clears the choices when an autocomplete handler throws a Silence', async () => {
        class Quiet {
            execute(): void {
                throw new Silence('nothing to suggest');
            }
        }
        const clear = vi.fn().mockResolvedValue(undefined);

        const start = await new InteractionRun(
            configFor(InteractionKind.Autocomplete, Quiet, { responder: { clear } })
        ).prepare();
        await start?.();

        expect(clear).toHaveBeenCalledOnce();
    });
});
