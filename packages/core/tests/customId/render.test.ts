import { describe, expect, it } from 'vitest';

import { InvalidCustomId, StaleCustomId } from '#customId/Errors';

import { cardJson } from '../utils/cardText';

describe('StaleCustomId', () => {
    it('renders the run-again message without reporting', () => {
        const denial = new StaleCustomId('approve');
        expect(denial.report).toBe(false);

        expect(cardJson(denial.render())).toContain('older version');
    });
});

describe('InvalidCustomId', () => {
    it('reports and renders the generic try-again message', () => {
        const denial = new InvalidCustomId('bad wire');
        expect(denial.report).toBe(true);

        expect(cardJson(denial.render())).toContain('Something went wrong');
    });
});
