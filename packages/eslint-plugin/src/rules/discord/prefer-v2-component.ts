import { ESLintUtils } from '@typescript-eslint/utils';

import { createRule } from '../../createRule';

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
            // a raw discord.js embed, new EmbedBuilder()
            NewExpression(node) {
                if (services.getTypeAtLocation(node).getSymbol()?.getName() === 'EmbedBuilder') {
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
                if (componentType.getSymbol()?.getName() === 'EmbedBuilder') {
                    context.report({ node: node.id, messageId: 'preferV2' });
                }
            }
        };
    }
});
