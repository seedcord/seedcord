import { MessageFlags } from 'discord-api-types/v10';
import { describe, expect, it } from 'vite-plus/test';

import { TestSender } from './helpers';

import type { ReplyResponse } from '@seedcord/types';

const response: ReplyResponse = { components: [] };

function ephemeralBits(sender: TestSender): number[] {
    return sender.written.map((flags) => flags & MessageFlags.Ephemeral);
}

describe('the ephemeral default', () => {
    it('makes a reply ephemeral when the bot keeps the default', async () => {
        const sender = new TestSender();
        await sender.reply(response);

        expect(ephemeralBits(sender)).toEqual([MessageFlags.Ephemeral]);
    });

    it('makes a reply public when the bot defaults to public', async () => {
        const sender = new TestSender(undefined, false);
        await sender.reply(response);

        expect(ephemeralBits(sender)).toEqual([0]);
    });

    it("lets a reply's own ephemeral override the default", async () => {
        const sender = new TestSender(undefined, false);
        await sender.reply(response, { ephemeral: true });

        expect(ephemeralBits(sender)).toEqual([MessageFlags.Ephemeral]);
    });

    it('applies the default to a defer', async () => {
        const sender = new TestSender(undefined, false);
        await sender.defer();

        expect(ephemeralBits(sender)).toEqual([0]);
    });

    it("uses a defer's visibility for the follow-ups after it", async () => {
        const sender = new TestSender();
        await sender.defer({ ephemeral: false });

        await sender.send(response);
        await sender.send(response);

        // the first send edits the placeholder, and an edit doesn't write flags
        expect(ephemeralBits(sender)).toEqual([0, 0]);
    });
});
