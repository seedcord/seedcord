import { fireEvent, render, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';

import { CodeNotes } from '#components/CodeNotes';

const SWAPPED = { code: 3119, name: 'CliCodegenOutOfDate' };
const HINTED = { code: 3102, name: 'CliConfigNotFound' };

describe('CodeNotes', () => {
    it('offers a search only for the code that the search did not use', () => {
        const onSearch = vi.fn();
        const { container } = render(<CodeNotes codes={{ swapped: [SWAPPED], hints: [HINTED] }} onSearch={onSearch} />);
        const notes = within(container);

        fireEvent.click(notes.getByRole('button', { name: 'Search for error 3102' }));

        expect(notes.getAllByRole('button')).toHaveLength(1);
        expect(onSearch).toHaveBeenCalledWith(HINTED);
    });
});
