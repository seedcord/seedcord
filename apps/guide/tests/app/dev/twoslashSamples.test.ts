import { describe, expect, it } from 'vitest';

import { SAMPLES } from '#src/app/dev/twoslash/samples';
import { twoslashBlock } from '#lib/twoslash';

// a sample that stops compiling ends the static export
describe('the twoslash dev samples', () => {
    it.each(SAMPLES.map((sample) => [sample.heading, sample.code] as const))('%s compiles', async (_heading, code) => {
        const { html, text } = await twoslashBlock(code, 'ts', true);

        expect(html).toContain('twoslash');
        expect(text).not.toContain('@errors');
    });
});
