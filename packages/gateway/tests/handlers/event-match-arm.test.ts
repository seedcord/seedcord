import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it } from 'vitest';

import { EventHandler } from '#handlers/event/EventHandler';

import type { Core } from '#interfaces/Core';
import type { ClientEvents, Events, Message } from 'discord.js';

// justified: nothing on this path reads core
const core = {} as unknown as Core;

const message = { id: 'm1' } as unknown as Message;

class Watcher extends EventHandler<Events.MessageCreate> {
    public async execute(): Promise<void> {
        await Promise.resolve();
    }

    public run(): Promise<string> {
        return this.match({ messageCreate: () => 'created' });
    }
}

// justified: only a cast fires a name outside ClientEvents
function watcherFiring(name: string): Watcher {
    const payload = [message] as unknown as ClientEvents[Events.MessageCreate];
    return new Watcher(payload, core, name as Events.MessageCreate);
}

describe('EventHandler.match', () => {
    it('runs the arm for the event that fired', async () => {
        await expect(watcherFiring('messageCreate').run()).resolves.toBe('created');
    });

    it('throws for an event named after an Object.prototype member', async () => {
        let caught: unknown;
        try {
            await watcherFiring('toString').run();
        } catch (error) {
            caught = error;
        }

        expect(isSeedcordError(caught, 'SeedcordError', SeedcordErrorCode.EventMatchArmMissing)).toBe(true);
    });
});
