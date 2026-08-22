import { render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TypeHover } from '#components/TypeHover';

const TOKEN_HTML =
    '<span class="twoslash-hover" data-ref-pkg="gateway" data-ref-symbol="SlashHandler">' +
    '<span class="twoslash-popup-container"><code class="twoslash-popup-code">class SlashHandler</code></span>' +
    'SlashHandler</span>';

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

    it('closes when the window resizes out from under the anchor', async () => {
        const token = renderToken();

        pointer(token, 'pointerover', 'mouse');
        await waitFor(() => expect(isOpen()).toBe(true));

        window.dispatchEvent(new Event('resize'));

        await waitFor(() => expect(isOpen()).toBe(false));
    });
});
