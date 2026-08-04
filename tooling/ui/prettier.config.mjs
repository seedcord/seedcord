import { createPrettierConfig } from '@seedcord/eslint-config/prettier';

export default createPrettierConfig({ tailwind: { stylesheet: './src/styles/globals.css' } });
