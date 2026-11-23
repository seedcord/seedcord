import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vite-plus/test';

import { Tab, Tabs } from '#components/Tabs';

describe('Tabs', () => {
    it('shows the first panel and swaps to the one whose tab you click', async () => {
        const user = userEvent.setup();
        render(
            <Tabs>
                <Tab label="Keyv">Install keyv.</Tab>
                <Tab label="unstorage">Install unstorage.</Tab>
            </Tabs>
        );

        expect(screen.getByRole('tabpanel', { name: 'Keyv' })).toHaveTextContent('Install keyv.');

        await user.click(screen.getByRole('tab', { name: 'unstorage' }));

        expect(screen.getByRole('tabpanel', { name: 'unstorage' })).toHaveTextContent('Install unstorage.');
        expect(screen.queryByRole('tabpanel', { name: 'Keyv' })).not.toBeInTheDocument();
    });
});
