import { TextDisplayBuilder } from '@discordjs/builders';
import { SeedcordErrorCode, isSeedcordError } from '@seedcord/errors';
import { ComponentType } from 'discord-api-types/v10';
import { describe, expect, it } from 'vitest';

import { serializeReply } from '#reply/serializeReply';

import { stripAnsi } from './helpers';

import type { ReplyResponse } from '@seedcord/types';

const ROUTE = 'slash:ban';

function captureMessage(run: () => unknown): string {
    try {
        run();
    } catch (error) {
        if (!isSeedcordError(error)) throw error;
        expect(isSeedcordError(error, undefined, SeedcordErrorCode.ReplyComponentSerialization)).toBe(true);
        return stripAnsi(error.message);
    }
    throw new Error('expected serializeReply to throw');
}

describe('serializeReply', () => {
    it('wraps a string into a TextDisplay component', () => {
        const result = serializeReply('done', ROUTE);
        expect(result.components).toHaveLength(1);
        expect(result.components[0]).toMatchObject({ type: ComponentType.TextDisplay, content: 'done' });
    });

    it('serializes each component in a ReplyResponse via its own toJSON', () => {
        const response: ReplyResponse = {
            components: [new TextDisplayBuilder().setContent('a'), new TextDisplayBuilder().setContent('b')]
        };
        const result = serializeReply(response, ROUTE);
        expect(result.components).toHaveLength(2);
        expect(result.components[0]).toMatchObject({ content: 'a' });
        expect(result.components[1]).toMatchObject({ content: 'b' });
    });

    it('carries allowedMentions and files through untouched', () => {
        const response: ReplyResponse = {
            components: [new TextDisplayBuilder().setContent('a')],
            allowedMentions: { parse: ['users'] },
            files: [{ data: new Uint8Array([1, 2]), name: 'f.txt' }]
        };
        const result = serializeReply(response, ROUTE);
        expect(result.allowedMentions).toEqual({ parse: ['users'] });
        expect(result.files).toEqual([{ data: new Uint8Array([1, 2]), name: 'f.txt' }]);
    });

    it('omits allowedMentions and files when the response has none', () => {
        const result = serializeReply({ components: [new TextDisplayBuilder().setContent('a')] }, ROUTE);
        expect(result.allowedMentions).toBeUndefined();
        expect(result.files).toBeUndefined();
    });

    it('translates a component throw into a coded error naming its index', () => {
        const response: ReplyResponse = {
            components: [new TextDisplayBuilder().setContent('ok'), new TextDisplayBuilder()]
        };
        const message = captureMessage(() => serializeReply(response, ROUTE));
        expect(message).toContain('components[1]');
        expect(message).toContain('TextDisplayBuilder');
    });

    it('translates an empty string reply', () => {
        const message = captureMessage(() => serializeReply('', ROUTE));
        expect(message).toContain('TextDisplayBuilder');
        expect(message).toContain('components[0]');
        expect(message).toContain('need at least 1 character, got an empty string');
    });

    it('translates an over-limit string reply', () => {
        const message = captureMessage(() => serializeReply('x'.repeat(5000), ROUTE));
        expect(message).toContain('need at most 4000 characters, got 5000');
    });

    it('labels a null-prototype component without crashing', () => {
        const boom = Object.create(null) as { toJSON(): never };
        boom.toJSON = () => {
            throw new Error('bad component');
        };
        const message = captureMessage(() => serializeReply({ components: [boom] }, ROUTE));
        expect(message).toContain('component at components[0]');
        expect(message).toContain('bad component');
    });

    it('labels a plain object component as component, keeping its throw message', () => {
        const boom = {
            toJSON(): never {
                throw new TypeError('inventory fetch failed');
            }
        };
        const message = captureMessage(() => serializeReply({ components: [boom] }, ROUTE));
        expect(message).toContain('component at components[0]');
        expect(message).toContain('inventory fetch failed');
        expect(message).not.toContain('Object');
    });
});
