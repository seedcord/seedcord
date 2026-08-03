import { describe, expect, it } from 'vitest';

import { errorReport, jsonAttachment } from '@subscribers/bases/webhookHelpers';

describe('jsonAttachment', () => {
    it('encodes the json to bytes, which is what @discordjs/rest uploads as a file', () => {
        const file = jsonAttachment('metadata.json', 'error metadata', { userId: '1' });

        expect(file.data).toBeInstanceOf(Uint8Array);
        expect(new TextDecoder().decode(file.data)).toBe(JSON.stringify({ userId: '1' }, undefined, 2));
    });

    it('drops circular references so the encode cannot throw', () => {
        const circular: Record<string, unknown> = { name: 'a' };
        circular.self = circular;

        expect(() => jsonAttachment('m.json', 'd', circular)).not.toThrow();
    });
});

describe('errorReport', () => {
    it('neutralizes triple-backtick fences so the downstream code block cannot break', () => {
        const error = new Error('boom');
        error.stack = 'Error: boom ``` still open ``` end';

        expect(errorReport(error)).not.toContain('```');
    });

    it('neutralizes a fence carried by the cause', () => {
        const cause = new Error('inner');
        cause.stack = 'Error: inner ``` broken';
        const error = new Error('outer', { cause });
        error.stack = 'Error: outer';

        expect(errorReport(error)).not.toContain('```');
    });
});
