import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EntityHeader } from '#components/docs/entity/EntityHeader';

const renderHeader = (condition?: string): void => {
    render(
        <EntityHeader
            badgeLabel="Class"
            pkg="http"
            symbolName="Seedcord"
            tone="class"
            signature={{ text: 'class Seedcord', html: null }}
            summary={[]}
            {...(condition && { condition })}
        />
    );
};

describe('EntityHeader', () => {
    it('shows the runtime condition beside the package', () => {
        renderHeader('workerd');

        expect(screen.getByText('http')).toBeInTheDocument();
        expect(screen.getByText('workerd')).toBeInTheDocument();
    });

    it('shows the package alone for the default build', () => {
        renderHeader();

        expect(screen.queryByText('workerd')).not.toBeInTheDocument();
    });
});
