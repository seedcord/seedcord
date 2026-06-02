import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Dropdown, type DropdownGroup, type DropdownOption } from '../src/Dropdown';

const options: readonly DropdownOption[] = [
    { value: 'one', label: 'One' },
    { value: 'two', label: 'Two' },
    { value: 'three', label: 'Three' }
];

const versionGroups: readonly DropdownGroup[] = [
    {
        id: 'stable',
        options: [
            { value: '0.10.6', label: 'v0.10.6', trailing: <span data-testid="latest-badge">latest</span> },
            { value: '0.9.4', label: 'v0.9.4' }
        ]
    },
    { id: 'prerelease', label: 'pre-release', options: [{ value: '0.11.0-next.1', label: 'v0.11.0-next.1' }] }
];

function renderGroups(onChange = vi.fn()): ReturnType<typeof render> {
    return render(
        <Dropdown
            placeholderLabel="Version"
            value="0.10.6"
            groups={versionGroups}
            onChange={onChange}
            aria-label="version"
        />
    );
}

function renderDropdown(
    overrides: {
        value?: string;
        onChange?: (v: string) => void;
        disabled?: boolean;
    } = {}
): ReturnType<typeof render> {
    const { value = '', onChange = vi.fn(), disabled = false } = overrides;
    return render(
        <Dropdown
            placeholderLabel="Pick one"
            value={value}
            options={options}
            onChange={onChange}
            aria-label="picker"
            disabled={disabled}
        />
    );
}

function pickOption(opts: HTMLElement[], index: number): HTMLElement {
    const opt = opts[index];
    if (!opt) throw new Error(`expected an option at index ${String(index)}`);
    return opt;
}

describe('Dropdown open/close', () => {
    it('starts closed: trigger reports aria-expanded=false and no listbox in DOM', () => {
        renderDropdown();
        const trigger = screen.getByRole('button', { name: 'picker' });
        expect(trigger).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByRole('listbox')).toBeNull();
    });

    it('opens on trigger click: listbox renders and aria-expanded flips to true', async () => {
        const user = userEvent.setup();
        renderDropdown();
        const trigger = screen.getByRole('button', { name: 'picker' });
        await user.click(trigger);
        const listbox = await screen.findByRole('listbox');
        expect(listbox).toBeInTheDocument();
        expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });

    it('closes after selecting an option', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        renderDropdown({ onChange });
        const trigger = screen.getByRole('button', { name: 'picker' });
        await user.click(trigger);
        const opts = await screen.findAllByRole('option');
        await user.click(pickOption(opts, 1));
        await waitFor(() => {
            expect(screen.queryByRole('listbox')).toBeNull();
        });
    });

    it('does not open when disabled', async () => {
        const user = userEvent.setup();
        renderDropdown({ disabled: true });
        const trigger = screen.getByRole('button', { name: 'picker' });
        await user.click(trigger);
        expect(screen.queryByRole('listbox')).toBeNull();
    });
});

describe('Dropdown selection callback', () => {
    it('fires onChange with the option value when an option is clicked', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        renderDropdown({ onChange });
        await user.click(screen.getByRole('button', { name: 'picker' }));
        const opts = await screen.findAllByRole('option');
        await user.click(pickOption(opts, 2));
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith('three');
    });

    it('reflects the controlled value as the displayed trigger label', () => {
        renderDropdown({ value: 'two' });
        const trigger = screen.getByRole('button', { name: 'picker' });
        expect(trigger).toHaveTextContent('Two');
    });

    it('updates the displayed label after the consumer commits the new value', async () => {
        const user = userEvent.setup();
        function Controlled(): ReturnType<typeof Dropdown> {
            const [v, setV] = useState('one');
            return (
                <Dropdown placeholderLabel="Pick one" value={v} options={options} onChange={setV} aria-label="picker" />
            );
        }
        render(<Controlled />);
        const trigger = screen.getByRole('button', { name: 'picker' });
        expect(trigger).toHaveTextContent('One');
        await user.click(trigger);
        const opts = await screen.findAllByRole('option');
        await user.click(pickOption(opts, 2));
        await waitFor(() => {
            expect(trigger).toHaveTextContent('Three');
        });
    });
});

describe('Dropdown ARIA wiring', () => {
    it('exposes aria-haspopup=listbox on the trigger', () => {
        renderDropdown();
        const trigger = screen.getByRole('button', { name: 'picker' });
        expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
    });

    it('aria-controls on the trigger points at the rendered listbox id', async () => {
        const user = userEvent.setup();
        renderDropdown();
        const trigger = screen.getByRole('button', { name: 'picker' });
        const controlsId = trigger.getAttribute('aria-controls');
        expect(controlsId).toBeTruthy();
        await user.click(trigger);
        const listbox = await screen.findByRole('listbox');
        expect(listbox.id).toBe(controlsId);
    });

    it('marks the currently selected option with aria-selected=true and others false', async () => {
        const user = userEvent.setup();
        renderDropdown({ value: 'two' });
        await user.click(screen.getByRole('button', { name: 'picker' }));
        const opts = await screen.findAllByRole('option');
        expect(pickOption(opts, 0)).toHaveAttribute('aria-selected', 'false');
        expect(pickOption(opts, 1)).toHaveAttribute('aria-selected', 'true');
        expect(pickOption(opts, 2)).toHaveAttribute('aria-selected', 'false');
    });
});

describe('Dropdown groups', () => {
    it('renders every option across groups in order', async () => {
        const user = userEvent.setup();
        renderGroups();
        await user.click(screen.getByRole('button', { name: 'version' }));
        const opts = await screen.findAllByRole('option');
        expect(opts.map((opt) => opt.textContent)).toEqual(['v0.10.6latest', 'v0.9.4', 'v0.11.0-next.1']);
    });

    it('renders a labelled separator for non-first groups', async () => {
        const user = userEvent.setup();
        renderGroups();
        await user.click(screen.getByRole('button', { name: 'version' }));
        expect(await screen.findByRole('listbox')).toHaveTextContent('pre-release');
    });

    it('renders per-option trailing decoration', async () => {
        const user = userEvent.setup();
        renderGroups();
        await user.click(screen.getByRole('button', { name: 'version' }));
        expect(await screen.findByTestId('latest-badge')).toBeInTheDocument();
    });

    it('fires onChange for an option in a later group', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        renderGroups(onChange);
        await user.click(screen.getByRole('button', { name: 'version' }));
        const opts = await screen.findAllByRole('option');
        await user.click(pickOption(opts, 2));
        expect(onChange).toHaveBeenCalledWith('0.11.0-next.1');
    });
});

describe('Dropdown keyboard interaction', () => {
    it('renders each option as a focusable button so Tab traversal reaches every item', async () => {
        const user = userEvent.setup();
        renderDropdown();
        await user.click(screen.getByRole('button', { name: 'picker' }));
        const opts = await screen.findAllByRole('option');
        for (const opt of opts) {
            expect(opt.tagName).toBe('BUTTON');
            expect(opt).not.toBeDisabled();
        }
    });

    it('commits selection when the focused option is activated via keyboard', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        renderDropdown({ onChange });
        await user.click(screen.getByRole('button', { name: 'picker' }));
        const opts = await screen.findAllByRole('option');
        pickOption(opts, 0).focus();
        await user.keyboard('{Enter}');
        expect(onChange).toHaveBeenCalledWith('one');
    });
});
