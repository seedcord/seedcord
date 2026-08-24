import { MotionProvider } from '@seedcord/ui';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TableOfContents } from '#components/TableOfContents';

import type { TOCItemType } from 'fumadocs-core/toc';

const TITLES = ['Two', 'Three', 'Four'] as const;

const NESTED: readonly TOCItemType[] = TITLES.map((title, index) => ({
    title,
    url: `#${title.toLowerCase()}`,
    depth: index + 2
}));

const INDENT_PREFIX = 'ps-';

function indentOfRow(title: string): number {
    const row = screen.getByRole('link', { name: title });
    const found = row.className.split(/\s+/).find((name) => name.startsWith(INDENT_PREFIX));
    if (found === undefined) throw new Error(`no ${INDENT_PREFIX}* class on the ${title} row`);
    return Number(found.slice(INDENT_PREFIX.length));
}

describe('TableOfContents', () => {
    it('indents one step further for every heading level', () => {
        render(
            <MotionProvider>
                <TableOfContents items={NESTED} activeIds={[]} />
            </MotionProvider>
        );

        const steps = TITLES.map((title) => indentOfRow(title));

        for (const [index, step] of steps.entries()) {
            if (index === 0) continue;
            expect(step).toBeGreaterThan(steps[index - 1] ?? 0);
        }
    });
});
