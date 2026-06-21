import createConfig from '@seedcord/eslint-config';

export default createConfig({
    tsconfigRootDir: import.meta.dirname,
    // the renderer owns this file's exact bytes (the codegen --check gate enforces them), so keep eslint off it.
    generalIgnores: ['**/seedcord-gen.d.ts']
});
