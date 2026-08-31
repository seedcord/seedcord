import { describe, expect, it } from 'vitest';

import { neighboursOf } from '#lib/neighbours';

const ORDER = [
    { tab: 'Start', label: 'Introduction', href: '/' },
    { tab: 'Start', label: 'Gateway or http', href: '/gateway-or-http' },
    { tab: 'Commands', label: 'Commands', href: '/commands' }
];

describe('the pages either side of the one being read', () => {
    it('reads both off the guide order', () => {
        expect(neighboursOf(ORDER, '/gateway-or-http')).toEqual({ previous: ORDER[0], next: ORDER[2] });
    });

    it('leaves the first page without a previous and the last without a next', () => {
        expect(neighboursOf(ORDER, '/')).toEqual({ next: ORDER[1] });
        expect(neighboursOf(ORDER, '/commands')).toEqual({ previous: ORDER[1] });
    });

    it('offers nothing for a page the order never lists', () => {
        expect(neighboursOf(ORDER, '/nowhere')).toEqual({});
    });
});
