import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CopyAnchorButton } from '#src/CopyAnchorButton';

function stubClipboard(): ReturnType<typeof vi.fn> {
    const writeText = vi.fn(async () => {});
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    return writeText;
}

describe('CopyAnchorButton', () => {
    it('copies the url with the anchor it was given', async () => {
        const writeText = stubClipboard();
        render(<CopyAnchorButton anchorId="the-command-file" label="The command file" />);

        await userEvent.click(screen.getByRole('button'));

        await waitFor(() => {
            expect(writeText).toHaveBeenCalledWith(`${globalThis.location.origin}/#the-command-file`);
        });
    });

    it('copies the page url when it has no anchor', async () => {
        const writeText = stubClipboard();
        render(<CopyAnchorButton label="Commands" />);

        await userEvent.click(screen.getByRole('button'));

        await waitFor(() => {
            expect(writeText).toHaveBeenCalledWith(`${globalThis.location.origin}/`);
        });
    });
});
