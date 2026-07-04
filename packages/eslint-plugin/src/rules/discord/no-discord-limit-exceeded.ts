import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';

import { createRule } from '../../createRule';
import { chainRoot, collectChain, isChainTop, methodName } from '../../utils';

import type { TSESTree } from '@typescript-eslint/utils';

interface Limit {
    builders: ReadonlySet<string>;
    addMethod: string;
    setMethod: string;
    cap: number;
    detail: string;
}

const LIMITS: readonly Limit[] = [
    {
        builders: new Set(['ActionRowBuilder']),
        addMethod: 'addComponents',
        setMethod: 'setComponents',
        cap: 5,
        detail: 'An action row holds at most 5 components'
    },
    {
        builders: new Set(['StringSelectMenuBuilder']),
        addMethod: 'addOptions',
        setMethod: 'setOptions',
        cap: 25,
        detail: 'A select menu holds at most 25 options'
    },
    {
        builders: new Set(['EmbedBuilder']),
        addMethod: 'addFields',
        setMethod: 'setFields',
        cap: 25,
        detail: 'An embed holds at most 25 fields'
    },
    {
        builders: new Set(['SlashCommandStringOption', 'SlashCommandIntegerOption', 'SlashCommandNumberOption']),
        addMethod: 'addChoices',
        setMethod: 'setChoices',
        cap: 25,
        detail: 'A slash option holds at most 25 choices'
    }
];

// the runtime item count: addMethod appends, setMethod replaces everything before it. collectChain is
// outermost-first, so walk it reversed to follow source order. undefined when a count is not statically known.
function countStaticItems(calls: TSESTree.CallExpression[], limit: Limit): number | undefined {
    let count = 0;
    let matched = false;
    for (const call of [...calls].reverse()) {
        const name = methodName(call);
        if (name === limit.addMethod) {
            matched = true;
            if (call.arguments.some((arg) => arg.type === AST_NODE_TYPES.SpreadElement)) return undefined;
            count += call.arguments.length;
        } else if (name === limit.setMethod) {
            matched = true;
            const arg = call.arguments[0];
            if (arg?.type !== AST_NODE_TYPES.ArrayExpression) return undefined;
            if (arg.elements.some((element) => element?.type === AST_NODE_TYPES.SpreadElement)) return undefined;
            count = arg.elements.length;
        }
    }
    return matched ? count : undefined;
}

export default createRule({
    name: 'no-discord-limit-exceeded',
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow exceeding a Discord builder limit with a statically-known number of items.'
        },
        messages: {
            tooMany: '{{detail}}. This chain declares {{count}}.'
        },
        schema: []
    },
    defaultOptions: [],
    create(context) {
        const services = ESLintUtils.getParserServices(context);

        return {
            CallExpression(node) {
                if (!isChainTop(node)) return;

                const calls = collectChain(node);
                const methods = new Set(calls.map((call) => methodName(call)));
                // resolve the receiver type only when a capped method is on the chain, keeping type lookups off unrelated chains
                if (!LIMITS.some((limit) => methods.has(limit.addMethod) || methods.has(limit.setMethod))) return;

                const builderName = services.getTypeAtLocation(chainRoot(node)).getSymbol()?.getName();
                if (builderName === undefined) return;

                const limit = LIMITS.find((entry) => entry.builders.has(builderName));
                if (!limit) return;

                const count = countStaticItems(calls, limit);
                if (count !== undefined && count > limit.cap) {
                    context.report({ node, messageId: 'tooMany', data: { detail: limit.detail, count } });
                }
            }
        };
    }
});
