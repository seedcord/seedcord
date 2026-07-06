import noChoicesAndAutocomplete from './rules/no-choices-and-autocomplete';
import noConflictingButtonProps from './rules/no-conflicting-button-props';
import noDiscordLimitExceeded from './rules/no-discord-limit-exceeded';
import noMixedMessageFormat from './rules/no-mixed-message-format';
import preferEphemeralFlag from './rules/prefer-ephemeral-flag';
import preferV2Component from './rules/prefer-v2-component';
import requireComponentsV2Flag from './rules/require-components-v2-flag';
import requiredOptionBeforeOptional from './rules/required-option-before-optional';
import selectMenuMinExceedsMax from './rules/select-menu-min-exceeds-max';
import validCommandName from './rules/valid-command-name';

import type { TSESLint } from '@typescript-eslint/utils';

const rules = {
    'no-choices-and-autocomplete': noChoicesAndAutocomplete,
    'no-conflicting-button-props': noConflictingButtonProps,
    'no-discord-limit-exceeded': noDiscordLimitExceeded,
    'no-mixed-message-format': noMixedMessageFormat,
    'prefer-ephemeral-flag': preferEphemeralFlag,
    'prefer-v2-component': preferV2Component,
    'require-components-v2-flag': requireComponentsV2Flag,
    'required-option-before-optional': requiredOptionBeforeOptional,
    'select-menu-min-exceeds-max': selectMenuMinExceedsMax,
    'valid-command-name': validCommandName
} satisfies Record<string, TSESLint.RuleModule<string, readonly unknown[]>>;

const plugin: TSESLint.FlatConfig.Plugin = {
    meta: { name: 'eslint-plugin-discordjs', version: process.env.PACKAGE_VERSION ?? '0.0.0' },
    rules
};

// prefer-* rules are style choices, so they warn
const WARN_RULES = new Set(['prefer-ephemeral-flag', 'prefer-v2-component']);

const presetRules: NonNullable<TSESLint.FlatConfig.Config['rules']> = {};
for (const name of Object.keys(rules)) {
    presetRules[`discordjs/${name}`] = WARN_RULES.has(name) ? 'warn' : 'error';
}

export const recommended: TSESLint.FlatConfig.Config = {
    plugins: { discordjs: plugin },
    rules: presetRules
};

plugin.configs = { recommended };

export default plugin;
