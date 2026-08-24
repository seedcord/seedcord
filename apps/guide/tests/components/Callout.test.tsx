import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Callout } from '#components/Callout';

import type { CalloutProps } from '#components/Callout';

describe('Callout', () => {
    it('names its kind above the body', () => {
        render(<Callout type="note">Codegen runs first.</Callout>);

        expect(screen.getByText('Note')).toBeInTheDocument();
        expect(screen.getByText('Codegen runs first.')).toBeInTheDocument();
    });

    it.each([
        ['gateway', 'Gateway only'],
        ['http', 'Http only']
    ] as const)('says %s only', (only, label) => {
        render(
            <Callout type="transport" only={only}>
                A difference.
            </Callout>
        );

        expect(screen.getByText(label)).toBeInTheDocument();
    });

    it('says both differ when the transport callout names no side', () => {
        render(<Callout type="transport">A difference.</Callout>);

        expect(screen.getByText('Gateway and http differ')).toBeInTheDocument();
    });

    // mdx does not typecheck the props a page writes
    it('refuses an unknown type', () => {
        const wrong = { type: 'nonsense' } as unknown as CalloutProps;

        expect(() => render(<Callout {...wrong}>A body.</Callout>)).toThrow('nonsense');
    });

    it('refuses an unknown only', () => {
        const wrong = { type: 'transport', only: 'websocket' } as unknown as CalloutProps;

        expect(() => render(<Callout {...wrong}>A body.</Callout>)).toThrow('websocket');
    });

    it('refuses only on a kind that names no transport', () => {
        const wrong = { type: 'danger', only: 'gateway' } as unknown as CalloutProps;

        expect(() => render(<Callout {...wrong}>A body.</Callout>)).toThrow('transport');
    });
});
