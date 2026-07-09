import { SeedcordErrorCode } from '@seedcord/errors';
import { afterEach, describe, expect, it } from 'vitest';

import { FlagPresenter } from '@commands/commands/cleanPresenters';
import { silentLogger } from '@utils/SilentLogger';

const originalStdin = process.stdin.isTTY;
const originalStdout = process.stdout.isTTY;

afterEach(() => {
    process.stdin.isTTY = originalStdin;
    process.stdout.isTTY = originalStdout;
});

describe('FlagPresenter.confirmDelete', () => {
    it('resolves true when --yes is set, without prompting', async () => {
        const presenter = new FlagPresenter(silentLogger, true);
        await expect(presenter.confirmDelete(3, 0)).resolves.toBe(true);
    });

    it('rejects in a non-TTY without --yes instead of prompting (readline would hang)', async () => {
        process.stdin.isTTY = false;
        process.stdout.isTTY = false;
        const presenter = new FlagPresenter(silentLogger, false);

        await expect(presenter.confirmDelete(3, 0)).rejects.toMatchObject({
            code: SeedcordErrorCode.CliCleanApplyNeedsYes
        });
    });
});
