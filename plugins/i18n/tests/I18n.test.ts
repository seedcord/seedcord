import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it } from 'vite-plus/test';

import { I18n } from '#src/I18n';

import { TestHost } from './host';

describe('I18n', () => {
    it('rejects an empty dir', () => {
        expect(() => new TestHost().attach('i18n', I18n, { dir: '' })).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.PluginOptionsRejected })
        );
    });
});
