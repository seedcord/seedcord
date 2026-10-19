import { TSDocParser } from '@microsoft/tsdoc';
import { describe, expect, it } from 'vite-plus/test';

import { buildComment } from '#model/tsdoc-comment';

import type { DocComment } from '#src/types';

function comment(...lines: string[]): DocComment | null {
    const source = ['/**', ...lines.map((line) => ` * ${line}`), ' */'].join('\n');
    return buildComment(new TSDocParser().parseString(source).docComment, () => undefined);
}

describe('buildComment', () => {
    it('keeps a fenced block in the summary apart from inline code, with its language', () => {
        const parts = comment('Reads a `wire`.', '', '```ts', 'const a = 1;', 'const b = 2;', '```')?.summaryParts;

        expect(parts).toContainEqual({ kind: 'code', text: 'wire' });
        expect(parts).toContainEqual({ kind: 'fence', language: 'ts', text: 'const a = 1;\nconst b = 2;\n' });
    });
});
