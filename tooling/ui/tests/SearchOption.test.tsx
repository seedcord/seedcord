import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';

import { SearchOption } from '#src/SearchOption';

function option(onSelect: () => void): HTMLElement {
    render(
        <SearchOption
            id="cooldown"
            href="/checks/cooldown/"
            label="Cooldowns"
            isActive={false}
            onSelect={onSelect}
            onActivate={() => {}}
        >
            Cooldowns
        </SearchOption>
    );
    return screen.getByRole('option', { name: 'Cooldowns' });
}

// whether the option let the browser follow its link. jsdom logs "Not implemented: navigation" for a click it follows
function follows(element: HTMLElement, init: MouseEventInit = {}): boolean {
    let followed = false;
    const record = (event: Event): void => {
        followed = !event.defaultPrevented;
        event.preventDefault();
    };
    document.addEventListener('click', record);
    fireEvent.click(element, init);
    document.removeEventListener('click', record);
    return followed;
}

describe('SearchOption', () => {
    it('selects on a plain click and keeps the browser from following the link', () => {
        const onSelect = vi.fn();

        const followed = follows(option(onSelect));

        expect(onSelect).toHaveBeenCalledOnce();
        expect(followed).toBe(false);
    });

    it('leaves a cmd-click to the browser so it opens a new tab', () => {
        const onSelect = vi.fn();

        const followed = follows(option(onSelect), { metaKey: true });

        expect(onSelect).not.toHaveBeenCalled();
        expect(followed).toBe(true);
    });
});
