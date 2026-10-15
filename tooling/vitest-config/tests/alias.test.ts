import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createViteServer } from 'vitest/node';

import { createVitestConfig } from '#src/index';

const fixtureConfigUrl = new URL('./fixtures/vitest.config.ts', import.meta.url).toString();
const fixture = (path: string): string => fileURLToPath(new URL(`./fixtures/${path}`, import.meta.url));

describe('createVitestConfig aliases', () => {
    let server: Awaited<ReturnType<typeof createViteServer>>;

    beforeAll(async () => {
        server = await createViteServer({
            configFile: false,
            root: fixture(''),
            logLevel: 'silent',
            server: { middlewareMode: true },
            resolve: { alias: createVitestConfig(fixtureConfigUrl).resolve?.alias ?? [] }
        });
    });

    afterAll(async () => {
        await server.close();
    });

    it.each([
        ['a wildcard path', '#src/flat', 'src/flat.ts'],
        ['an exact path', '#flat', 'src/flat.ts'],
        ['an exact path listed after a shorter one it starts with', '#flat/sub', 'src/sub.ts'],
        ['a wildcard path listed after a shorter one it starts with', '#src/nested/sub', 'nested/sub.ts']
    ])('resolves %s from a jsonc tsconfig', async (_label, specifier, target) => {
        const resolved = await server.pluginContainer.resolveId(specifier);
        expect(resolved?.id).toBe(fixture(target));
    });
});
