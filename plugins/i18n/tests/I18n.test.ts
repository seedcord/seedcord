import path from 'node:path';
import { stripVTControlCharacters } from 'node:util';

import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { LoggerChannelRegistry } from '@seedcord/logger';
import { Locale } from 'discord-api-types/v10';
import { describe, expect, it } from 'vite-plus/test';

import { I18n } from '#src/I18n';

import { commandBodies } from './commands';
import { TestHost } from './host';

import type { I18nOptions } from '#src/I18n';
import type { DispatchOrigin } from '@seedcord/core';

const FIXTURES = path.join(import.meta.dirname, 'fixtures');

function i18nAt(fixture: string, options: Omit<I18nOptions, 'dir'> = {}): I18n {
    return new TestHost().attach('i18n', I18n, { dir: path.join(FIXTURES, fixture), ...options }).i18n;
}

function from(locales: Partial<Pick<DispatchOrigin, 'userLocale' | 'guildLocale'>>): DispatchOrigin {
    return { userId: '1', guildId: null, channelId: null, userLocale: null, guildLocale: null, ...locales };
}

async function tFor(
    origin: DispatchOrigin,
    options: Omit<I18nOptions, 'dir'> = {}
): ReturnType<I18n['dispatchMembers']['t']> {
    const i18n = i18nAt('good', options);
    await i18n.init();
    return i18n.dispatchMembers.t(origin);
}

describe('I18n', () => {
    it('rejects an empty dir', () => {
        expect(() => new TestHost().attach('i18n', I18n, { dir: '' })).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.PluginOptionsRejected })
        );
    });

    describe('t', () => {
        it("translates into the user's locale", async () => {
            const t = await tFor(from({ userLocale: Locale.Polish }));

            expect(t('greeting', { user: 'Ana' })).toBe('Cześć Ana, witaj w seedcord');
            expect(t.locale).toBe('pl');
        });

        it('picks the plural form each locale uses', async () => {
            const pl = await tFor(from({ userLocale: Locale.Polish }));
            const en = await tFor(from({ userLocale: Locale.EnglishUS }));

            expect([1, 3, 5].map((count) => pl('items', { count }))).toEqual([
                'Masz 1 przedmiot',
                'Masz 3 przedmioty',
                'Masz 5 przedmiotów'
            ]);
            expect([1, 2].map((count) => en('items', { count }))).toEqual(['You have 1 item', 'You have 2 items']);
        });

        it("reads the pair's file, then the base's, for a message that the locale's file doesn't have", async () => {
            const t = await tFor(from({ userLocale: Locale.SpanishLATAM }));

            expect(t('items', { count: 2 })).toBe('Tenés 2 objetos');
            expect(t('greeting', { user: 'Ana' })).toBe('Hola Ana, bienvenido a seedcord');
            expect(t('ping-reply', { ms: 42 })).toBe('Pong! 42ms');
        });

        it("uses the guild's locale, then the base, when the user's is missing", async () => {
            const guild = await tFor(from({ guildLocale: Locale.Polish }));
            const neither = await tFor(from({}));

            expect(guild.locale).toBe('pl');
            expect(neither.locale).toBe('en-US');
        });

        it("binds to the base for a locale that doesn't have a file", async () => {
            const t = await tFor(from({ userLocale: Locale.Japanese }));

            expect(t.locale).toBe('en-US');
            expect(t('role', { user: 'Ana', role: 'admin' })).toBe('Ana is an admin');
        });

        it('takes the locale resolveLocale returns over the Discord ones', async () => {
            const t = await tFor(from({ userLocale: Locale.EnglishUS }), { resolveLocale: () => 'pl' });

            expect(t.locale).toBe('pl');
        });

        it('throws for a message that no locale file has, like one a stale seedcord-gen.ts still offers', async () => {
            const t = await tFor(from({}));

            expect(() => t('removed', {})).toThrow(
                expect.objectContaining({ code: SeedcordErrorCode.PluginI18nOutOfDate })
            );
        });
    });

    describe('prepareCommands', () => {
        async function prepared(fixture: string): Promise<ReturnType<typeof commandBodies>> {
            const bodies = commandBodies();
            await i18nAt(`commands/${fixture}`).prepareCommands(bodies);
            return bodies;
        }

        async function problemsIn(fixture: string): Promise<unknown[][]> {
            const failure: unknown = await prepared(fixture).catch((error: unknown) => error);
            const errors = isSeedcordError(failure, 'SeedcordAggregateError') ? failure.errors : [failure];
            return errors.map((error) =>
                isSeedcordError(error) ? [error.code, stripVTControlCharacters(error.message)] : []
            );
        }

        it("adds each locale's names and descriptions to every command, option, choice, and menu", async () => {
            const [ball, config, probe, viewProfile, reportMessage] = await prepared('good');

            expect(ball).toMatchObject({
                name_localizations: { pl: 'kula', de: 'kugel' },
                description_localizations: { pl: 'Zapytaj kulę' }
            });
            expect(config).toMatchObject({
                name_localizations: { pl: 'konfiguracja' },
                options: [
                    {
                        name_localizations: { pl: 'logi' },
                        options: [
                            {
                                name_localizations: { pl: 'ustaw' },
                                options: [
                                    {
                                        name_localizations: { pl: 'kanał' },
                                        description_localizations: { pl: 'Gdzie trafiają logi' }
                                    }
                                ]
                            }
                        ]
                    },
                    { name: 'show' }
                ]
            });
            expect(probe).not.toHaveProperty('name_localizations');
            expect(probe).toMatchObject({
                options: [{ choices: [{ value: 'books', name_localizations: { pl: 'Książki' } }, { value: 'films' }] }]
            });
            expect(viewProfile?.name_localizations).toEqual({ pl: 'Pokaż profil' });
            expect(reportMessage?.name_localizations).toEqual({ pl: 'Zgłoś wiadomość' });
        });

        it("throws for a name that's on none of the commands", async () => {
            expect(await problemsIn('unknown')).toEqual([
                [SeedcordErrorCode.PluginI18nUnknownCommand, expect.stringMatching(/slash\.config\.subcommands\.sett/)]
            ]);
        });

        it("throws for a file whose default export commandTranslations didn't make", async () => {
            expect(await problemsIn('plain')).toEqual([
                [SeedcordErrorCode.PluginI18nNotTranslations, expect.stringMatching(/pl\.ts/)]
            ]);
        });

        it('reports every translation that Discord would reject, and a file named after no locale', async () => {
            const problems = await problemsIn('rejected');

            expect(problems).toEqual(
                expect.arrayContaining([
                    [SeedcordErrorCode.PluginI18nNotALocale, expect.stringMatching(/en\.ts/)],
                    [SeedcordErrorCode.PluginI18nDiscordRejects, expect.stringMatching(/slash\.8ball\.name/)],
                    [SeedcordErrorCode.PluginI18nDiscordRejects, expect.stringMatching(/slash\.8ball\.description/)],
                    [
                        SeedcordErrorCode.PluginI18nDiscordRejects,
                        expect.stringMatching(/slash\.probe\.options\.category\.choices\.books/)
                    ],
                    [SeedcordErrorCode.PluginI18nDiscordRejects, expect.stringMatching(/userMenus\.View Profile/)]
                ])
            );
            expect(problems).toHaveLength(5);
        });
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
