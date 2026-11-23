import { commandTranslations } from '@seedcord/plugin-i18n';

export default commandTranslations({
    slash: {
        ping: { description: 'Sprawdź, czy bot odpowiada' },
        roll: {
            name: 'rzut',
            description: 'Rzuć kostką',
            options: { sides: { name: 'ścianki', description: 'Ile ścianek ma kostka' } }
        }
    }
});
