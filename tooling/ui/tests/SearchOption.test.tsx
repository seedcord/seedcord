import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

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

describe('SearchOption', () => {
    it('selects on a plain click and keeps the browser from following the link', () => {
        const onSelect = vi.fn();

        const followed = fireEvent.click(option(onSelect));

        expect(onSelect).toHaveBeenCalledOnce();
        expect(followed).toBe(false);
    });

    it('leaves a cmd-click to the browser so it opens a new tab', () => {
        const onSelect = vi.fn();

        const followed = fireEvent.click(option(onSelect), { metaKey: true });

        expect(onSelect).not.toHaveBeenCalled();
        expect(followed).toBe(true);
    });
});
