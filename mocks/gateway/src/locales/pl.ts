import { commandTranslations } from '@seedcord/plugin-i18n';

export default commandTranslations({
    slash: {
        ping: {
            description: 'Sprawdź, czy bot odpowiada',
            options: { detailed: { name: 'szczegóły', description: 'Pokaż czas działania procesu' } }
        },
        probe: { options: { category: { choices: { books: 'Książki', films: 'Filmy' } } } }
    },
    userMenus: { 'View Profile': 'Pokaż profil' },
    messageMenus: { 'Report Message': 'Zgłoś wiadomość' }
});
