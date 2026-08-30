import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Ref } from '#components/Ref';
import { DOCS_URL } from '#lib/site';

function hrefOf(name: string): string | null {
    return screen.getByRole('link', { name }).getAttribute('href');
}

describe('Ref', () => {
    it('derives the slug from the symbol', () => {
        render(
            <Ref pkg="core" symbol="Notice">
                Notice
            </Ref>
        );

        expect(hrefOf('Notice')).toBe(`${DOCS_URL}/packages/core/latest/notice`);
    });

    it('kebab-cases a multi-word name the way the reference site does', () => {
        render(
            <Ref pkg="gateway" symbol="SlashHandler">
                SlashHandler
            </Ref>
        );

        expect(hrefOf('SlashHandler')).toBe(`${DOCS_URL}/packages/gateway/latest/slash-handler`);
    });

    it.each(['Paginator.start', 'Paginator#start'])('anchors %s on the page of its owner', (symbol) => {
        render(
            <Ref pkg="core" symbol={symbol}>
                {symbol}
            </Ref>
        );

        expect(hrefOf(symbol)).toBe(`${DOCS_URL}/packages/core/latest/paginator#start`);
    });

    it('reaches the package page when the symbol is empty', () => {
        render(
            <Ref pkg="plugin-mongoose" symbol="">
                @seedcord/plugin-mongoose
            </Ref>
        );

        expect(hrefOf('@seedcord/plugin-mongoose')).toBe(`${DOCS_URL}/packages/plugin-mongoose/latest`);
    });

    it('drops a generic from the symbol', () => {
        render(
            <Ref pkg="core" symbol="Plugin<Options>">
                Plugin&lt;Options&gt;
            </Ref>
        );

        expect(hrefOf('Plugin<Options>')).toBe(`${DOCS_URL}/packages/core/latest/plugin`);
    });

    it('takes link text unrelated to the symbol', () => {
        render(
            <Ref pkg="core" symbol="Notice">
                the card a refusal renders
            </Ref>
        );

        expect(hrefOf('the card a refusal renders')).toBe(`${DOCS_URL}/packages/core/latest/notice`);
    });

    it('opens the reference site in a new tab', () => {
        render(
            <Ref pkg="core" symbol="Notice">
                Notice
            </Ref>
        );
        const link = screen.getByRole('link', { name: 'Notice' });

        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    });
});
