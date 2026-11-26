import { describe, expect, it } from 'vite-plus/test';

import { importedNames } from '#commands/dev/runtime/importedNames';

describe('importedNames', () => {
    it("lists the exports a module reads from each source, 'all' for import * or export *, and skips types", () => {
        const code = [
            "import type { Options } from './options';",
            "import { Web as Site, type WebConfig } from './Web';",
            "import PORT, * as settings from './settings';",
            "import './side-effect';",
            "export { greeting } from './greeting';",
            "import { farewell } from './greeting';",
            "export * from './more';",
            'export const local = 1;'
        ].join('\n');

        expect(Object.fromEntries(importedNames(code, 'bot.ts'))).toEqual({
            './options': [],
            './Web': ['Web'],
            './settings': 'all',
            './side-effect': [],
            './greeting': ['farewell', 'greeting'],
            './more': 'all'
        });
    });
});
