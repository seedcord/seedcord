import { join } from 'node:path';
import { stripVTControlCharacters } from 'node:util';

import { describe, expect, it } from 'vitest';

import { paint } from '#src/index';

function shown(path: string): string {
    return stripVTControlCharacters(paint.path(path));
}

describe('paint.path', () => {
    it('shows a path under the working directory relative to it', () => {
        expect(shown(join(process.cwd(), 'src', 'handlers'))).toBe(join('src', 'handlers'));
    });

    it('shows the working directory itself as ./', () => {
        expect(shown(process.cwd())).toBe('./');
    });

    it('shows a path with a trailing slash the same as one without', () => {
        expect(shown(`${process.cwd()}/`)).toBe('./');
        expect(shown(`${join(process.cwd(), 'src')}/`)).toBe('src');
    });

    it('keeps a path outside the working directory absolute', () => {
        const outside = join(process.cwd(), '..', 'elsewhere');

        expect(shown(outside)).toBe(outside);
    });

    it('keeps a sibling that shares the working directory as a prefix absolute', () => {
        const sibling = `${process.cwd()}-sibling`;

        expect(shown(sibling)).toBe(sibling);
    });

    it('leaves a relative path as written', () => {
        expect(shown('./handlers')).toBe('./handlers');
    });
});
