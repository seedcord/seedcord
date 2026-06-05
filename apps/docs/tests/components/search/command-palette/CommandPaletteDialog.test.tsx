import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MotionProvider } from '@components/providers/MotionProvider';
import { CommandPaletteDialog } from '@components/search/command-palette/CommandPaletteDialog';
import { COMMAND_LISTBOX_ID } from '@components/search/command-palette/constants';

import type { CommandAction, SearchGroup } from '@components/search/command-palette/types';
import type { CommandPaletteController } from '@components/search/command-palette/useCommandPaletteController';
import type { ReactElement } from 'react';

const { searchHook } = vi.hoisted(() => ({ searchHook: vi.fn() }));

vi.mock('@components/search/command-palette/useCommandPaletteSearch', () => ({
    useCommandPaletteSearch: searchHook
}));

const RESULTS: CommandAction[] = [
    { id: 'a', label: 'Alpha', path: '/a', href: '/a', kind: 'page' },
    { id: 'b', label: 'Beta', path: '/b', href: '/b', kind: 'class' },
    { id: 'c', label: 'Gamma', path: '/c', href: '/c', kind: 'function' }
];

const optionId = (id: string): string => `command-option-${id}`;
const groupOf = (results: CommandAction[]): SearchGroup[] => [{ label: 'seedcord', current: true, results }];

function makeController(overrides: Partial<CommandPaletteController> = {}): CommandPaletteController {
    return {
        open: true,
        mounted: true,
        searchValue: 'alpha',
        scope: 'all',
        kind: 'all',
        packages: [],
        inputRef: { current: null },
        handleOpenChange: vi.fn(),
        handleValueChange: vi.fn(),
        handleScopeChange: vi.fn(),
        handleKindChange: vi.fn(),
        handleClose: vi.fn(),
        handleSelect: vi.fn(),
        ...overrides
    };
}

function renderDialog(controller: CommandPaletteController): {
    rerender: (next: CommandPaletteController) => void;
} {
    const ui = (next: CommandPaletteController): ReactElement => (
        <MotionProvider>
            <CommandPaletteDialog controller={next} />
        </MotionProvider>
    );
    const { rerender } = render(ui(controller));
    return { rerender: (next) => rerender(ui(next)) };
}

function combobox(): HTMLElement {
    return screen.getByRole('combobox');
}

class StubResizeObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
}

describe('CommandPaletteDialog', () => {
    beforeEach(() => {
        searchHook.mockReturnValue({ groups: groupOf(RESULTS), status: 'success' });
        vi.stubGlobal('ResizeObserver', StubResizeObserver);
        window.HTMLElement.prototype.scrollIntoView = vi.fn();
        window.HTMLElement.prototype.scrollTo = vi.fn();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.clearAllMocks();
    });

    it('wires the combobox to the listbox and renders one option per result in server order', () => {
        renderDialog(makeController());

        const input = combobox();
        expect(input).toHaveAttribute('aria-controls', COMMAND_LISTBOX_ID);

        const listbox = screen.getByRole('listbox');
        const labels = within(listbox)
            .getAllByRole('option')
            .map((option) => option.getAttribute('aria-label'));
        expect(labels).toEqual(['Alpha', 'Beta', 'Gamma']);
    });

    it('starts with the first option active', () => {
        renderDialog(makeController());
        expect(combobox()).toHaveAttribute('aria-activedescendant', optionId('a'));
    });

    it('ArrowDown moves the active descendant to the next option', () => {
        renderDialog(makeController());
        fireEvent.keyDown(combobox(), { key: 'ArrowDown' });
        expect(combobox()).toHaveAttribute('aria-activedescendant', optionId('b'));
    });

    it('ArrowUp from the first option wraps to the last', () => {
        renderDialog(makeController());
        fireEvent.keyDown(combobox(), { key: 'ArrowUp' });
        expect(combobox()).toHaveAttribute('aria-activedescendant', optionId('c'));
    });

    it('Home and End jump to the first and last options', () => {
        renderDialog(makeController());
        fireEvent.keyDown(combobox(), { key: 'End' });
        expect(combobox()).toHaveAttribute('aria-activedescendant', optionId('c'));
        fireEvent.keyDown(combobox(), { key: 'Home' });
        expect(combobox()).toHaveAttribute('aria-activedescendant', optionId('a'));
    });

    it('Enter selects the active option', () => {
        const handleSelect = vi.fn();
        renderDialog(makeController({ handleSelect }));
        fireEvent.keyDown(combobox(), { key: 'ArrowDown' });
        fireEvent.keyDown(combobox(), { key: 'Enter' });
        expect(handleSelect).toHaveBeenCalledWith(RESULTS[1]);
    });

    it('click selects the option', () => {
        const handleSelect = vi.fn();
        renderDialog(makeController({ handleSelect }));
        fireEvent.click(screen.getByRole('option', { name: 'Gamma' }));
        expect(handleSelect).toHaveBeenCalledWith(RESULTS[2]);
    });

    it('renders no options when the query is below the minimum length', () => {
        renderDialog(makeController({ searchValue: 'ab' }));
        expect(screen.queryByRole('option')).toBeNull();
        expect(screen.queryByRole('listbox')).toBeNull();
    });

    it('re-anchors the active option to the first when the results identity changes', () => {
        const { rerender } = renderDialog(makeController());
        fireEvent.keyDown(combobox(), { key: 'ArrowDown' });
        expect(combobox()).toHaveAttribute('aria-activedescendant', optionId('b'));

        searchHook.mockReturnValue({
            groups: groupOf([
                { id: 'x', label: 'Xi', path: '/x', href: '/x', kind: 'page' },
                { id: 'y', label: 'Psi', path: '/y', href: '/y', kind: 'class' }
            ]),
            status: 'success'
        });
        rerender(makeController());

        expect(combobox()).toHaveAttribute('aria-activedescendant', optionId('x'));
    });
});
