import { ESLintUtils } from '@typescript-eslint/utils';

export const createRule = ESLintUtils.RuleCreator(
    (name) => `https://github.com/seedcord/seedcord/blob/next/tooling/eslint-plugin/docs/rules/${name}.md`
);
