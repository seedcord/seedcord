import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';
import { SymbolFlags } from 'typescript';

import { createRule } from '../createRule';

import type { TSESTree } from '@typescript-eslint/utils';

const LOG_LEVELS = new Set(['error', 'warn', 'info', 'debug', 'trace']);

// a workspace link resolves to the package source, an install resolves under node_modules
const LOGGER_PATHS = [/[\\/]@seedcord[\\/]logger[\\/]/, /[\\/]packages[\\/]logger[\\/]/];

// the root of `chalk.hex('#fff')('x')` is still the chalk identifier
function rootIdentifier(node: TSESTree.Node): TSESTree.Identifier | undefined {
    let current = node;
    while (current.type === AST_NODE_TYPES.MemberExpression || current.type === AST_NODE_TYPES.CallExpression) {
        current = current.type === AST_NODE_TYPES.MemberExpression ? current.object : current.callee;
    }
    return current.type === AST_NODE_TYPES.Identifier ? current : undefined;
}

// `chalk.hex('#fff')('x')` nests two calls that both root at chalk, and only the outer one is worth reporting
function isInnerChalkCall(node: TSESTree.CallExpression): boolean {
    return node.parent.type === AST_NODE_TYPES.CallExpression && node.parent.callee === node;
}

export default createRule({
    name: 'use-paint-in-logs',
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow chalk inside a logger call. Style the value with paint from @seedcord/errors.'
        },
        messages: {
            usePaint:
                'Style this with a paint tone from @seedcord/errors. A terminal theme remaps chalk color names, so the log line reads differently for every user.'
        },
        schema: []
    },
    defaultOptions: [],
    create(context) {
        const services = ESLintUtils.getParserServices(context);
        const checker = services.program.getTypeChecker();
        const chalkLocals = new Set<string>();

        // a local class named Logger matches on name alone
        function isSeedcordLogger(receiver: TSESTree.Node): boolean {
            const symbol = services.getTypeAtLocation(receiver).getSymbol();
            const target = symbol && symbol.flags & SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
            if (target?.getName() !== 'Logger') return false;
            const file = target.declarations?.[0]?.getSourceFile().fileName;
            return file !== undefined && LOGGER_PATHS.some((pattern) => pattern.test(file));
        }

        function enclosingLoggerCall(node: TSESTree.Node): boolean {
            // Program.parent is null at runtime, which the declared type omits
            for (let current: TSESTree.Node | undefined = node.parent; current; current = current.parent) {
                if (current.type !== AST_NODE_TYPES.CallExpression) continue;
                const { callee } = current;
                if (callee.type !== AST_NODE_TYPES.MemberExpression || callee.computed) continue;
                if (callee.property.type !== AST_NODE_TYPES.Identifier) continue;
                if (!LOG_LEVELS.has(callee.property.name)) continue;
                if (isSeedcordLogger(callee.object)) return true;
            }
            return false;
        }

        return {
            ImportDeclaration(node) {
                if (node.source.value !== 'chalk') return;
                for (const spec of node.specifiers) chalkLocals.add(spec.local.name);
            },
            CallExpression(node) {
                if (isInnerChalkCall(node)) return;
                const root = rootIdentifier(node.callee);
                if (root === undefined || !chalkLocals.has(root.name)) return;
                if (enclosingLoggerCall(node)) context.report({ node, messageId: 'usePaint' });
            }
        };
    }
});
