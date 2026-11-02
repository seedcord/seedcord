import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { MobilePanel, useMobilePanelContainer } from '#src/MobilePanel';

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

        await userEvent.setup().click(screen.getByRole('button', { name: 'Close panel' }));
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });
});
