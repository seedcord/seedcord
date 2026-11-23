import { commandTranslations } from '#src/commandTranslations';

import '#tests/registries';

// discord caps a description at 100 characters
const ONE_PAST_THE_CAP = 101;

export default commandTranslations({
    slash: {
        '8ball': { name: 'Kula', description: 'x'.repeat(ONE_PAST_THE_CAP) },
        probe: { options: { category: { choices: { books: '' } } } }
    },
    userMenus: { 'View Profile': 'Pokaż profil użytkownika i wszystkie jego role' }
});
