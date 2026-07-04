import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';

import { createRule } from '../../createRule';
import { isFromDiscordJs } from '../../typeUtils';

export default createRule({
    name: 'prefer-v2-component',
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Prefer a components v2 layout over a legacy embed.'
        },
        messages: {
            preferV2: 'Prefer a components v2 layout (ContainerBuilder, TextDisplayBuilder) over an embed.'
        },
        schema: []
    },
    defaultOptions: [],
    create(context) {
        const services = ESLintUtils.getParserServices(context);
        const checker = services.program.getTypeChecker();

        return {
            NewExpression(node) {
                const symbol = services.getTypeAtLocation(node).getSymbol();
                if (symbol?.getName() === 'EmbedBuilder' && isFromDiscordJs(symbol)) {
                    context.report({ node, messageId: 'preferV2' });
                }
            },
            // EmbedBuilder.from() is a static factory that returns an embed without `new`
            CallExpression(node) {
                if (node.callee.type !== AST_NODE_TYPES.MemberExpression) return;
                if (node.callee.property.type !== AST_NODE_TYPES.Identifier || node.callee.property.name !== 'from') {
                    return;
                }
                const symbol = services.getTypeAtLocation(node.callee.object).getSymbol();
                if (symbol?.getName() === 'EmbedBuilder' && isFromDiscordJs(symbol)) {
                    context.report({ node, messageId: 'preferV2' });
                }
            },
            // a seedcord embed component: a class whose .component resolves to EmbedBuilder through its generic
            ClassDeclaration(node) {
                if (!node.superClass || !node.id) return;

                const symbol = services.getSymbolAtLocation(node.id);
                if (!symbol) return;
                const component = checker.getDeclaredTypeOfSymbol(symbol).getProperty('component');
                if (!component) return;

                const componentType = checker.getTypeOfSymbolAtLocation(
                    component,
                    services.esTreeNodeToTSNodeMap.get(node)
                );
                const componentSymbol = componentType.getSymbol();
                if (componentSymbol?.getName() === 'EmbedBuilder' && isFromDiscordJs(componentSymbol)) {
                    context.report({ node: node.id, messageId: 'preferV2' });
                }
            }
        };
    }
});
