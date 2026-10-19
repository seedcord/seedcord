import { describe, expect, it } from 'vitest';

import { twinDocument } from '#src/twin';

describe('twinDocument', () => {
    it('puts the title, description and byline above the body', () => {
        const doc = twinDocument({
            title: 'Options',
            description: 'Reading input.',
            byline: 'By Dhruv.',
            body: 'Prose.\n'
        });

        expect(doc).toBe('# Options\n\nReading input.\n\nBy Dhruv.\n\nProse.\n');
    });

    it('goes straight to the body when a page carries no description', () => {
        expect(twinDocument({ title: 'Options', body: 'Prose.\n' })).toBe('# Options\n\nProse.\n');
    });

    // the stringified body opens on a blank line
    it('leaves one blank line above the body', () => {
        expect(twinDocument({ title: 'Options', body: '\n\nProse.\n' })).toBe('# Options\n\nProse.\n');
    });
});
