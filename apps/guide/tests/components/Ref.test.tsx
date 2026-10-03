import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Ref } from '#components/Ref';

describe('Ref', () => {
    it('opens the reference site in a new tab', () => {
        render(<Ref href="https://seedcord.org/docs/packages/core/latest/classes/notice">Notice</Ref>);
        const link = screen.getByRole('link', { name: 'Notice' });

        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    });
});
