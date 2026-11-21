import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vite-plus/test';

import { Disclosure, DisclosurePanel, DisclosureTrigger, useDisclosure } from '#src/Disclosure';

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
    it('starts closed with the panel inert', () => {
        renderDisclosure();
        const panel = screen.getByText('Panel body').parentElement;
        expect(panel).toHaveAttribute('data-state', 'closed');
        expect(panel).toHaveAttribute('inert');
    });

    it('transitions to open state after Trigger click', async () => {
        const user = userEvent.setup();
        renderDisclosure();
        const trigger = screen.getByRole('button', { name: 'Toggle' });
        await user.click(trigger);
        const panel = screen.getByText('Panel body').parentElement;
        expect(panel).toHaveAttribute('data-state', 'open');
        expect(panel).not.toHaveAttribute('inert');
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
});

describe('Disclosure storageKey', () => {
    const STORAGE_KEY = 'test:disclosure';

    afterEach(() => {
        localStorage.clear();
    });

    function RecordOpen({ renders }: { renders: boolean[] }): null {
        renders.push(useDisclosure().open);
        return null;
    }

    it('mounts in the saved state without first rendering its default', () => {
        localStorage.setItem(STORAGE_KEY, 'true');
        const renders: boolean[] = [];
        render(
            <Disclosure storageKey={STORAGE_KEY}>
                <RecordOpen renders={renders} />
                <DisclosureTrigger>Toggle</DisclosureTrigger>
            </Disclosure>
        );

        expect(renders).not.toContain(false);
        expect(screen.getByRole('button', { name: 'Toggle' })).toHaveAttribute('aria-expanded', 'true');
    });

    it('toggles every disclosure that shares its key', async () => {
        const user = userEvent.setup();
        render(
            <>
                <Disclosure storageKey={STORAGE_KEY} defaultOpen>
                    <DisclosureTrigger>First</DisclosureTrigger>
                </Disclosure>
                <Disclosure storageKey={STORAGE_KEY} defaultOpen>
                    <DisclosureTrigger>Second</DisclosureTrigger>
                </Disclosure>
            </>
        );

        await user.click(screen.getByRole('button', { name: 'First' }));

        expect(screen.getByRole('button', { name: 'Second' })).toHaveAttribute('aria-expanded', 'false');
    });
});
