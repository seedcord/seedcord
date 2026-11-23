import { SeedcordErrorCode } from '@seedcord/errors';
import { HOST_CONTRACT, HostAugmentTarget, HostContract, SeedcordBrand } from '@seedcord/types/internal';
import { describe, expect, it } from 'vite-plus/test';

import { toSeedcordInstance } from '#core/modules/importInstance';

describe('toSeedcordInstance', () => {
    it('loads a bot built against the same host contract', () => {
        const bot = { [SeedcordBrand]: true, [HostContract]: HOST_CONTRACT };

        expect(toSeedcordInstance(bot, 'src/bot.ts')).toBe(bot);
    });

    it.each([
        { built: 'before the contract existed', contract: undefined },
        { built: 'against another contract', contract: HOST_CONTRACT + 1 }
    ])('refuses a bot built $built and says which transport to update', ({ contract }) => {
        const bot = { [SeedcordBrand]: true, [HostAugmentTarget]: '@seedcord/gateway', [HostContract]: contract };

        const load = (): unknown => toSeedcordInstance(bot, 'src/bot.ts');

        expect(load).toThrow(expect.objectContaining({ code: SeedcordErrorCode.CliHostContractMismatch }));
        expect(load).toThrow('@seedcord/gateway');
    });

    it('refuses an export without the seedcord brand', () => {
        expect(() => toSeedcordInstance({}, 'src/bot.ts')).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CliInstanceInvalid })
        );
    });
});
