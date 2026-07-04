import { describe, expect, it } from 'vitest';

import { Fault } from '@stops/Fault';

import { cardJson } from '../utils/cardText';

import type { RenderContext } from '@seedcord/types';

const ctx: RenderContext = { uuid: '11111111-2222-3333-4444-555555555555' };

describe('Fault', () => {
    it('reports by default and threads ctx.uuid into the reply', () => {
        const fault = new Fault();
        expect(fault.report).toBe(true);

        const response = fault.render(ctx);
        expect(cardJson(response)).toContain(ctx.uuid);
    });

    it('stores the original error as the standard cause', () => {
        const driver = new Error('connection refused');
        expect(new Fault({ cause: driver }).cause).toBe(driver);
    });

    it('does not report when report is false', () => {
        expect(new Fault({ cause: new Error('blip'), report: false }).report).toBe(false);
    });

    it('never puts the cause message in the user reply', () => {
        const response = new Fault({ cause: new Error('secret-driver-detail') }).render(ctx);
        expect(cardJson(response)).not.toContain('secret-driver-detail');
    });

    it('names the configured developer as the contact', () => {
        const response = new Fault().render({ uuid: ctx.uuid, developerUsername: 'maintainer#1' });
        expect(cardJson(response)).toContain('maintainer#1');
    });

    it('falls back to a generic contact when no developer is configured', () => {
        const response = new Fault().render(ctx);
        expect(cardJson(response)).toContain('the developer');
    });
});
