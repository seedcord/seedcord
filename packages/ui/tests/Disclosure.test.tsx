import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { Disclosure, DisclosurePanel, DisclosureTrigger } from '../src/Disclosure';

import type { RenderResult } from '@testing-library/react';
import type { ComponentProps } from 'react';

function renderDisclosure(props: Partial<ComponentProps<typeof Disclosure>> = {}): RenderResult {
    return render(
        <Disclosure {...props}>
            <DisclosureTrigger>Toggle</DisclosureTrigger>
            <DisclosurePanel>Panel body</DisclosurePanel>
        </Disclosure>
    );
}

describe('Disclosure toggle', () => {
    it('starts closed and opens on Trigger click', async () => {
        const user = userEvent.setup();
        renderDisclosure();
        const trigger = screen.getByRole('button', { name: 'Toggle' });
        expect(trigger).toHaveAttribute('aria-expanded', 'false');
        await user.click(trigger);
        expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });

    it('closes again on a second Trigger click', async () => {
        const user = userEvent.setup();
        renderDisclosure({ defaultOpen: true });
        const trigger = screen.getByRole('button', { name: 'Toggle' });
        expect(trigger).toHaveAttribute('aria-expanded', 'true');
        await user.click(trigger);
        expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });
});

describe('Disclosure aria wiring', () => {
    it('flips aria-expanded across toggles', async () => {
        const user = userEvent.setup();
        renderDisclosure();
        const trigger = screen.getByRole('button', { name: 'Toggle' });
        expect(trigger).toHaveAttribute('aria-expanded', 'false');
        await user.click(trigger);
        expect(trigger).toHaveAttribute('aria-expanded', 'true');
        await user.click(trigger);
        expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    it('links aria-controls on the Trigger to the Panel id', () => {
        renderDisclosure();
        const trigger = screen.getByRole('button', { name: 'Toggle' });
        const controls = trigger.getAttribute('aria-controls');
        expect(controls).toBeTruthy();
        const panel = screen.getByText('Panel body').parentElement;
        expect(panel).not.toBeNull();
        expect(panel?.id).toBe(controls);
    });
});

describe('Disclosure Panel data-state', () => {
    it('reflects closed state by default and aria-hidden is true', () => {
        renderDisclosure();
        const panel = screen.getByText('Panel body').parentElement;
        expect(panel).toHaveAttribute('data-state', 'closed');
        expect(panel).toHaveAttribute('aria-hidden', 'true');
    });

    it('transitions to open state after Trigger click', async () => {
        const user = userEvent.setup();
        renderDisclosure();
        const trigger = screen.getByRole('button', { name: 'Toggle' });
        await user.click(trigger);
        const panel = screen.getByText('Panel body').parentElement;
        expect(panel).toHaveAttribute('data-state', 'open');
        expect(panel).toHaveAttribute('aria-hidden', 'false');
    });
});

describe('Disclosure Trigger composition', () => {
    it('renders arbitrary ReactNode children inside the button', () => {
        render(
            <Disclosure>
                <DisclosureTrigger>
                    <span data-testid="label">Label</span>
                    <span data-testid="hint">Hint</span>
                </DisclosureTrigger>
                <DisclosurePanel>Body</DisclosurePanel>
            </Disclosure>
        );
        const trigger = screen.getByRole('button');
        expect(trigger).toContainElement(screen.getByTestId('label'));
        expect(trigger).toContainElement(screen.getByTestId('hint'));
    });
});

describe('Disclosure defaultOpen prop', () => {
    it('respects defaultOpen=true on mount', () => {
        renderDisclosure({ defaultOpen: true });
        const trigger = screen.getByRole('button', { name: 'Toggle' });
        expect(trigger).toHaveAttribute('aria-expanded', 'true');
        const panel = screen.getByText('Panel body').parentElement;
        expect(panel).toHaveAttribute('data-state', 'open');
    });

    it('defaults to closed when defaultOpen is omitted', () => {
        renderDisclosure();
        const trigger = screen.getByRole('button', { name: 'Toggle' });
        expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });
});
