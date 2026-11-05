import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vite-plus/test';

import { clickCopyAnchor, CopyAnchorButton } from '#src/CopyAnchorButton.tsx';

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

    it('clicks the button for an anchor, or the page button for none', async () => {
        const writeText = stubClipboard();
        render(
            <>
                <CopyAnchorButton label="Commands" />
                <CopyAnchorButton anchorId="options" label="Options" />
            </>
        );

        act(() => clickCopyAnchor('options'));
        act(() => clickCopyAnchor(undefined));

        await waitFor(() => {
            expect(writeText.mock.calls).toEqual([
                [`${globalThis.location.origin}/#options`],
                [`${globalThis.location.origin}/`]
            ]);
        });
        expect(screen.getByRole('button', { name: 'Copied link to Options' })).toBeInTheDocument();
    });
});
