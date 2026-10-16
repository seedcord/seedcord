import { describe, expect, it } from 'vitest';

import { skippedNote } from '#src/commands/scopes';

describe('skippedNote', () => {
    it('lists the skipped scopes and says why', () => {
        expect(skippedNote(['global', 'Alpha'])).toBe(
            'Skipped global and Alpha. Their commands match the last deploy.'
        );
    });

    it('says its for one skipped scope', () => {
        expect(skippedNote(['global'])).toBe('Skipped global. Its commands match the last deploy.');
    });
});
