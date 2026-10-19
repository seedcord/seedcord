import { describe, expect, it } from 'vitest';

import { linkTarget } from '#components/ui/linkTarget';

describe('linkTarget', () => {
    it.each(['/blog/', 'https://seedcord.org/guide', 'https://seedcord.org/docs/packages/core'])(
        'opens %s in the same tab',
        (href) => {
            expect(linkTarget(href)).toEqual({});
        }
    );

    it.each([
        'https://github.com/seedcord/seedcord',
        'https://discord.gg/DzFxY58WXf',
        'https://www.npmjs.com/package/seedcord'
    ])('opens %s in a new tab', (href) => {
        expect(linkTarget(href)).toEqual({ target: '_blank', rel: 'noreferrer' });
    });
});
