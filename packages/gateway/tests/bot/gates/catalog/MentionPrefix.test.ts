import { Silence } from '@seedcord/core';
import { describe, it, expect } from 'vite-plus/test';

import { MentionPrefix } from '#bot/gates/catalog';

import type { EventGateContext } from '#bot/gates';

const BOT_ID = '123456789012345678';
const OTHER_ID = '876543210987654321';

function message(content: string | null): object {
    return { content, client: { user: { id: BOT_ID } } };
}

function created(content: string): EventGateContext<'messageCreate'> {
    // a fixture cast. the gate reads only the payload
    return { eventName: 'messageCreate', payload: [message(content)] } as unknown as EventGateContext<'messageCreate'>;
}

function edited(before: string | null, after: string): EventGateContext<'messageUpdate'> {
    return {
        eventName: 'messageUpdate',
        payload: [message(before), message(after)]
    } as unknown as EventGateContext<'messageUpdate'>;
}

describe('MentionPrefix', () => {
    it.each([`<@${BOT_ID}> ping`, `  <@${BOT_ID}> ping`])('passes a message that starts with %s', async (content) => {
        await expect(MentionPrefix.check(created(content))).resolves.toBeUndefined();
    });

    it.each(['ping', `ping <@${BOT_ID}>`, `<@${OTHER_ID}> <@${BOT_ID}> ping`])(
        'silences a message that does not start with the bot: %s',
        async (content) => {
            await expect(MentionPrefix.check(created(content))).rejects.toBeInstanceOf(Silence);
        }
    );

    it('passes an edit that adds the mention, and silences one that already had it', async () => {
        const mentioned = `<@${BOT_ID}> ping`;
        await expect(MentionPrefix.check(edited('ping', mentioned))).resolves.toBeUndefined();
        await expect(MentionPrefix.check(edited(null, mentioned))).resolves.toBeUndefined();
        await expect(MentionPrefix.check(edited(mentioned, mentioned))).rejects.toBeInstanceOf(Silence);
    });
});
