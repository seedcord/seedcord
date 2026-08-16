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
    it('breaks a triple-backtick run so the downstream code block cannot close early', () => {
        const error = new Error('boom');
        error.stack = 'Error: boom ``` still open ``` end';

        expect(errorReport(error)).not.toContain('```');
    });

    it('breaks a triple-backtick run carried by the cause', () => {
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

    it('keeps the dropped count when the parent stack fills the budget', () => {
        const members = Array.from({ length: 40 }, (_, i) => new Error(`member-${i}`));
        const error = new AggregateError(members, 'forty failed');
        error.stack = `AggregateError: forty failed\n${'    at frame\n'.repeat(200)}`;

        const report = errorReport(error);

        expect(report.length).toBeLessThanOrEqual(1800);
        expect(report).toContain('and 40 more failures');
    });

    it('never drops a member without counting it when a stack carries backticks', () => {
        const members = Array.from({ length: 40 }, (_, i) => {
            const member = new Error(`member-${i}`);
            member.stack = `Error: \`\`\`member-${i}\`\`\`\n${'    at frame\n'.repeat(60)}`;
            return member;
        });
        const error = new AggregateError(members, 'forty failed');
        error.stack = 'AggregateError: forty failed';

        const report = errorReport(error);
        const shown = report.match(/Failure \d+ of 40:/gu)?.length ?? 0;
        const counted = Number(/and (\d+) more failures/u.exec(report)?.[1] ?? 0);

        expect(report.length).toBeLessThanOrEqual(1800);
        expect(shown + counted).toBe(40);
    });

    it('never drops a member without counting it', () => {
        const members = Array.from({ length: 40 }, (_, i) => {
            const member = new Error(`member-${i}`);
            member.stack = `Error: member-${i}\n${'    at frame\n'.repeat(60)}`;
            return member;
        });
        const error = new AggregateError(members, 'forty failed');
        error.stack = 'AggregateError: forty failed';

        const report = errorReport(error);
        const shown = report.match(/Failure \d+ of 40:/gu)?.length ?? 0;
        const counted = Number(/and (\d+) more failures/u.exec(report)?.[1] ?? 0);

        expect(report.length).toBeLessThanOrEqual(1800);
        expect(shown + counted).toBe(40);
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
