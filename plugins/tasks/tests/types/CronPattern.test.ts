import { Cron } from 'croner';
import { describe, expect, it } from 'vitest';

import { acceptedPatterns, rejectedPatterns } from '#tests/fixtures/cronPatterns';

const croner = (pattern: string) => () => new Cron(pattern, { paused: true });

describe('CronPattern', () => {
    it.each(acceptedPatterns)('matches croner in accepting %j', (pattern) => {
        expect(croner(pattern)).not.toThrow();
    });

    it.each(rejectedPatterns)('matches croner in rejecting %j', (pattern) => {
        expect(croner(pattern)).toThrow();
    });
});
