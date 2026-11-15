import { commandTranslations } from '#src/commandTranslations';

import './registries';

import type { CommandTranslations, TranslationTree } from '#src/commandTranslations';

// the plugin reads every bot's file through TranslationTree
export function readAsTree(translations: CommandTranslations): TranslationTree {
    return translations;
}

commandTranslations({
    slash: {
        '8ball': { name: 'kula' },
        config: {
            subcommands: {
                logs: { subcommands: { set: { options: { channel: { name: 'kanał' } } } } },
                show: { description: 'Pokaż' }
            }
        },
        probe: { options: { category: { choices: { books: 'książki' } } } }
    },
    userMenus: { 'View Profile': 'Pokaż profil' },
    messageMenus: { 'Report Message': 'Zgłoś' }
});

// @ts-expect-error no slash command is named sett
commandTranslations({ slash: { config: { subcommands: { sett: {} } } } });

// @ts-expect-error show doesn't have a channel option
commandTranslations({ slash: { config: { subcommands: { show: { options: { channel: {} } } } } } });

// @ts-expect-error category's choices are books and films
commandTranslations({ slash: { probe: { options: { category: { choices: { music: 'muzyka' } } } } } });

// @ts-expect-error config has subcommands, so it doesn't take options
commandTranslations({ slash: { config: { options: {} } } });

// @ts-expect-error a user menu and a message menu are separate
commandTranslations({ userMenus: { 'Report Message': 'Zgłoś' } });
