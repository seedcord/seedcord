import { join } from 'node:path';
import { stripVTControlCharacters } from 'node:util';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { paint } from '#src/index';

function shown(path: string): string {
    return stripVTControlCharacters(paint.path(path));
}

describe('paint.path', () => {
    it('shows a path under the working directory relative to it', () => {
        expect(shown(join(process.cwd(), 'src', 'handlers'))).toBe('src/handlers');
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

        expect(shown(outside)).toBe(outside.replaceAll('\\', '/'));
    });

    it('keeps a sibling that shares the working directory as a prefix absolute', () => {
        const sibling = `${process.cwd()}-sibling`;

        expect(shown(sibling)).toBe(sibling.replaceAll('\\', '/'));
    });

    it('leaves a relative path as written', () => {
        expect(shown('./handlers')).toBe('./handlers');
    });
});

describe('paint.path on Windows', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('shows a path under the working directory with forward slashes', () => {
        vi.spyOn(process, 'cwd').mockReturnValue(String.raw`C:\bot`);

        expect(shown(String.raw`C:\bot\src\handlers`)).toBe('src/handlers');
    });

    it('shows a path outside the working directory with forward slashes', () => {
        vi.spyOn(process, 'cwd').mockReturnValue(String.raw`C:\bot`);

        expect(shown(String.raw`D:\shared\handlers`)).toBe('D:/shared/handlers');
    });
});
