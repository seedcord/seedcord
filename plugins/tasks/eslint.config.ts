import createConfig from '@seedcord/eslint-config';
import { proseConfig } from '@seedcord/prose';

export default createConfig({
    tsconfigRootDir: import.meta.dirname,
    relativeImports: 'parent',
    userConfigs: [
        ...proseConfig,
        {
            // these numbers are cron's own field bounds
            files: ['src/types/CronPattern.ts'],
            rules: {
                'no-magic-numbers': 'off'
            }
        },
        {
            // one line per timezone
            files: ['src/types/Timezone.ts'],
            rules: {
                'max-lines': 'off'
            }
        }
    ]
});
