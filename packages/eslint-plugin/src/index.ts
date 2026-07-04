import noChoicesAndAutocomplete from './rules/discord/no-choices-and-autocomplete';
import noConflictingButtonProps from './rules/discord/no-conflicting-button-props';
import noContentWithV2Components from './rules/discord/no-content-with-v2-components';
import noDiscordLimitExceeded from './rules/discord/no-discord-limit-exceeded';
import preferEphemeralFlag from './rules/discord/prefer-ephemeral-flag';
import preferV2Component from './rules/discord/prefer-v2-component';
import requiredOptionBeforeOptional from './rules/discord/required-option-before-optional';
import validCommandName from './rules/discord/valid-command-name';
import commandBuilderMissingRegisterCommand from './rules/seedcord/command-builder-missing-register-command';
import eventHandlerMissingRegisterEvent from './rules/seedcord/event-handler-missing-register-event';
import interactionHandlerMissingRoute from './rules/seedcord/interaction-handler-missing-route';
import middlewareMissingRegisterDecorator from './rules/seedcord/middleware-missing-register-decorator';
import noDjsBuilderImport from './rules/seedcord/no-djs-builder-import';
import noRawClientEvents from './rules/seedcord/no-raw-client-events';
import useCustomIdCodec from './rules/seedcord/use-custom-id-codec';

import type { TSESLint } from '@typescript-eslint/utils';

const seedcordRules = {
    'command-builder-missing-register-command': commandBuilderMissingRegisterCommand,
    'event-handler-missing-register-event': eventHandlerMissingRegisterEvent,
    'interaction-handler-missing-route': interactionHandlerMissingRoute,
    'middleware-missing-register-decorator': middlewareMissingRegisterDecorator,
    'no-raw-client-events': noRawClientEvents,
    'use-custom-id-codec': useCustomIdCodec,
    'no-djs-builder-import': noDjsBuilderImport
} satisfies Record<string, TSESLint.RuleModule<string, readonly unknown[]>>;

const djsRules = {
    'no-choices-and-autocomplete': noChoicesAndAutocomplete,
    'no-conflicting-button-props': noConflictingButtonProps,
    'no-content-with-v2-components': noContentWithV2Components,
    'no-discord-limit-exceeded': noDiscordLimitExceeded,
    'prefer-ephemeral-flag': preferEphemeralFlag,
    'prefer-v2-component': preferV2Component,
    'required-option-before-optional': requiredOptionBeforeOptional,
    'valid-command-name': validCommandName
} satisfies Record<string, TSESLint.RuleModule<string, readonly unknown[]>>;

const plugin: TSESLint.FlatConfig.Plugin = {
    meta: { name: '@seedcord/eslint-plugin', version: process.env.PACKAGE_VERSION ?? '0.0.0' },
    rules: { ...djsRules, ...seedcordRules }
};

// prefer-* rules are style choices, so they warn
const WARN_RULES = new Set(['prefer-ephemeral-flag', 'prefer-v2-component']);

function preset(ruleNames: string[]): TSESLint.FlatConfig.Config {
    const rules: NonNullable<TSESLint.FlatConfig.Config['rules']> = {};
    for (const name of ruleNames) {
        rules[`@seedcord/${name}`] = WARN_RULES.has(name) ? 'warn' : 'error';
    }
    return { plugins: { '@seedcord': plugin }, rules };
}

plugin.configs = {
    // recommended is the framework-agnostic base, safe on a plain discord.js bot
    recommended: preset(Object.keys(djsRules)),
    seedcord: preset([...Object.keys(djsRules), ...Object.keys(seedcordRules)])
};

export default plugin;
