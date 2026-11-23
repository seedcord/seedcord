import { commandTranslations } from '#src/commandTranslations';

import '#tests/registries';

export default commandTranslations({
    // @ts-expect-error a bot that deploys without type-checking can still ship this typo
    slash: { config: { subcommands: { sett: { name: 'ustaw' } } } }
});
