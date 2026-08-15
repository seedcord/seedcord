import { PermissionFlagsBits } from 'discord-api-types/v10';
import { describe, expect, it } from 'vitest';

import { HasDangerousPermissions, MissingPermissions } from '#notices/index';
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

    it('refuses through the inverse arm when a scope bit is present', () => {
        expect(() =>
            assertPermissions({
                subject: '<@&2>',
                permissions: bits(Administrator),
                scope: [Administrator],
                inverse: true
            })
        ).toThrow(HasDangerousPermissions);
    });

    it('passes the inverse arm when no scope bit is present', () => {
        expect(() =>
            assertPermissions({
                subject: '<@&2>',
                permissions: bits(KickMembers),
                scope: [Administrator],
                inverse: true
            })
        ).not.toThrow();
    });

    // an administrator effectively holds every permission, so the inverse arm reports them all
    it('reports every scope bit on the inverse arm for an administrator', () => {
        expect(() =>
            assertPermissions({
                subject: '<@&2>',
                permissions: bits(Administrator),
                scope: [BanMembers],
                inverse: true
            })
        ).toThrow(HasDangerousPermissions);
    });

    it('uses a supplied notice over the default', () => {
        class Custom extends MissingPermissions {}

        expect(() =>
            assertPermissions({
                subject: '<@1>',
                permissions: 0n,
                scope: [BanMembers],
                missingNotice: Custom
            })
        ).toThrow(Custom);
    });
});
