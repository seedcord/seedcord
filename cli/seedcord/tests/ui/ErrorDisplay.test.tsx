import { fromWireError, toWireError } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordAggregateError, SeedcordError } from '@seedcord/errors/internal';
import { render } from 'ink-testing-library';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

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
            SeedcordErrorCode.CliProblems,
            [
                new SeedcordError(SeedcordErrorCode.CliConfigInvalidField, ['instance', 'a string']),
                new SeedcordError(SeedcordErrorCode.CliConfigInvalidField, ['tunnel', 'a boolean or an https URL'])
            ],
            [2]
        );

        const frame = render(<ErrorDisplay error={error} />).lastFrame() ?? '';

        expect(frame).toContain('instance in the seedcord config');
        expect(frame).toContain('tunnel in the seedcord config');
    });

    it('lists the problems of an aggregate the error wraps as its cause', () => {
        const startup = new SeedcordAggregateError(
            SeedcordErrorCode.LifecyclePhaseFailures,
            [new SeedcordError(SeedcordErrorCode.PortInUse, [8787, 'port'])],
            ['Ready', 1]
        );
        const error = new SeedcordError(SeedcordErrorCode.CliStartFailed, ['src/bot.ts', startup.message], {
            cause: startup
        });

        const frame = render(<ErrorDisplay error={error} />).lastFrame() ?? '';

        expect(frame).toContain('Another process already listens on port 8787');
    });

    it('lists the problems of an aggregate an edge bot sent over the wire', () => {
        const startup = fromWireError(toWireError(new AggregateError([new Error('port taken')], 'Phase Ready failed')));
        const error = new SeedcordError(SeedcordErrorCode.CliStartFailed, ['src/bot.ts', startup.message], {
            cause: startup
        });

        const frame = render(<ErrorDisplay error={error} />).lastFrame() ?? '';

        expect(frame).toContain('port taken');
    });

    it('lists two problems with the same message twice without a react key warning', () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const problem = (): SeedcordError =>
            new SeedcordError(SeedcordErrorCode.CliConfigInvalidField, ['entry', 'a string']);
        const error = new SeedcordAggregateError(SeedcordErrorCode.CliProblems, [problem(), problem()], [2]);

        const frame = render(<ErrorDisplay error={error} />).lastFrame() ?? '';

        expect(frame.split('entry in the seedcord config')).toHaveLength(3);
        expect(consoleError).not.toHaveBeenCalled();
        consoleError.mockRestore();
    });
});
