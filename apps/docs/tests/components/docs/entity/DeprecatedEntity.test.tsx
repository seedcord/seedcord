import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DeprecatedEntity } from '#components/docs/entity/DeprecatedEntity';

describe('DeprecatedEntity', () => {
    it('renders the children untouched when nothing is deprecated', () => {
        render(
            <DeprecatedEntity deprecationStatus={{ isDeprecated: false }}>
                <p>body</p>
            </DeprecatedEntity>
        );

        expect(screen.getByText('body')).toBeInTheDocument();
        expect(screen.queryByText('Deprecated')).not.toBeInTheDocument();
    });

    it('shows the deprecation message beside the label', () => {
        render(
            <DeprecatedEntity
                deprecationStatus={{
                    isDeprecated: true,
                    deprecationMessage: [{ plain: 'Call publish to reach both.', html: 'Call publish to reach both.' }]
                }}
            >
                <p>body</p>
            </DeprecatedEntity>
        );

        expect(screen.getByText('Deprecated')).toBeInTheDocument();
        expect(screen.getByText('Call publish to reach both.')).toBeInTheDocument();
    });
});
