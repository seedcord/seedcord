import { describe, expect, it } from 'vitest';

import { errorReport } from '@subscribers/bases/webhookHelpers';

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
