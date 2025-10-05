import createConfig from '@seedcord/eslint-config';

export default createConfig({
    typescript: true,
    ignores: ['dist/**', 'coverage/**', 'node_modules/**']
});
