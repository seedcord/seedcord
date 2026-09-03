import { CustomId } from '@seedcord/custom-id';
import { describe, expect, it } from 'vitest';

import { InvalidCustomId, StaleCustomId } from '#customId/Errors';
import '#src/index';

// the bare barrel import is the thing under test. core's entry pulls in Errors.ts, where the
// registration runs.

const Report = new CustomId('report').snowflake('claimedBy');
const Reshaped = new CustomId('report').snowflake('claimedBy', { nullable: true });
const wire = Report.encode({ claimedBy: '853472916483920128' });

describe('a failed decode reaches the boundary as a Notice', () => {
    it('throws StaleCustomId for a wire minted under an older shape', () => {
        expect(() => Reshaped.decode(wire)).toThrow(StaleCustomId);
    });

    it('throws InvalidCustomId for a wire another definition minted', () => {
        expect(() => Report.decode('zzz000:A')).toThrow(InvalidCustomId);
    });
});
