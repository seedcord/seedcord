import { PermissionFlagsBits } from 'discord-api-types/v10';
import { describe, it, expect, vi } from 'vitest';

import { GuildOnly, OwnerOnly } from '#gates/catalog/access';
import { Cooldown } from '#gates/catalog/Cooldown';
import { RequireRole } from '#gates/catalog/permissions';
import { and, or } from '#gates/combinators';
import { defineGate } from '#gates/Gate';
import { runGates } from '#gates/runGates';
import { NeedsAny, NotInGuild, NotOwner } from '#notices/index';
import { assertPermissions } from '#src/permissions/assert';
import { Notice } from '#stops/Notice';

import { cardJson } from '../../utils/cardText';

import type { GateContextBase } from '#gates/Gate';
import type { CoreBase } from '#interfaces/CoreBase';
import type { RenderContext } from '@seedcord/types';

function ctxOf(opts: { guild?: boolean; userId?: string; owners?: string[]; roles?: string[] }): GateContextBase {
    // the gates read only core.config.ownerIds and these id fields
    return {
        core: { config: { ownerIds: opts.owners ?? [] } } as unknown as CoreBase,
        userId: opts.userId ?? 'u1',
        guildId: opts.guild ? 'g1' : null,
        memberRoleIds: opts.roles ?? []
    } as unknown as GateContextBase;
}

describe('catalog gate combinators', () => {
    it('and passes when both catalog gates pass', async () => {
        await expect(
            and(GuildOnly(), OwnerOnly()).check(ctxOf({ guild: true, userId: 'o1', owners: ['o1'] }))
        ).resolves.toBeUndefined();
    });

    it('and refuses on the first failing catalog gate', async () => {
        await expect(
            and(GuildOnly(), OwnerOnly()).check(ctxOf({ guild: false, userId: 'o1', owners: ['o1'] }))
        ).rejects.toBeInstanceOf(NotInGuild);
    });

    it('and reaches the second catalog gate when the first passes', async () => {
        await expect(
            and(GuildOnly(), OwnerOnly()).check(ctxOf({ guild: true, userId: 'u2', owners: ['o1'] }))
        ).rejects.toBeInstanceOf(NotOwner);
    });

    it('or passes when either catalog gate passes', async () => {
        await expect(
            or(GuildOnly(), OwnerOnly()).check(ctxOf({ guild: false, userId: 'o1', owners: ['o1'] }))
        ).resolves.toBeUndefined();
    });

    it('or refuses when both catalog gates refuse', async () => {
        await expect(
            or(GuildOnly(), OwnerOnly()).check(ctxOf({ guild: false, userId: 'u2', owners: ['o1'] }))
        ).rejects.toBeInstanceOf(Notice);
    });

    it('or lists what every refusing catalog gate needs', async () => {
        const thrown = await or(OwnerOnly(), RequireRole('r1'))
            .check(ctxOf({ guild: true, userId: 'u2', owners: ['o1'] }))
            .then(
                () => undefined,
                (error: unknown) => error
            );

        expect(thrown).toBeInstanceOf(NeedsAny);
        // the list render never reads ctx
        const description = cardJson((thrown as Notice).render({} as unknown as RenderContext));
        expect(description.match(/•/g)).toHaveLength(2);
        expect(description).toContain('r1');
    });

    it('or lists a hand-written assertPermissions gate beside a catalog gate', async () => {
        const NoAdmin = defineGate('NoAdmin', (gateCtx: GateContextBase) => {
            assertPermissions({
                subject: '<@u2>',
                permissions: gateCtx.memberPermissions ?? 0n,
                scope: [PermissionFlagsBits.Administrator],
                inverse: true
            });
        });

        const thrown = await or(NoAdmin, OwnerOnly())
            .check({ ...ctxOf({ userId: 'u2' }), memberPermissions: PermissionFlagsBits.Administrator })
            .then(
                () => undefined,
                (error: unknown) => error
            );

        expect(thrown).toBeInstanceOf(NeedsAny);
    });

    it('or names a shared requirement once when two arms refuse for the same reason', async () => {
        // RequireRole refuses with NotInGuild before it reads the role, the same way GuildOnly does
        const thrown = await or(OwnerOnly(), RequireRole('r1'), GuildOnly())
            .check(ctxOf({ guild: false, userId: 'u2', owners: ['o1'] }))
            .then(
                () => undefined,
                (error: unknown) => error
            );

        expect(thrown).toBeInstanceOf(NeedsAny);
        const description = cardJson((thrown as Notice).render({} as unknown as RenderContext));
        expect(description.match(/•/g)).toHaveLength(2);
    });

    it('commits a real Cooldown nested in an and after the whole set passes', async () => {
        const charge = vi.fn();
        const rateLimiter = { peek: () => ({ limited: false }), charge };
        const ctx = {
            core: { rateLimiter, config: { ownerIds: [] } },
            userId: 'u1',
            guildId: 'g1',
            channelId: 'c1'
        } as unknown as GateContextBase;

        await runGates([and(GuildOnly(), Cooldown(5))], ctx);

        expect(charge).toHaveBeenCalledTimes(1);
    });
});
