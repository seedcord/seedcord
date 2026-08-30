import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MemberRow } from '#components/docs/entity/member/MemberRow';

import type { EntityMemberSummary } from '#lib/docs/types';

// justified: the row only reads the fields set here
const member = {
    id: 'emit',
    label: 'emit',
    description: null,
    sharedDocumentation: [],
    sharedExamples: [],
    throws: [],
    defaultValue: [],
    seeAlso: [],
    signatures: [],
    deprecationStatus: {
        isDeprecated: true,
        deprecationMessage: [{ plain: 'Call publish to reach both.', html: 'Call publish to reach both.' }]
    },
    access: 'public'
} as unknown as EntityMemberSummary;

describe('MemberRow deprecation', () => {
    it('passes the member deprecation message through to the card', () => {
        render(<MemberRow member={member} prefix="method" isLast />);

        expect(screen.getByText('Deprecated')).toBeInTheDocument();
        expect(screen.getByText('Call publish to reach both.')).toBeInTheDocument();
    });
});
