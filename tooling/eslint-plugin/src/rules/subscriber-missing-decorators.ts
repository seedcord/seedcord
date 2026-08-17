import {
    classInstanceType,
    createDecoratorMatcher,
    extendsSeedcordType,
    forEachSeedcordImport
} from '@seedcord/eslint-utils';
import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';

import { createRule } from '../createRule';

import type { TSESTree } from '@typescript-eslint/utils';

const SUBSCRIBE = 'Subscribe';
const WEBHOOK_URL = 'WebhookUrl';
const SUBSCRIBER = 'Subscriber';
const WEBHOOK_LOG = 'WebhookLog';

interface Kind {
    isSubscriber: boolean;
    isWebhook: boolean;
}

export default createRule({
    name: 'subscriber-missing-decorators',
    meta: {
        type: 'problem',
        docs: {
            description: 'Require @Subscribe on every concrete subscriber and @WebhookUrl on every webhook reporter.'
        },
        messages: {
            missingSubscribe: 'This subscriber has no @Subscribe decorator, so the bus never registers it.',
            missingWebhookUrl:
                'This WebhookLog has no @WebhookUrl decorator naming its url env var, so registration throws at boot.'
        },
        schema: []
    },
    defaultOptions: [],
    create(context) {
        const services = ESLintUtils.getParserServices(context);
        const checker = services.program.getTypeChecker();
        const subscriberBases = new Set<string>();
        const webhookBases = new Set<string>();
        const decorators = createDecoratorMatcher(services, checker, [SUBSCRIBE, WEBHOOK_URL]);

        function classify(node: TSESTree.ClassDeclaration, superName: string): Kind {
            // every webhook base is also a subscriber base
            if (webhookBases.has(superName)) return { isSubscriber: true, isWebhook: true };
            let isSubscriber = subscriberBases.has(superName);
            let isWebhook = false;
            const classType = classInstanceType(node, services, checker);
            if (classType) {
                isSubscriber ||= extendsSeedcordType(checker, classType, SUBSCRIBER);
                isWebhook = extendsSeedcordType(checker, classType, WEBHOOK_LOG);
            }
            return { isSubscriber, isWebhook };
        }

        function trackAbstractBase(node: TSESTree.ClassDeclaration, kind: Kind): void {
            if (!node.id) return;
            subscriberBases.add(node.id.name);
            if (kind.isWebhook) webhookBases.add(node.id.name);
        }

        return {
            ImportDeclaration(node) {
                forEachSeedcordImport(node, (imported, local) => {
                    if (imported === SUBSCRIBER) subscriberBases.add(local);
                    if (imported === WEBHOOK_LOG) {
                        subscriberBases.add(local);
                        webhookBases.add(local);
                    }
                });
                decorators.collectImports(node);
            },
            ClassDeclaration(node) {
                if (node.superClass?.type !== AST_NODE_TYPES.Identifier) return;

                const kind = classify(node, node.superClass.name);
                if (!kind.isSubscriber && !kind.isWebhook) return;
                if (node.abstract) {
                    trackAbstractBase(node, kind);
                    return;
                }

                if (!decorators.hasDecorator(node, SUBSCRIBE)) {
                    context.report({ node: node.id ?? node, messageId: 'missingSubscribe' });
                }
                if (kind.isWebhook && !decorators.hasDecorator(node, WEBHOOK_URL)) {
                    context.report({ node: node.id ?? node, messageId: 'missingWebhookUrl' });
                }
            }
        };
    }
});
