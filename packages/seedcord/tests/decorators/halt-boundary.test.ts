import { Events } from 'discord.js';
import { describe, expect, it, vi } from 'vitest';

import { EventCatchable } from '@bDecorators/EventCatchable';
import { EventHandler } from '@handlers/event';
import { Halt } from '@interfaces/Halt';

import type { Core } from '@interfaces/Core';
import type { ClientEvents } from 'discord.js';

function fakeMessage(): { reply: ReturnType<typeof vi.fn> } {
    return { reply: vi.fn() };
}

// the payload tuple is a fixture; the arm only calls reply on it
function createPayload(m: { reply: ReturnType<typeof vi.fn> }): ClientEvents[Events.MessageCreate] {
    return [m] as unknown as ClientEvents[Events.MessageCreate];
}

class HaltingHandler extends EventHandler<Events.MessageCreate | Events.MessageUpdate> {
    @EventCatchable()
    async execute(): Promise<void> {
        await Promise.resolve();
        throw new Halt('blacklisted');
    }
}

describe('Halt at the boundary', () => {
    it('stops silently with no reply and no report', async () => {
        const publish = vi.fn();
        // justified: the fixture implements only the Core surface the catch path reads.
        const core = { bus: { publish }, config: { errors: {} } } as unknown as Core;
        const msg = fakeMessage();

        const handler = new HaltingHandler(createPayload(msg), core, Events.MessageCreate);
        await handler.execute();

        expect(msg.reply).not.toHaveBeenCalled();
        expect(publish).not.toHaveBeenCalled();
    });
});
