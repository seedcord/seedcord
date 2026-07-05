import { ESLintUtils } from '@typescript-eslint/utils';

export const createRule = ESLintUtils.RuleCreator(
    (name) => `https://github.com/seedcord/seedcord/blob/next/packages/eslint-plugin-discordjs/docs/rules/${name}.md`
);
