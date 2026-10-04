import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

import createConfig from '#src/index';

import type { SeedcordConfigOptions } from '#src/index';

const RULE = 'no-restricted-imports';

async function reportsFor(code: string, options: SeedcordConfigOptions): Promise<string[]> {
    const eslint = new ESLint({
        overrideConfigFile: true,
        overrideConfig: createConfig({ tsconfigRootDir: process.cwd(), ...options })
    });
    const [result] = await eslint.lintText(code, { filePath: 'src/example.js' });
    return (result?.messages ?? []).flatMap((message) => (message.ruleId === RULE ? [message.message] : []));
}

const PARENT = "import { a } from '../a';\nexport { a };\n";
const SIBLING = "import { a } from './a';\nexport { a };\n";
const ALIASED = "import { a } from '#src/a';\nexport { a };\n";

describe('createConfig relativeImports', () => {
    it('lets a parent import through by default', async () => {
        expect(await reportsFor(PARENT, {})).toEqual([]);
    });

    it("reports a parent import with 'parent'", async () => {
        expect(await reportsFor(PARENT, { relativeImports: 'parent' })).toHaveLength(1);
    });

    it("lets a sibling import and an alias through with 'parent'", async () => {
        expect(await reportsFor(SIBLING, { relativeImports: 'parent' })).toEqual([]);
        expect(await reportsFor(ALIASED, { relativeImports: 'parent' })).toEqual([]);
    });

    it('reports with the import plugin off, as the Next apps run it', async () => {
        expect(await reportsFor(PARENT, { relativeImports: 'parent', registerImportPlugin: 'off' })).toHaveLength(1);
    });

    it('throws on a value it does not know', () => {
        // justified: a plain js config file can pass any string
        expect(() => createConfig({ relativeImports: 'siblings' as 'parent' })).toThrow(/relativeImports/);
    });
});
