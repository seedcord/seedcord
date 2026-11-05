import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vite-plus/test';

import { MobilePanel, useMobilePanelContainer } from '#src/MobilePanel.tsx';

import type { ReactElement } from 'react';

function ContainerProbe(): ReactElement {
    const container = useMobilePanelContainer();
    return <p>{container?.getAttribute('role') ?? 'no container'}</p>;
}

describe('MobilePanel', () => {
    it('shows its title, body and footer, hands its own node to popovers, and closes from the button', async () => {
        const onOpenChange = vi.fn();
        render(
            <MobilePanel open onOpenChange={onOpenChange} title="Navigation" description="Site links" footer="links">
                <ContainerProbe />
            </MobilePanel>
        );

        const panel = screen.getByRole('dialog', { name: 'Navigation' });
        expect(panel).toHaveTextContent('links');
        expect(screen.getByText('dialog')).toBeInTheDocument();

        // jsdom ignores the css that hides one of the two close buttons
        const [closeButton] = screen.getAllByRole('button', { name: 'Close panel' });
        await userEvent.setup().click(closeButton ?? document.body);
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });
});
