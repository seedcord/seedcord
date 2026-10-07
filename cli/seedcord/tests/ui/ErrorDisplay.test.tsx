import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordAggregateError, SeedcordError } from '@seedcord/errors/internal';
import { render } from 'ink-testing-library';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { ErrorDisplay } from '#ui/components/ErrorDisplay';

const BOTTOM = '╰';

describe('ErrorDisplay', () => {
    it('closes the border directly under its last line', () => {
        const lines = (render(<ErrorDisplay error={new Error('boom')} />).lastFrame() ?? '').split('\n');
        const action = lines.findIndex((line) => line.includes('press r to restart'));

        expect(action).toBeGreaterThan(0);
        expect(lines[action + 1]).toContain(BOTTOM);
    });

    it('lists every problem in an aggregate under its message', () => {
        const error = new SeedcordAggregateError(
            SeedcordErrorCode.CliConfigProblems,
            [
                new SeedcordError(SeedcordErrorCode.CliConfigMissingInstance),
                new SeedcordError(SeedcordErrorCode.CliConfigInvalidField, ['tunnel', 'a boolean or an https URL'])
            ],
            [2]
        );

        const frame = render(<ErrorDisplay error={error} />).lastFrame() ?? '';

        expect(frame).toContain('`instance`');
        expect(frame).toContain('`tunnel`');
    });
});
