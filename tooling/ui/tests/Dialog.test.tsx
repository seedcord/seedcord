import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import { Dialog } from '#src/Dialog.tsx';
import { SearchDialog } from '#src/SearchDialog.tsx';

import type { ReactElement } from 'react';

type Opener = (open: boolean, setOpen: (open: boolean) => void) => ReactElement;

const DIALOGS: [string, Opener][] = [
    [
        'Dialog',
        (open, setOpen) => (
            <Dialog open={open} onOpenChange={setOpen} title="Keys" description="Every key">
                <p>body</p>
            </Dialog>
        )
    ],
    [
        'SearchDialog',
        (open, setOpen) => (
            <SearchDialog
                open={open}
                onOpenChange={setOpen}
                onClose={() => setOpen(false)}
                title="Keys"
                description="Every key"
                field={<input aria-label="Query" />}
                listExpanded={false}
                footer={null}
            />
        )
    ]
];

function OpenedFromButton({ dialog }: { dialog: Opener }): ReactElement {
    const [open, setOpen] = useState(false);
    return (
        <>
            <button type="button" onClick={() => setOpen(true)}>
                Open
            </button>
            {dialog(open, setOpen)}
        </>
    );
}

class StubResizeObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
}

beforeEach(() => vi.stubGlobal('ResizeObserver', StubResizeObserver));
afterEach(() => vi.unstubAllGlobals());

describe('Dialog and SearchDialog', () => {
    it.each(DIALOGS)('%s gives focus back to what had it before it opened', async (_, dialog) => {
        const user = userEvent.setup();
        render(<OpenedFromButton dialog={dialog} />);
        const opener = screen.getByRole('button', { name: 'Open' });

        await user.click(opener);
        expect(screen.getByRole('dialog', { name: 'Keys' })).toBeInTheDocument();
        await user.keyboard('{Escape}');

        expect(opener).toHaveFocus();
    });
});
