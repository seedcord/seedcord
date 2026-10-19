import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CodeCard } from '#components/code/CodeCard';

const textOf = (html: string): string => html.replaceAll(/<[^>]+>/g, '');

describe('CodeCard', () => {
    it("keeps the first line's indentation and drops blank lines around the code", async () => {
        const html = renderToStaticMarkup(
            await CodeCard({ code: '\n    indented();\nflush();\n\n', filename: 'a.ts' })
        );

        expect(textOf(html)).toBe('a.ts    indented();\nflush();');
    });
});
