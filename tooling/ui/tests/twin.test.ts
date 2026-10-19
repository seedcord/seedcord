import { describe, expect, it } from 'vitest';

import { twinDocument } from '#lib/twin';

describe('the document a twin serves', () => {
    it('opens on the page title, which the body never carries', () => {
        const doc = twinDocument({ title: 'Options', description: 'Reading input.', body: 'Some prose.\n' });

        expect(doc).toBe('# Options\n\nReading input.\n\nSome prose.\n');
    });

    it('goes straight to the body when a page carries no description', () => {
        expect(twinDocument({ title: 'Options', body: 'Some prose.\n' })).toBe('# Options\n\nSome prose.\n');
    });

    // the stringified body opens on a blank line
    it('leaves one blank line between the description and the body', () => {
        const doc = twinDocument({ title: 'Options', description: 'Reading input.', body: '\n\nSome prose.\n' });

        expect(doc).toBe('# Options\n\nReading input.\n\nSome prose.\n');
    });
});
