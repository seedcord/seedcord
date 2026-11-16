import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { stripVTControlCharacters } from 'node:util';

import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { LoggerChannelRegistry } from '@seedcord/logger';
import { setDevFiles } from '@seedcord/utils/internal';
import { Locale } from 'discord-api-types/v10';
import { describe, expect, it } from 'vite-plus/test';

import { I18n } from '#src/I18n';

import { commandBodies } from './commands';
import { TestHost } from './host';
import { tempCatalog } from './tempCatalog';

import type { I18nOptions } from '#src/I18n';
import type { DispatchOrigin } from '@seedcord/core';

const FIXTURES = path.join(import.meta.dirname, 'fixtures');

function i18nAt(fixture: string, options: Omit<I18nOptions, 'dir'> = {}): I18n {
    return new TestHost().attach('i18n', I18n, { dir: path.join(FIXTURES, fixture), ...options }).i18n;
}

function from(locales: Partial<Pick<DispatchOrigin, 'userLocale' | 'guildLocale'>>): DispatchOrigin {
    return { userId: '1', guildId: null, channelId: null, userLocale: null, guildLocale: null, ...locales };
}

// [code, message] for each error that the call threw, one or several
async function problemsOf(work: Promise<unknown>): Promise<unknown[][]> {
    const failure: unknown = await work.then(
        () => undefined,
        (error: unknown) => error
    );
    const errors = isSeedcordError(failure, 'SeedcordAggregateError') ? failure.errors : [failure];
    return errors.map((error) => (isSeedcordError(error) ? [error.code, stripVTControlCharacters(error.message)] : []));
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
    it('throws on attach when dir is outside root', () => {
        using _dev = setDevFiles({ root: path.join(FIXTURES, 'good'), listed: [], skippedFolders: [] });

        expect(() => new TestHost().attach('i18n', I18n, { dir: path.join(FIXTURES, 'commands') })).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CorePathOutsideRoot })
        );
    });

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

        it("formats an attribute as message.attribute, and reads the base's when the locale's file doesn't have it", async () => {
            const t = await tFor(from({ userLocale: Locale.Polish }));

            expect(t('email-field', {})).toBe('E-mail');
            expect(t('email-field.placeholder', { domain: 'seedcord.org' })).toBe('you@seedcord.org');
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

        it("throws with Fluent's reason when a call doesn't pass a variable that the message uses", async () => {
            const t = await tFor(from({}));

            // justified: a call that gets past the generated types, like one through a cast
            expect(() => t('greeting', {})).toThrow(
                expect.objectContaining({ code: SeedcordErrorCode.PluginI18nFormatFailed })
            );
        });

        it('throws for a message that no locale file has, like one a stale seedcord-gen.ts still offers', async () => {
            const t = await tFor(from({}));

            expect(() => t('removed', {})).toThrow(
                expect.objectContaining({ code: SeedcordErrorCode.PluginI18nOutOfDate })
            );
        });
    });

    describe('saves under seedcord dev', () => {
        it('reads a saved .ftl file the next time t runs', async () => {
            await using catalog = await tempCatalog('good', 'saved-ftl');
            const host = new TestHost().attach('i18n', I18n, { dir: catalog.path });
            await host.i18n.init();
            const file = path.join(catalog.path, 'en-US.ftl');
            await writeFile(file, 'greeting = Hey { $user }\n');

            await host.i18n.onHmr({ file, type: 'update' });
            const t = await host.i18n.dispatchMembers.t(from({}));

            expect(t('greeting', { user: 'Ana' })).toBe('Hey Ana');
        });
    });

    describe('prepareCommands', () => {
        async function prepared(fixture: string): Promise<ReturnType<typeof commandBodies>> {
            const bodies = commandBodies();
            await i18nAt(`commands/${fixture}`).prepareCommands(bodies);
            return bodies;
        }

        async function problemsIn(fixture: string): Promise<unknown[][]> {
            return problemsOf(prepared(fixture));
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

        it('reads the translation files from a dir whose path has glob characters', async () => {
            await using catalog = await tempCatalog('commands/good', 'bracket [v2]');
            const bodies = commandBodies();
            const i18n = new TestHost().attach('i18n', I18n, { dir: catalog.path }).i18n;

            await i18n.prepareCommands(bodies);

            expect(bodies[0]?.name_localizations?.pl).toBe('kula');
        });

        it("doesn't import the code files in a subfolder of `dir`", async () => {
            const i18n = i18nAt('commands/nested-helper');

            await expect(i18n.prepareCommands(commandBodies())).resolves.toBeUndefined();
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
                    [SeedcordErrorCode.PluginI18nNotALocale, expect.stringMatching(/en\.ts.*en-US\.ts/)],
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
        it("types each message's and each attribute's variables, with the ones from messages it uses, merged across every locale", async () => {
            expect(await i18nAt('good').codegen()).toEqual({
                messages: {
                    greeting: { user: 'text' },
                    items: { count: 'number' },
                    role: { user: 'text', role: ['admin', 'mod', 'other', 'owner'] },
                    'ping-reply': { ms: 'number' },
                    'label.title': {},
                    'welcome-back': { user: 'text' },
                    'email-field': {},
                    'email-field.placeholder': { domain: 'text' }
                }
            });
        });

        it('notes each key that a locale leaves to another file, and which file', async () => {
            const notes: string[] = [];
            using _capture = LoggerChannelRegistry.instance.installSink({
                kind: 'capture',
                onLog: (record) => notes.push(stripVTControlCharacters(record.message))
            });

            await i18nAt('good').codegen();

            expect(notes).toContainEqual(
                expect.stringMatching(
                    /pl\.ftl doesn't have ping-reply, label\.title, email-field\.placeholder\. Users on that locale get the en-US text/
                )
            );
            expect(notes).toContainEqual(
                expect.stringMatching(/es-419\.ftl doesn't have greeting\. Users on that locale get the es-ES text/)
            );
        });

        it('reports every broken file at its line, all at once', async () => {
            const problems = await problemsOf(i18nAt('broken').codegen());
            expect(problems).toEqual(
                expect.arrayContaining([
                    [
                        SeedcordErrorCode.PluginI18nNotInBase,
                        expect.stringMatching(/de\.ftl:1 has \$username in greeting/)
                    ],
                    [SeedcordErrorCode.PluginI18nNotInBase, expect.stringMatching(/de\.ftl:7 has the message greting/)],
                    [SeedcordErrorCode.PluginI18nSyntax, expect.stringMatching(/de\.ftl:8/)],
                    [SeedcordErrorCode.PluginI18nNotInBase, expect.stringMatching(/de\.ftl:14 has \.tooltip on ping/)],
                    [SeedcordErrorCode.PluginI18nMissingReference, expect.stringMatching(/de\.ftl:15 uses -brand/)],
                    [SeedcordErrorCode.PluginI18nMissingReference, expect.stringMatching(/de\.ftl:16 uses -brand/)],
                    [SeedcordErrorCode.PluginI18nNotALocale, expect.stringMatching(/en-US\.ftl or .*en-GB\.ftl/)]
                ])
            );
            expect(problems).toHaveLength(7);
        });

        it('checks every locale against the base option', async () => {
            expect(await problemsOf(i18nAt('good', { base: Locale.Polish }).codegen())).toContainEqual([
                SeedcordErrorCode.PluginI18nNotInBase,
                expect.stringMatching(/en-US\.ftl:\d+ has the message ping-reply/)
            ]);
        });

        it("throws when dir doesn't have a file for the base locale", async () => {
            await expect(i18nAt('good', { base: 'de' }).codegen()).rejects.toMatchObject({
                code: SeedcordErrorCode.PluginI18nBaseMissing
            });
        });
    });
});
