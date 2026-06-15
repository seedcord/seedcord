import { describe, expect, it } from 'vitest';

import { InvalidCustomId, StaleCustomId } from '@customId/Errors';
import { DatabaseError } from '@denials/Database';

import type { RenderContext } from '@seedcord/types';

const ctx: RenderContext = { uuid: '11111111-2222-3333-4444-555555555555' };

describe('DatabaseError', () => {
    it('threads ctx.uuid into the reply and reports', () => {
        const denial = new DatabaseError('write failed');
        expect(denial.report).toBe(true);

        const response = denial.render(ctx);
        if (response.kind !== 'embed') throw new Error('expected embed arm');
        const [embed] = response.embeds;
        expect(embed?.data.description).toContain(ctx.uuid);
    });
});

describe('StaleCustomId', () => {
    it('renders the run-again message without reporting', () => {
        const denial = new StaleCustomId('approve');
        expect(denial.report).toBe(false);

        const response = denial.render();
        if (response.kind !== 'embed') throw new Error('expected embed arm');
        expect(response.embeds[0]?.data.description).toContain('older version');
    });
});

describe('InvalidCustomId', () => {
    it('reports and renders the generic try-again message', () => {
        const denial = new InvalidCustomId('bad wire');
        expect(denial.report).toBe(true);

        const response = denial.render();
        if (response.kind !== 'embed') throw new Error('expected embed arm');
        expect(response.embeds[0]?.data.description).toContain('Something went wrong');
    });
});
