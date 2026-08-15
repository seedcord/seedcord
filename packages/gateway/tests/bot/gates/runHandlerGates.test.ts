import { Notice, defineGate } from '@seedcord/core';
import { runHandlerGates } from '@seedcord/core/internal';
import { describe, expect, it } from 'vitest';

import { Gated } from '#bDecorators/Gated';
import { eventGateContext, interactionGateContext } from '#bot/gates/runGates';
import { EventHandler } from '#handlers/event';
import { SlashHandler } from '#handlers/interaction/SlashHandler';

import { TestNotice } from '../../utils/TestNotice';

import type { Core } from '#interfaces/Core';
import type { Repliables } from '#src/handlers/interactionTypes';
import type { Events } from 'discord.js';

declare module '@seedcord/core' {
    interface SlashOptionRegistry {
        runprobe: { note: { kind: 'string'; required: false } };
    }
}

// minimal repliable, the context builder reads only these fields
const fakeInteraction = (): Repliables =>
    ({
        user: { id: 'u' },
        guild: null,
        guildId: 'g',
        channelId: 'c',
        appPermissions: { bitfield: 0n }
    }) as unknown as Repliables;

describe('runHandlerGates', () => {
    // gates under test never read core
    const core = {} as unknown as Core;

    it("runs a handler's gates and propagates a refusal", async () => {
        const Refusing = defineGate('refuse', () => {
            throw new TestNotice('no');
        });

        @Gated(Refusing)
        class Handler extends SlashHandler<'runprobe'> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        await expect(runHandlerGates(Handler, interactionGateContext(fakeInteraction(), core))).rejects.toBeInstanceOf(
            Notice
        );
    });

    it('resolves when the handler has no gates', async () => {
        class Handler extends SlashHandler<'runprobe'> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        await expect(
            runHandlerGates(Handler, interactionGateContext(fakeInteraction(), core))
        ).resolves.toBeUndefined();
    });

    it("runs an event handler's gates and propagates a refusal", async () => {
        const Refusing = defineGate('refuse', () => {
            throw new TestNotice('no');
        });

        @Gated(Refusing)
        class Handler extends EventHandler<Events.MessageCreate> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        // empty payload, the gate refuses regardless of the derived actor
        const payload = [] as unknown as Parameters<typeof eventGateContext>[1];
        await expect(runHandlerGates(Handler, eventGateContext('messageCreate', payload, core))).rejects.toBeInstanceOf(
            Notice
        );
    });

    it('resolves when the event handler has no gates', async () => {
        class Handler extends EventHandler<Events.MessageCreate> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        const payload = [] as unknown as Parameters<typeof eventGateContext>[1];
        await expect(
            runHandlerGates(Handler, eventGateContext('messageCreate', payload, core))
        ).resolves.toBeUndefined();
    });
});
