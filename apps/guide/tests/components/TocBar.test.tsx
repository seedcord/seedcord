import { MotionProvider } from '@seedcord/ui';
import { act, fireEvent, render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TocBar } from '#components/TocBar';

import type { TOCItemType } from 'fumadocs-core/toc';

const ITEMS: readonly TOCItemType[] = [
    { title: 'Do this', url: '#do-this', depth: 2 },
    { title: 'How it works', url: '#how-it-works', depth: 2 },
    { title: 'Related', url: '#related', depth: 2 }
];

function renderBar(): void {
    render(
        <MotionProvider>
            <TocBar items={ITEMS} activeIds={['do-this']} currentId="do-this" pageTitle="The dev loop" />
        </MotionProvider>
    );
}

async function click(element: HTMLElement): Promise<void> {
    await act(async () => {
        fireEvent.click(element);
    });
}

describe('TocBar', () => {
    it('names the heading you are in', () => {
        renderBar();

        expect(screen.getByRole('button')).toHaveTextContent('Do this');
    });

    it('animates the panel out before dropping it', async () => {
        renderBar();
        const trigger = screen.getByRole('button');

        await click(trigger);
        expect(screen.getByRole('link', { name: 'How it works' })).toBeInTheDocument();

        await click(trigger);
        // AnimatePresence keeps the row mounted until the exit finishes
        const row = screen.getByRole('link', { name: 'How it works' });

        await waitForElementToBeRemoved(row);
    });

    it('closes when a row is picked', async () => {
        renderBar();

        await click(screen.getByRole('button'));
        await click(screen.getByRole('link', { name: 'Related' }));

        await waitForElementToBeRemoved(() => screen.queryByRole('link', { name: 'Related' }));
    });

    it('points aria-controls at the panel it opens', async () => {
        renderBar();
        const trigger = screen.getByRole('button');

        await click(trigger);
        const controls = trigger.getAttribute('aria-controls');

        expect(controls).toBeTruthy();
        expect(document.getElementById(controls ?? '')).toBeInTheDocument();
    });

    it('returns focus to the trigger when escape closes it', async () => {
        renderBar();
        const trigger = screen.getByRole('button');

        await click(trigger);
        screen.getByRole('link', { name: 'How it works' }).focus();

        await act(async () => {
            fireEvent.keyDown(window, { key: 'Escape' });
        });

        expect(trigger).toHaveFocus();
    });
});
