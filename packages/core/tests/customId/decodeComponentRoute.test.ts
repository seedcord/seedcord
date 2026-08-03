import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it } from 'vitest';

import { CustomId } from '@customId/CustomId';
import { decodeComponentRoute } from '@customId/routing';
import { storeComponentRoute } from '@decorators/interactionRoutes';
import { InteractionRoutes } from '@src/metadataKeys';
import { Notice } from '@stops/Notice';

const ApproveId = new CustomId('approve').snowflake('userId');

// runs fn, asserts it threw a Notice, and returns the concrete notice's constructor name
function noticeNameFrom(fn: () => unknown): string {
    try {
        fn();
    } catch (error) {
        expect(error).toBeInstanceOf(Notice);
        if (error instanceof Notice) return error.constructor.name;
    }
    throw new Error('expected a Notice');
}

describe('decodeComponentRoute', () => {
    it('decodes the wire against the stored defs', () => {
        // eslint-disable-next-line @typescript-eslint/no-extraneous-class -- a bare metadata target
        class Approve {}
        storeComponentRoute(InteractionRoutes.Button, [ApproveId], Approve);

        const decoded = decodeComponentRoute(Approve, ApproveId.encode({ userId: '42' }));

        expect(decoded).toEqual({ prefix: 'approve', params: { userId: '42' } });
    });

    it('throws CustomIdHandlerRouteMissing on an undecorated class', () => {
        // eslint-disable-next-line @typescript-eslint/no-extraneous-class -- a bare metadata target
        class Bare {}

        let caught: unknown = null;
        try {
            decodeComponentRoute(Bare, ApproveId.encode({ userId: '1' }));
        } catch (error) {
            caught = error;
        }
        expect(isSeedcordError(caught, 'SeedcordError', SeedcordErrorCode.CustomIdHandlerRouteMissing)).toBe(true);
    });

    it('refuses a wire no stored def owns with InvalidCustomId', () => {
        // eslint-disable-next-line @typescript-eslint/no-extraneous-class -- a bare metadata target
        class Approve {}
        storeComponentRoute(InteractionRoutes.Button, [ApproveId], Approve);
        const StrangerId = new CustomId('stranger').snowflake('userId');

        expect(noticeNameFrom(() => decodeComponentRoute(Approve, StrangerId.encode({ userId: '1' })))).toBe(
            'InvalidCustomId'
        );
    });

    it('refuses a wire minted from an older shape with StaleCustomId', () => {
        const NewApprove = new CustomId('approve').snowflake('userId').str('reason');
        // eslint-disable-next-line @typescript-eslint/no-extraneous-class -- a bare metadata target
        class Approve {}
        storeComponentRoute(InteractionRoutes.Button, [NewApprove], Approve);

        expect(noticeNameFrom(() => decodeComponentRoute(Approve, ApproveId.encode({ userId: '1' })))).toBe(
            'StaleCustomId'
        );
    });
});
