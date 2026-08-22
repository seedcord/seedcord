import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { TypeHover } from '#components/TypeHover';

const TOKEN_SELECTOR = '.twoslash-hover';

// shiki wraps a multi-line type in a focusable pre of its own
const token = (symbol: string): string =>
    `<span class="twoslash-hover" data-ref-pkg="gateway" data-ref-symbol="${symbol}">` +
    `<span class="twoslash-popup-container"><code class="twoslash-popup-code">` +
    `<pre class="shiki" tabindex="0">class ${symbol}</pre></code></span>` +
    `${symbol}</span>`;

const TOKEN_HTML = token('SlashHandler');

function renderToken(): HTMLElement {
    render(
        <TypeHover>
            <div dangerouslySetInnerHTML={{ __html: TOKEN_HTML }} />
        </TypeHover>
    );

    const token = document.querySelector('.twoslash-hover');
    if (!(token instanceof HTMLElement)) throw new Error('no token rendered');

    return token;
}

function pointer(token: HTMLElement, type: string, pointerType: string): void {
    token.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerType }));
}

const isOpen = (): boolean => document.querySelector('[data-radix-popper-content-wrapper]') !== null;

const settle = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

describe('the type hover', () => {
    it('keeps the popup open after a tap', async () => {
        const token = renderToken();

        pointer(token, 'pointerover', 'touch');
        pointer(token, 'pointerdown', 'touch');
        pointer(token, 'pointerup', 'touch');
        token.click();
        // the browser destroys a touch pointer the moment the finger lifts
        pointer(token, 'pointerout', 'touch');

        await waitFor(() => expect(isOpen()).toBe(true));
        await settle(300);

        expect(isOpen()).toBe(true);
    });

    it('closes when the mouse leaves the token', async () => {
        const token = renderToken();

        pointer(token, 'pointerover', 'mouse');
        await waitFor(() => expect(isOpen()).toBe(true));

        pointer(token, 'pointerout', 'mouse');

        await waitFor(() => expect(isOpen()).toBe(false));
    });

    it('marks the open token so touch gets an underline too', async () => {
        const token = renderToken();

        pointer(token, 'pointerover', 'mouse');
        await waitFor(() => expect(isOpen()).toBe(true));

        expect(token).toHaveAttribute('data-type-hover-open');

        pointer(token, 'pointerout', 'mouse');
        await waitFor(() => expect(isOpen()).toBe(false));

        expect(token).not.toHaveAttribute('data-type-hover-open');
    });

    describe('from the keyboard', () => {
        function renderBlock(): HTMLElement {
            render(
                <TypeHover>
                    <div dangerouslySetInnerHTML={{ __html: token('SlashHandler') + token('Paginator') }} />
                </TypeHover>
            );
            const block = document.querySelector('[role="group"]');
            if (!(block instanceof HTMLElement)) throw new Error('no block rendered');

            return block;
        }

        const shownSymbol = (): string | null =>
            document.querySelector('[data-radix-popper-content-wrapper] a')?.textContent?.match(/Read (\w+)/)?.[1] ??
            null;

        it('costs one tab stop per code block', () => {
            const block = renderBlock();

            expect(block.tabIndex).toBe(0);
            expect(block.querySelectorAll(`${TOKEN_SELECTOR}[tabindex]`)).toHaveLength(0);
        });

        // highlightToHtml renders each block once per theme and hides one with css
        it('skips the tokens in the hidden theme copy', async () => {
            render(
                <TypeHover>
                    <div>
                        <div style={{ display: 'none' }} dangerouslySetInnerHTML={{ __html: token('HiddenCopy') }} />
                        <div dangerouslySetInnerHTML={{ __html: token('SlashHandler') }} />
                    </div>
                </TypeHover>
            );
            const block = document.querySelector('[role="group"]');
            if (!(block instanceof HTMLElement)) throw new Error('no block rendered');
            block.focus();

            await userEvent.keyboard('{ArrowRight}');

            await waitFor(() => expect(isOpen()).toBe(true));
            expect(shownSymbol()).toBe('SlashHandler');
        });

        it('drops the tab stop shiki puts inside the type', async () => {
            const block = renderBlock();
            block.focus();

            await userEvent.keyboard('{ArrowRight}');
            await waitFor(() => expect(isOpen()).toBe(true));

            const popup = document.querySelector('[data-radix-popper-content-wrapper]');
            expect(popup?.querySelector('[tabindex="0"]')).toBeNull();
        });

        it('opens the first type on arrow right', async () => {
            const block = renderBlock();
            block.focus();

            await userEvent.keyboard('{ArrowRight}');

            await waitFor(() => expect(isOpen()).toBe(true));
            expect(shownSymbol()).toBe('SlashHandler');
        });

        it('walks to the next token', async () => {
            const block = renderBlock();
            block.focus();

            await userEvent.keyboard('{ArrowRight}{ArrowRight}');

            await waitFor(() => expect(shownSymbol()).toBe('Paginator'));
        });

        it('moves focus into the popup so the reference link is reachable', async () => {
            const block = renderBlock();
            block.focus();

            await userEvent.keyboard('{ArrowRight}');

            await waitFor(() => {
                const popup = document.querySelector('[data-radix-popper-content-wrapper]');
                expect(popup?.contains(document.activeElement)).toBe(true);
            });
        });

        it('leaves focus alone when a mouse opens the popup', async () => {
            renderBlock();
            const target = document.querySelector('.twoslash-hover');
            if (!(target instanceof HTMLElement)) throw new Error('no token');

            pointer(target, 'pointerover', 'mouse');
            await waitFor(() => expect(isOpen()).toBe(true));

            const popup = document.querySelector('[data-radix-popper-content-wrapper]');
            expect(popup?.contains(document.activeElement)).toBe(false);
        });

        it('lets tab leave the block while a type is open', async () => {
            const block = renderBlock();
            document.body.append(document.createElement('button'));
            block.focus();
            await userEvent.keyboard('{ArrowRight}');
            await waitFor(() => expect(isOpen()).toBe(true));

            await userEvent.tab();

            await waitFor(() => expect(document.activeElement).not.toBe(block));
        });

        it('closes on escape and keeps focus in the block', async () => {
            const block = renderBlock();
            block.focus();
            await userEvent.keyboard('{ArrowRight}');
            await waitFor(() => expect(isOpen()).toBe(true));

            await userEvent.keyboard('{Escape}');

            await waitFor(() => expect(isOpen()).toBe(false));
            expect(document.activeElement).toBe(block);
        });

        it('closes when focus leaves for something else on the page', async () => {
            const block = renderBlock();
            const elsewhere = document.createElement('button');
            document.body.append(elsewhere);
            block.focus();
            await userEvent.keyboard('{ArrowRight}');
            await waitFor(() => expect(isOpen()).toBe(true));

            elsewhere.focus();

            await waitFor(() => expect(isOpen()).toBe(false));
        });
    });

    it('closes when the window resizes out from under the anchor', async () => {
        const token = renderToken();

        pointer(token, 'pointerover', 'mouse');
        await waitFor(() => expect(isOpen()).toBe(true));

        window.dispatchEvent(new Event('resize'));

        await waitFor(() => expect(isOpen()).toBe(false));
    });
});
