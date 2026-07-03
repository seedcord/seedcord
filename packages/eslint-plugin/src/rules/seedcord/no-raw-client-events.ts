import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';

import { createRule } from '../../createRule';
import { methodName } from '../../utils';

// client meta and lifecycle events, plus interactionCreate (routed through the interaction dispatcher). not
// gateway dispatch events, so a raw client.on for them is not flagged.
const NON_GATEWAY_EVENTS = new Set([
    'ready',
    'clientReady',
    'error',
    'warn',
    'debug',
    'cacheSweep',
    'invalidated',
    'shardReady',
    'shardDisconnect',
    'shardError',
    'shardReconnecting',
    'shardResume',
    'interactionCreate'
]);

export default createRule({
    name: 'no-raw-client-events',
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow handling a gateway event on the client directly instead of with @RegisterEvent.'
        },
        messages: {
            rawEvent:
                'Handle this gateway event with an @RegisterEvent handler. A raw client.on bypasses the event dispatcher and its middleware.'
        },
        schema: []
    },
    defaultOptions: [],
    create(context) {
        const services = ESLintUtils.getParserServices(context);

        return {
            CallExpression(node) {
                const method = methodName(node);
                if (method !== 'on' && method !== 'once') return;
                if (node.callee.type !== AST_NODE_TYPES.MemberExpression) return;

                const receiver = services.getTypeAtLocation(node.callee.object).getSymbol()?.getName();
                if (receiver !== 'Client') return;

                const eventArg = node.arguments[0];
                if (!eventArg || eventArg.type === AST_NODE_TYPES.SpreadElement) return;

                // a string literal and an Events enum member both resolve to the same string literal type
                const eventType = services.getTypeAtLocation(eventArg);
                if (!eventType.isStringLiteral() || NON_GATEWAY_EVENTS.has(eventType.value)) return;

                context.report({ node, messageId: 'rawEvent' });
            }
        };
    }
});
