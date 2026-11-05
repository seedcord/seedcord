import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, it } from 'vite-plus/test';
import { createViteServer } from 'vite-plus/test/node';

const fixture = (path: string): string => fileURLToPath(new URL(`./fixtures/${path}`, import.meta.url));

describe('createVitestConfig aliases', () => {
    let server: Awaited<ReturnType<typeof createViteServer>>;

    beforeAll(async () => {
        server = await createViteServer({
            configFile: false,
            root: fixture(''),
            logLevel: 'silent',
            server: { middlewareMode: true }
        });
    });

    afterAll(async () => {
        await server.close();
    });

    it.each([
        ['a wildcard path', '#src/flat', 'src/flat.ts'],
        ['an exact path', '#flat', 'src/flat.ts'],
        ['an exact path listed after a shorter one it starts with', '#flat/sub', 'src/sub.ts'],
        ['a wildcard path listed after a shorter one it starts with', '#src/nested/sub', 'nested/sub.ts'],
        // a Windows target ends in a backslash. it hits this same case
        ['a wildcard path whose target does not end in a slash', '#lib/flat', 'src/lib-flat.ts']
    ])('resolves %s from a jsonc tsconfig', async (_label, specifier, target) => {
        const resolved = await server.pluginContainer.resolveId(specifier);
        // vite writes ids with forward slashes on Windows too
        expect(resolved?.id).toBe(fixture(target).replaceAll('\\', '/'));
    });
});
