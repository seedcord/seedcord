import { commandTranslations } from '#src/commandTranslations';

import '#tests/registries';

export default commandTranslations({
    slash: {
        '8ball': { name: 'kula', description: 'Zapytaj kulę' },
        config: {
            name: 'konfiguracja',
            subcommands: {
                logs: {
                    name: 'logi',
                    subcommands: {
                        set: {
                            name: 'ustaw',
                            options: { channel: { name: 'kanał', description: 'Gdzie trafiają logi' } }
                        }
                    }
                }
            }
        },
        probe: { options: { category: { choices: { books: 'Książki' } } } }
    },
    userMenus: { 'View Profile': 'Pokaż profil' },
    messageMenus: { 'Report Message': 'Zgłoś wiadomość' }
});
