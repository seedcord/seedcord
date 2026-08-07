import {
    constructorData,
    enclosingChainTop,
    extendsDjsType,
    chainRoot,
    collectChain,
    isChainTop,
    staticNumber,
    trustedConstructorData
} from '@seedcord/eslint-utils';
import { ESLintUtils } from '@typescript-eslint/utils';

import { gatherFacts, knownStyle, LINK, PREMIUM, STYLE_NAMES } from '../buttons';
import { createRule } from '../createRule';

import type { ButtonFacts, ButtonProp } from '../buttons';
import type { TSESTree } from '@typescript-eslint/utils';

const PREMIUM_FORBIDDEN: readonly ButtonProp[] = ['customId', 'label', 'url', 'emoji'];

export default createRule({
    name: 'no-conflicting-button-props',
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow conflicting props on a button builder.'
        },
        messages: {
            idAndUrl: 'A button cannot set both a customId and a url.',
            linkWithCustomId: 'A Link button uses a url and cannot have a customId.',
            urlOnNonLink: 'A {{style}} button cannot have a url. Only a Link button takes one.',
            skuIdOnNonPremium: 'A {{style}} button cannot have a skuId. Only a Premium button takes one.',
            skuIdWithProp: 'A button cannot set both a skuId and a {{prop}}.',
            premiumProp: 'A Premium button cannot have a {{prop}}, only a skuId.'
        },
        schema: []
    },
    defaultOptions: [],
    create(context) {
        const services = ESLintUtils.getParserServices(context);
        const checker = services.program.getTypeChecker();

        function reportPremiumProps(props: Map<ButtonProp, TSESTree.Node>): void {
            for (const prop of PREMIUM_FORBIDDEN) {
                const site = props.get(prop);
                if (site === undefined) continue;
                context.report({ node: site, messageId: 'premiumProp', data: { prop } });
            }
        }

        function reportConflicts(anchor: TSESTree.Node, style: number | undefined, facts: ButtonFacts): void {
            const { props } = facts;
            const customId = props.get('customId');
            const url = props.get('url');
            if (customId !== undefined && url !== undefined) {
                context.report({ node: anchor, messageId: 'idAndUrl' });
            } else if (customId !== undefined && style === LINK) {
                context.report({ node: anchor, messageId: 'linkWithCustomId' });
            } else if (url !== undefined && style !== undefined && style < LINK) {
                context.report({ node: url, messageId: 'urlOnNonLink', data: { style: STYLE_NAMES[style] } });
            }

            const skuId = props.get('skuId');
            if (skuId === undefined) return;
            if (style !== undefined) {
                context.report({ node: skuId, messageId: 'skuIdOnNonPremium', data: { style: STYLE_NAMES[style] } });
                return;
            }
            // premium forbids these props and every other style forbids the skuId, so the pair
            // throws no matter what the style turns out to be
            for (const prop of PREMIUM_FORBIDDEN) {
                if (props.has(prop)) {
                    context.report({ node: skuId, messageId: 'skuIdWithProp', data: { prop } });
                }
            }
        }

        function check(anchor: TSESTree.Node, calls: TSESTree.CallExpression[], root: TSESTree.Node): void {
            const facts = gatherFacts(calls, constructorData(root));
            if (facts.props.size === 0 && facts.styleSource === undefined) return;

            const rootType = services.getTypeAtLocation(root);
            if (!extendsDjsType(checker, rootType, 'ButtonBuilder')) return;

            const trusted = gatherFacts(calls, trustedConstructorData(root, rootType));

            // the type resolves every literal form (enum member, raw value, const, shadowed ButtonStyle) to its own value
            const style = knownStyle(staticNumber(trusted.styleSource, services));

            if (style === PREMIUM) reportPremiumProps(trusted.props);
            else reportConflicts(anchor, style, trusted);
        }

        return {
            CallExpression(node) {
                if (!isChainTop(node)) return;
                check(node, collectChain(node), chainRoot(node));
            },
            NewExpression(node) {
                // a chained root is anchored by its chain-top CallExpression visit instead
                if (enclosingChainTop(node) !== node) return;
                check(node, [], node);
            }
        };
    }
});
