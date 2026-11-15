import path from 'node:path';
import { stripVTControlCharacters } from 'node:util';

import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { LoggerChannelRegistry } from '@seedcord/logger';
import { Locale } from 'discord-api-types/v10';
import { describe, expect, it } from 'vite-plus/test';

import { I18n } from '#src/I18n';

import { TestHost } from './host';

import type { I18nOptions } from '#src/I18n';

const FIXTURES = path.join(import.meta.dirname, 'fixtures');

function i18nAt(fixture: string, options: Omit<I18nOptions, 'dir'> = {}): I18n {
    return new TestHost().attach('i18n', I18n, { dir: path.join(FIXTURES, fixture), ...options }).i18n;
}

describe('I18n', () => {
    it('rejects an empty dir', () => {
        expect(() => new TestHost().attach('i18n', I18n, { dir: '' })).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.PluginOptionsRejected })
        );
    });

    describe('codegen', () => {
        it("types each message's variables, merged across every locale", async () => {
            expect(await i18nAt('good').codegen()).toEqual({
                messages: {
                    greeting: { user: 'text' },
                    items: { count: 'number' },
                    role: { user: 'text', role: ['admin', 'mod', 'other', 'owner'] },
                    'ping-reply': { ms: 'number' }
                }
            });
        });

        it('notes each key a locale leaves to the base', async () => {
            const notes: string[] = [];
            using _capture = LoggerChannelRegistry.instance.installSink({
                kind: 'capture',
                onLog: (record) => notes.push(stripVTControlCharacters(record.message))
            });

            await i18nAt('good').codegen();

            expect(notes).toContainEqual(expect.stringMatching(/pl\.ftl doesn't have ping-reply/));
        });

        it('reports every broken file at its line, all at once', async () => {
            const failure: unknown = await i18nAt('broken')
                .codegen()
                .catch((error: unknown) => error);

            if (!isSeedcordError(failure, 'SeedcordAggregateError')) throw new Error('expected an aggregate');
            const problems = failure.errors.map((error) =>
                isSeedcordError(error) ? [error.code, stripVTControlCharacters(error.message)] : []
            );
            expect(problems).toEqual(
                expect.arrayContaining([
                    [
                        SeedcordErrorCode.PluginI18nNotInBase,
                        expect.stringMatching(/de\.ftl:1 has \$username in greeting/)
                    ],
                    [SeedcordErrorCode.PluginI18nNotInBase, expect.stringMatching(/de\.ftl:6 has the message greting/)],
                    [SeedcordErrorCode.PluginI18nSyntax, expect.stringMatching(/de\.ftl:7/)],
                    [SeedcordErrorCode.PluginI18nNotInBase, expect.stringMatching(/de\.ftl:11 has \.tooltip on ping/)],
                    [SeedcordErrorCode.PluginI18nNotALocale, expect.stringMatching(/en-US\.ftl or .*en-GB\.ftl/)]
                ])
            );
            expect(problems).toHaveLength(5);
        });

        it('checks every locale against the base option', async () => {
            await expect(i18nAt('good', { base: Locale.Polish }).codegen()).rejects.toMatchObject({
                code: SeedcordErrorCode.PluginI18nNotInBase
            });
        });

        it("throws when dir doesn't have a file for the base locale", async () => {
            await expect(i18nAt('good', { base: 'de' }).codegen()).rejects.toMatchObject({
                code: SeedcordErrorCode.PluginI18nBaseMissing
            });
        });
    });
});
