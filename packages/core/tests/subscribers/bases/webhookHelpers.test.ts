import { describe, expect, it } from 'vitest';

import { errorReport, jsonAttachment } from '#subscribers/bases/webhookHelpers';

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

    it('reports every aggregate member under a numbered heading', () => {
        const first = new Error('mongo closed');
        first.stack = 'Error: mongo closed\n    at Mongoose.dispose';
        const second = new Error('pool stuck');
        second.stack = 'Error: pool stuck\n    at Kysely.dispose';
        const error = new AggregateError([first, second], 'two failed');
        error.stack = 'AggregateError: two failed';

        const report = errorReport(error);

        expect(report).toContain('Failure 1 of 2:');
        expect(report).toContain('at Mongoose.dispose');
        expect(report).toContain('Failure 2 of 2:');
        expect(report).toContain('at Kysely.dispose');
    });

    it('gives each member an equal share so a late member survives the cap', () => {
        const members = Array.from({ length: 6 }, (_, i) => {
            const member = new Error(`member-${i}`);
            member.stack = `Error: member-${i}\n${'    at frame\n'.repeat(80)}`;
            return member;
        });
        const error = new AggregateError(members, 'six failed');
        error.stack = 'AggregateError: six failed';

        const report = errorReport(error);

        expect(report.length).toBeLessThanOrEqual(1800);
        expect(report).toContain('member-0');
        expect(report).toContain('member-5');
    });
});
