import { describe, expect, it } from 'vitest';

import { SeedcordErrorCode } from '@src/index';
import { SeedcordError } from '@src/internal.index';

// chalk styles the messages
const stripAnsi = (input: string): string => input.replaceAll(/\[[0-9;]*m/g, '');

describe('reply surface error codes', () => {
    it('assigns ReplyIllegalAckState to 1501', () => {
        expect(SeedcordErrorCode.ReplyIllegalAckState).toBe(1501);
    });

    it('assigns ReplyComponentSerialization to 1502', () => {
        expect(SeedcordErrorCode.ReplyComponentSerialization).toBe(1502);
    });

    it('names the illegal method, reason, alternative, and route in an ack-state message', () => {
        const error = new SeedcordError(SeedcordErrorCode.ReplyIllegalAckState, [
            'reply',
            'this interaction was already replied to',
            'Use followUp() for a new message or edit() to rewrite the reply.',
            'slash:ban'
        ]);

        const message = stripAnsi(error.message);
        expect(message).toContain('reply()');
        expect(message).toContain('this interaction was already replied to');
        expect(message).toContain('Use followUp() for a new message or edit() to rewrite the reply.');
        expect(message).toContain('route slash:ban');
    });

    it('names the component class, index, failing detail, and route in a serialization message', () => {
        const error = new SeedcordError(SeedcordErrorCode.ReplyComponentSerialization, [
            'TextDisplayBuilder',
            0,
            'content: Expected a string primitive',
            'slash:ban'
        ]);

        const message = stripAnsi(error.message);
        expect(message).toContain('TextDisplayBuilder');
        expect(message).toContain('components[0]');
        expect(message).toContain('content: Expected a string primitive');
        expect(message).toContain('route slash:ban');
    });

    it('assigns ReplyForeignEditTarget to 1503', () => {
        expect(SeedcordErrorCode.ReplyForeignEditTarget).toBe(1503);
    });

    it('names the calling method, the foreign id, and the accepted sources in a foreign target message', () => {
        const error = new SeedcordError(SeedcordErrorCode.ReplyForeignEditTarget, ['edit', 'msg-9', 'slash:ban']);

        const message = stripAnsi(error.message);
        expect(message).toContain('edit()');
        expect(message).toContain('msg-9');
        expect(message).toContain('reply()');
        expect(message).toContain('route slash:ban');
    });

    it('renders the calling method name for a delete target', () => {
        const error = new SeedcordError(SeedcordErrorCode.ReplyForeignEditTarget, ['delete', 'msg-3', 'slash:ban']);

        const message = stripAnsi(error.message);
        expect(message).toContain('delete()');
        expect(message).toContain('msg-3');
        expect(message).toContain('reply()');
        expect(message).toContain('route slash:ban');
    });

    it('assigns ReplyUpdateWithoutSource to 1504', () => {
        expect(SeedcordErrorCode.ReplyUpdateWithoutSource).toBe(1504);
    });

    it('points update on a command-opened modal at reply and defer', () => {
        const error = new SeedcordError(SeedcordErrorCode.ReplyUpdateWithoutSource, ['update', 'slash:ban']);

        const message = stripAnsi(error.message);
        expect(message).toContain('update()');
        expect(message).toContain('reply()');
        expect(message).toContain('defer()');
        expect(message).toContain('route slash:ban');
    });

    it('assigns ReplyCallbackMissingMessage to 1505', () => {
        expect(SeedcordErrorCode.ReplyCallbackMissingMessage).toBe(1505);
    });

    it('names the method whose callback carried no message', () => {
        const error = new SeedcordError(SeedcordErrorCode.ReplyCallbackMissingMessage, ['reply', 'slash:ban']);

        const message = stripAnsi(error.message);
        expect(message).toContain('reply()');
        expect(message).toContain('no message');
        expect(message).toContain('route slash:ban');
    });
});
