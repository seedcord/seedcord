import { PermissionFlagsBits } from 'discord-api-types/v10';
import { describe, expect, it } from 'vite-plus/test';

import { HasPresentPermissions, MissingPermissions } from '#notices/index';
import { assertPermissions } from '#src/permissions/assert';

const { BanMembers, KickMembers, Administrator, ManageRoles } = PermissionFlagsBits;

function bits(...held: bigint[]): bigint {
    return held.reduce((all, bit) => all | bit, 0n);
}

describe('assertPermissions', () => {
    it('passes when every scope bit is held', () => {
        expect(() =>
            assertPermissions({ subject: '<@1>', permissions: bits(BanMembers, KickMembers), scope: [BanMembers] })
        ).not.toThrow();
    });

    it('refuses with the missing names when a bit is absent', () => {
        try {
            assertPermissions({ subject: '<@1>', permissions: bits(BanMembers), scope: [BanMembers, KickMembers] });
            expect.unreachable('expected a refusal');
        } catch (caught) {
            expect(caught).toBeInstanceOf(MissingPermissions);
            expect((caught as MissingPermissions).render()).toBeDefined();
        }
    });

    it('passes any scope for a subject holding Administrator', () => {
        expect(() =>
            assertPermissions({ subject: '<@1>', permissions: bits(Administrator), scope: [BanMembers, ManageRoles] })
        ).not.toThrow();
    });

    it('refuses through the inverse check when a scope bit is present', () => {
        expect(() =>
            assertPermissions({
                subject: '<@&2>',
                permissions: bits(Administrator),
                scope: [Administrator],
                inverse: true
            })
        ).toThrow(HasPresentPermissions);
    });

    it('passes the inverse check when no scope bit is present', () => {
        expect(() =>
            assertPermissions({
                subject: '<@&2>',
                permissions: bits(KickMembers),
                scope: [Administrator],
                inverse: true
            })
        ).not.toThrow();
    });

    // an administrator effectively holds every permission, so the inverse check reports them all
    it('reports every scope bit on the inverse check for an administrator', () => {
        expect(() =>
            assertPermissions({
                subject: '<@&2>',
                permissions: bits(Administrator),
                scope: [BanMembers],
                inverse: true
            })
        ).toThrow(HasPresentPermissions);
    });

    it('refuses with the supplied notice with and without inverse, built with the subject and the refused names', () => {
        class Custom extends MissingPermissions {
            public constructor(
                public readonly subject: string | null,
                public readonly names: readonly string[]
            ) {
                super(subject, names);
            }
        }
        const refusalOf = (check: Parameters<typeof assertPermissions>[0]): unknown => {
            try {
                assertPermissions(check);
            } catch (caught) {
                return caught;
            }
            return expect.unreachable('expected a refusal');
        };

        const missing = refusalOf({
            subject: '<@1>',
            permissions: bits(KickMembers),
            scope: [BanMembers, KickMembers],
            notice: Custom
        });
        const present = refusalOf({
            subject: '<@&2>',
            permissions: bits(KickMembers),
            scope: [BanMembers, KickMembers],
            inverse: true,
            notice: Custom
        });

        expect(missing).toMatchObject({ subject: '<@1>', names: ['Ban Members'] });
        expect(present).toMatchObject({ subject: '<@&2>', names: ['Kick Members'] });
    });
});
