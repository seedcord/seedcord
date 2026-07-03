import commandBuilderMissingRegisterCommand from './rules/seedcord/command-builder-missing-register-command';
import eventHandlerMissingRegisterEvent from './rules/seedcord/event-handler-missing-register-event';
import interactionHandlerMissingRoute from './rules/seedcord/interaction-handler-missing-route';
import middlewareMissingRegisterDecorator from './rules/seedcord/middleware-missing-register-decorator';
import useCustomIdCodec from './rules/seedcord/use-custom-id-codec';

import type { TSESLint } from '@typescript-eslint/utils';

const seedcordRules = {
    'command-builder-missing-register-command': commandBuilderMissingRegisterCommand,
    'event-handler-missing-register-event': eventHandlerMissingRegisterEvent,
    'interaction-handler-missing-route': interactionHandlerMissingRoute,
    'middleware-missing-register-decorator': middlewareMissingRegisterDecorator,
    'use-custom-id-codec': useCustomIdCodec
} satisfies Record<string, TSESLint.RuleModule<string, readonly unknown[]>>;

const djsRules = {} satisfies Record<string, TSESLint.RuleModule<string, readonly unknown[]>>;

const plugin: TSESLint.FlatConfig.Plugin = {
    meta: { name: '@seedcord/eslint-plugin', version: process.env.PACKAGE_VERSION ?? '0.0.0' },
    rules: { ...djsRules, ...seedcordRules }
};

function preset(ruleNames: string[]): TSESLint.FlatConfig.Config {
    const rules: NonNullable<TSESLint.FlatConfig.Config['rules']> = {};
    for (const name of ruleNames) {
        rules[`@seedcord/${name}`] = 'error';
    }
    return { plugins: { '@seedcord': plugin }, rules };
}

plugin.configs = {
    // recommended is the framework-agnostic base, safe on a plain discord.js bot
    recommended: preset(Object.keys(djsRules)),
    seedcord: preset([...Object.keys(djsRules), ...Object.keys(seedcordRules)])
};

export default plugin;
