import { describe, expect, it } from 'vitest';

import { Container, TextDisplay, h, toComponentEmbed } from '#src/index';
import { jsx, jsxs } from '#src/jsx-runtime';

describe('the production jsx runtime', () => {
    it('builds the same payload as h from jsx and jsxs', () => {
        const tree = jsxs(Container, {
            children: [jsx(TextDisplay, { children: 'one' }), jsx(TextDisplay, { children: 'two' })]
        });

        expect(toComponentEmbed(tree)).toEqual(
            toComponentEmbed(h(Container, null, h(TextDisplay, null, 'one'), h(TextDisplay, null, 'two')))
        );
    });
});
