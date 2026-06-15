import { describe, expect, it } from 'vitest';

import { InvalidCustomId, StaleCustomId } from '@customId/Errors';

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
