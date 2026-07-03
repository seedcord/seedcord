import createConfig from '@seedcord/eslint-config';

export default createConfig({
    tsconfigRootDir: import.meta.dirname,
    discordRules: true,
    generalIgnores: ['**/seedcord-gen.d.ts']
});
