import { describe, expect, it } from 'vitest';

import { DatabaseError } from '@bErrors/Database';
import { UserNotFound } from '@bErrors/User';

import type { Denial } from '@interfaces/Components';
import type { RenderContext } from '@seedcord/types';

const ctx: RenderContext = { uuid: '11111111-2222-3333-4444-555555555555' };

describe('shipped Denial subclasses', () => {
    it('threads ctx.uuid into the DatabaseError reply and reports', () => {
        const denial = new DatabaseError('write failed');
        expect(denial.report).toBe(true);

        const response = denial.render(ctx);
        if (response.kind !== 'embed') throw new Error('expected embed arm');
        const [embed] = response.embeds;
        expect(embed?.data.description).toContain(ctx.uuid);
    });

    it('renders UserNotFound from the live userArg without reporting', () => {
        const denial: Denial = new UserNotFound('999');
        expect(denial.report).toBe(false);

        const response = denial.render(ctx);
        if (response.kind !== 'embed') throw new Error('expected embed arm');
        const [embed] = response.embeds;
        expect(embed?.data.title).toBe('User Not Found');
        expect(embed?.data.description).toContain('999');
    });
});
