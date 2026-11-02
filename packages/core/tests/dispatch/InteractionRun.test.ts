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
    const dispatch = new DispatchContext(kind, 'probe');
    return {
        dispatch,
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
            dispatch,
            origin: 'probe',
            source: null,
            guild: undefined,
            user: undefined,
            metadata: {}
        })
    };
}

describe('InteractionRun', () => {
    it('runs the gates on a repliable kind even when the handler has no sender', async () => {
        const execute = vi.fn();
        const gate = defineGate('Refuse', () => {
            throw new Silence('refused');
        });
        class Plain {
            execute = execute;
        }
        Reflect.defineMetadata(GatedMetadataKey, [gate], Plain);

        const config = configFor(InteractionKind.Slash, Plain, {
            // justified: the gate above doesn't read its context
            gateContext: () => ({}) as GateContextBase,
            newSender: () => ({ send: vi.fn().mockResolvedValue(undefined) })
        });
        const start = await new InteractionRun(config).prepare();

        expect(start).toBeNull();
        expect(execute).not.toHaveBeenCalled();
    });

    it('clears the choices when an autocomplete handler throws a Silence', async () => {
        class Quiet {
            execute(): void {
                throw new Silence('nothing to suggest');
            }
        }
        const clearChoices = vi.fn().mockResolvedValue(undefined);

        const start = await new InteractionRun(
            configFor(InteractionKind.Autocomplete, Quiet, { clearChoices })
        ).prepare();
        await start?.();

        expect(clearChoices).toHaveBeenCalledOnce();
    });
});
