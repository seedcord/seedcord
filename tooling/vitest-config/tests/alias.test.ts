import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { aliasFromTsconfig } from '#src/index';

const fixtureConfigUrl = new URL('./fixtures/vitest.config.ts', import.meta.url).toString();

describe('aliasFromTsconfig', () => {
    it('derives prefix aliases from a jsonc tsconfig with paths', () => {
        expect(aliasFromTsconfig(fixtureConfigUrl)).toEqual({
            '#src/': fileURLToPath(new URL('./fixtures/src/', import.meta.url)),
            '#flat': fileURLToPath(new URL('./fixtures/src/flat.ts', import.meta.url))
        });
    });
});
