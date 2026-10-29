import Handlebars from 'handlebars';
import { describe, expect, it } from 'vitest';

import { TAKEN_NAMES } from '#src/helperNames';

describe('TAKEN_NAMES', () => {
    it('holds every helper Handlebars registers', () => {
        const missing = Object.keys(Handlebars.create().helpers).filter((name) => !TAKEN_NAMES.has(name));

        expect(missing).toEqual([]);
    });
});
