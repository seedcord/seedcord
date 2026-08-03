import { recommended as discordjsRecommended } from 'eslint-plugin-discordjs';

import commandBuilderMissingRegisterCommand from './rules/command-builder-missing-register-command';
import eventHandlerMissingRegisterEvent from './rules/event-handler-missing-register-event';
import interactionHandlerMissingRoute from './rules/interaction-handler-missing-route';
import middlewareMissingRegisterDecorator from './rules/middleware-missing-register-decorator';
import noDjsBuilderImport from './rules/no-djs-builder-import';
import noRawClientEvents from './rules/no-raw-client-events';
import noRawInteractionAcks from './rules/no-raw-interaction-acks';
import subscriberMissingDecorators from './rules/subscriber-missing-decorators';
import useCustomIdCodec from './rules/use-custom-id-codec';

import type { TSESLint } from '@typescript-eslint/utils';

const rules = {
    'command-builder-missing-register-command': commandBuilderMissingRegisterCommand,
    'event-handler-missing-register-event': eventHandlerMissingRegisterEvent,
    'interaction-handler-missing-route': interactionHandlerMissingRoute,
    'middleware-missing-register-decorator': middlewareMissingRegisterDecorator,
    'no-djs-builder-import': noDjsBuilderImport,
    'no-raw-client-events': noRawClientEvents,
    'no-raw-interaction-acks': noRawInteractionAcks,
    'subscriber-missing-decorators': subscriberMissingDecorators,
    'use-custom-id-codec': useCustomIdCodec
} satisfies Record<string, TSESLint.RuleModule<string, readonly unknown[]>>;

const plugin: TSESLint.FlatConfig.Plugin = {
    meta: { name: '@seedcord/eslint-plugin', version: process.env.PACKAGE_VERSION ?? '0.0.0' },
    rules
};

const presetRules: NonNullable<TSESLint.FlatConfig.Config['rules']> = {};
for (const name of Object.keys(rules)) {
    presetRules[`@seedcord/${name}`] = 'error';
}

export const recommended: TSESLint.FlatConfig.Config = {
    plugins: { '@seedcord': plugin },
    rules: presetRules
};

// the seedcord preset layers the framework rules over the discord.js set
export const seedcord: TSESLint.FlatConfig.Config[] = [discordjsRecommended, recommended];

plugin.configs = { seedcord };

export default plugin;
